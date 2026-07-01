import { config } from "../../package.json";
import { getAddon } from "../utils/global";
import { resetAll } from "../utils/status";
import { getTempDirectory } from "../utils/io";

const PREF_KEY = `${config.prefsPrefix}.sync.autoSyncLinkedNotes`;

/** Set the feature pref. The `true` flag matches the plugin's getPref/setPref,
 * which read/write this as a global (full-branch) pref. */
function setFeatureEnabled(enabled: boolean) {
  Zotero.Prefs.set(PREF_KEY, enabled, true);
}

describe("Sync - Auto-sync linked notes", function () {
  const addon = getAddon();
  // Building the link relation index goes through a throttled worker call, so
  // give each test enough room to poll for it.
  this.timeout(30000);

  const createdNoteIds = new Set<number>();

  this.beforeAll(async function () {
    await resetAll();
  });

  this.afterEach(async function () {
    // Always leave the feature disabled so setup of the next test (which saves
    // notes, firing modify events) does not auto-propagate sync.
    setFeatureEnabled(false);
    for (const id of createdNoteIds) {
      addon.api.sync.removeSyncNote(id);
    }
    createdNoteIds.clear();
    await resetAll();
  });

  /** Create a note with the given inner HTML and track it for cleanup. */
  async function createNote(innerHTML = "") {
    const note = new Zotero.Item("note");
    note.setNote(`<div data-schema-version="9">${innerHTML}</div>`);
    await note.saveTx();
    createdNoteIds.add(note.id);
    return note;
  }

  /** Inner HTML of a note link pointing at `target`. */
  function linkTo(target: Zotero.Item) {
    return `<p><a href="zotero://note/u/${target.key}/">link</a></p>`;
  }

  /** Mark `note` as already two-way synced to `dir` (no markdown written). */
  function markSynced(note: Zotero.Item, dir: string) {
    addon.api.sync.updateSyncStatus(note.id, {
      itemID: note.id,
      path: dir,
      filename: `${note.key}.md`,
      md5: "",
      noteMd5: Zotero.Utilities.Internal.md5(note.getNote(), false),
      lastsync: new Date().getTime(),
    });
    createdNoteIds.add(note.id);
  }

  /**
   * Rebuild the link relation index for `fromNote` and wait until `fromNote`'s
   * outbound relations include `toNote`. The rebuild is throttled, so we retry
   * until it lands.
   */
  async function ensureLink(fromNote: Zotero.Item, toNote: Zotero.Item) {
    const start = Date.now();
    let lastError: unknown;
    while (Date.now() - start < 20000) {
      try {
        await addon.api.relation.updateNoteLinkRelation(fromNote.id);
        await Zotero.Promise.delay(300);
        const outbound = await addon.api.relation.getNoteLinkOutboundRelation(
          fromNote.id,
        );
        if (outbound.some((link) => link.toKey === toNote.key)) {
          return;
        }
      } catch (e) {
        // `updateNoteLinkRelation` is throttled and shared process-wide, so a
        // transient failure from an unrelated call can surface here. Keep
        // polling instead of aborting, but remember the error so a *persistent*
        // failure is still reported below rather than silently swallowed.
        lastError = e;
        await Zotero.Promise.delay(300);
      }
    }
    throw new Error(
      `Link relation ${fromNote.key} -> ${toNote.key} was not built in time` +
        (lastError ? `; last error: ${lastError}` : ""),
    );
  }

  it("syncs an unsynced note that links to a synced note", async function () {
    const dir = await getTempDirectory();
    const synced = await createNote();
    const edited = await createNote(linkTo(synced));

    markSynced(synced, dir);
    await ensureLink(edited, synced);

    setFeatureEnabled(true);
    await addon.api.sync.syncLinkedNoteOnEdit(edited.id);

    expect(addon.api.sync.isSyncNote(edited.id)).to.be.true;
    expect(addon.api.sync.getSyncStatus(edited.id).path).to.equal(
      addon.api.sync.getSyncStatus(synced.id).path,
    );

    // The markdown file should have been written during the add.
    const status = addon.api.sync.getSyncStatus(edited.id);
    const filePath = PathUtils.join(status.path, status.filename);
    expect(await IOUtils.exists(filePath)).to.be.true;
  });

  it("syncs an unsynced note that is linked from a synced note", async function () {
    const dir = await getTempDirectory();
    const edited = await createNote();
    // The synced note links to the edited note (inbound link for `edited`).
    const synced = await createNote(linkTo(edited));

    markSynced(synced, dir);
    await ensureLink(synced, edited);

    setFeatureEnabled(true);
    await addon.api.sync.syncLinkedNoteOnEdit(edited.id);

    expect(addon.api.sync.isSyncNote(edited.id)).to.be.true;
    expect(addon.api.sync.getSyncStatus(edited.id).path).to.equal(
      addon.api.sync.getSyncStatus(synced.id).path,
    );
  });

  it("propagates sync from a synced note to its unsynced linked note", async function () {
    const dir = await getTempDirectory();
    const neighbor = await createNote();
    // The edited note is itself synced and links to an unsynced neighbor.
    const edited = await createNote(linkTo(neighbor));

    markSynced(edited, dir);
    await ensureLink(edited, neighbor);

    expect(addon.api.sync.isSyncNote(neighbor.id)).to.be.false;

    setFeatureEnabled(true);
    await addon.api.sync.syncLinkedNoteOnEdit(edited.id);

    expect(addon.api.sync.isSyncNote(neighbor.id)).to.be.true;
    expect(addon.api.sync.getSyncStatus(neighbor.id).path).to.equal(
      addon.api.sync.getSyncStatus(edited.id).path,
    );
  });

  it("does nothing when no linked note is synced", async function () {
    const synced = await createNote();
    const edited = await createNote(linkTo(synced));
    await ensureLink(edited, synced);

    setFeatureEnabled(true);
    await addon.api.sync.syncLinkedNoteOnEdit(edited.id);

    expect(addon.api.sync.isSyncNote(edited.id)).to.be.false;
    expect(addon.api.sync.isSyncNote(synced.id)).to.be.false;
  });

  it("does nothing when the preference is disabled", async function () {
    const dir = await getTempDirectory();
    const synced = await createNote();
    const edited = await createNote(linkTo(synced));

    markSynced(synced, dir);
    await ensureLink(edited, synced);

    setFeatureEnabled(false);
    await addon.api.sync.syncLinkedNoteOnEdit(edited.id);

    expect(addon.api.sync.isSyncNote(edited.id)).to.be.false;
  });

  it("prompts to choose a folder when synced neighbors are in different folders", async function () {
    const dir1 = await getTempDirectory();
    const dir2 = await getTempDirectory();
    const syncedA = await createNote();
    const syncedB = await createNote();
    // The edited note links to two synced notes living in different folders.
    const edited = await createNote(`${linkTo(syncedA)}${linkTo(syncedB)}`);

    markSynced(syncedA, dir1);
    markSynced(syncedB, dir2);
    await ensureLink(edited, syncedA);
    await ensureLink(edited, syncedB);

    const wantPath = addon.api.sync.getSyncStatus(syncedB.id).path;

    // Stub the folder-picker dialog to deterministically choose syncedB's
    // folder, then restore it afterwards. The whole prompt service is swapped
    // (overriding only `.select` on the XPCOM service does not take effect).
    const promptService = Services.prompt;
    let promptShown = false;
    // @ts-ignore - overriding for the test
    Services.prompt = {
      select: (
        _parent: any,
        _title: string,
        _text: string,
        folders: string[],
        selection: { value: number },
      ) => {
        promptShown = true;
        const idx = folders.indexOf(wantPath);
        selection.value = idx < 0 ? 0 : idx;
        return true;
      },
    };

    try {
      setFeatureEnabled(true);
      await addon.api.sync.syncLinkedNoteOnEdit(edited.id);
    } finally {
      // @ts-ignore - restore original
      Services.prompt = promptService;
    }

    expect(promptShown).to.be.true;
    expect(addon.api.sync.isSyncNote(edited.id)).to.be.true;
    expect(addon.api.sync.getSyncStatus(edited.id).path).to.equal(wantPath);
  });
});
