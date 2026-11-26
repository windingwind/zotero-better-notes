import { getAddon } from "../utils/global";
import { getTempDirectory } from "../utils/io";

describe("Export - BibTeX (#1637)", function () {
  this.timeout(30000);

  const addon = getAddon();
  const { AddonManager } = ChromeUtils.importESModule(
    "resource://gre/modules/AddonManager.sys.mjs",
  );
  const bbtID = "better-bibtex@iris-advies.com";
  const endpointPath = "/better-bibtex/json-rpc";
  const bibContent = "@article{regression1637,\n  title = {Regression}\n}\n";
  const originalPicker = addon.data.ztoolkit.FilePicker.prototype.open;
  const originalEndpoint = Zotero.Server.Endpoints[endpointPath];
  const originalSilent = addon.data.hint.silent;

  let bbt: Awaited<ReturnType<typeof AddonManager.getAddonByID>>;
  let requests: Array<{ headers: Record<string, string>; data: any }>;
  let response: unknown;
  let status: number;
  let pickerCalls: number;
  let item: Zotero.Item;
  let note: Zotero.Item;
  let texPath: string;
  let bibPath: string;

  this.beforeAll(async function () {
    expect(
      await AddonManager.getAddonByID(bbtID),
      "Run this suite in the scaffold's isolated profile without Better BibTeX",
    ).to.equal(null);
  });

  this.beforeEach(async function () {
    requests = [];
    response = { jsonrpc: "2.0", result: bibContent, id: null };
    status = 200;
    pickerCalls = 0;
    addon.data.hint.silent = true;

    // Use the real HTTP server so its browser-request protection is exercised.
    Zotero.Server.Endpoints[endpointPath] = class {
      supportedMethods = ["POST"];
      supportedDataTypes = ["application/json"];

      async init(request: (typeof requests)[number]) {
        requests.push(request);
        return [status, "application/json", JSON.stringify(response)];
      }
    } as any;

    const dir = await getTempDirectory();
    texPath = PathUtils.join(dir, "note.tex");
    bibPath = PathUtils.join(dir, "references.bib");
    addon.data.ztoolkit.FilePicker.prototype.open = async () => {
      pickerCalls++;
      return bibPath;
    };

    item = new Zotero.Item("journalArticle");
    item.setField("title", "Regression");
    item.setField("citationKey", "regression1637");
    await item.saveTx();

    const citation = encodeURIComponent(
      JSON.stringify({
        citationItems: [{ uris: [Zotero.URI.getItemURI(item)] }],
        properties: {},
      }),
    );
    note = new Zotero.Item("note");
    note.setNote(
      `<div data-schema-version="9"><p><span class="citation" data-citation="${citation}">(Regression)</span></p></div>`,
    );
    await note.saveTx();
    await installBBT("Better BibTeX for Zotero");
  });

  this.afterEach(async function () {
    if (bbt) await bbt.uninstall();
    bbt = null;
    addon.data.ztoolkit.FilePicker.prototype.open = originalPicker;
    addon.data.hint.silent = originalSilent;
    if (originalEndpoint) {
      Zotero.Server.Endpoints[endpointPath] = originalEndpoint;
    } else {
      delete Zotero.Server.Endpoints[endpointPath];
    }
    if (note?.id) await Zotero.Items.erase(note.id);
    if (item?.id) await Zotero.Items.erase(item.id);
  });

  async function installBBT(name: string) {
    if (bbt) await bbt.uninstall();
    const dir = await getTempDirectory();
    await IOUtils.writeJSON(PathUtils.join(dir, "manifest.json"), {
      manifest_version: 2,
      name,
      // Zotero blocks this plugin ID below 9.0, irrespective of its manifest.
      version: "9.0.77",
      applications: {
        zotero: {
          id: bbtID,
          update_url: "https://example.invalid/bibtex-test-updates.json",
          strict_min_version: "8.0",
          strict_max_version: "11.*",
        },
      },
    });
    await Zotero.File.putContentsAsync(
      PathUtils.join(dir, "bootstrap.js"),
      "function startup() {} function shutdown() {}",
    );
    bbt = await AddonManager.installTemporaryAddon(Zotero.File.pathToFile(dir));
  }

  async function expectTexOnly() {
    await addon.api.$export.saveLatex(texPath, note.id);
    expect(await Zotero.File.getContentsAsync(texPath)).to.include(
      "\\cite{regression1637}",
    );
    expect(await IOUtils.exists(bibPath)).to.equal(false);
    expect(pickerCalls).to.equal(0);
  }

  for (const name of ["Better BibTex for Zotero", "Better BibTeX for Zotero"]) {
    it(`exports real citations with the display name "${name}"`, async function () {
      await installBBT(name);
      await addon.api.$export.saveLatex(texPath, note.id);

      expect(await Zotero.File.getContentsAsync(texPath)).to.include(
        "\\cite{regression1637}",
      );
      expect(await Zotero.File.getContentsAsync(bibPath)).to.equal(bibContent);
      expect(pickerCalls).to.equal(1);
      expect(requests.length).to.equal(1);
      expect(requests[0].headers["zotero-allowed-request"]).to.equal("true");
      expect(requests[0].data.method).to.equal("item.export");
      expect(requests[0].data.params).to.deep.equal([
        ["regression1637"],
        "bibtex",
        item.libraryID,
      ]);
    });
  }

  it("keeps exporting TeX when Better BibTeX is missing", async function () {
    await bbt!.uninstall();
    bbt = null;
    await expectTexOnly();
    expect(requests.length).to.equal(0);
  });

  it("does not call a disabled Better BibTeX", async function () {
    await bbt!.disable();
    await expectTexOnly();
    expect(requests.length).to.equal(0);
  });

  it("does not write an HTTP failure into a bib file", async function () {
    status = 500;
    await expectTexOnly();
    expect(requests.length).to.equal(1);
  });

  it("does not write a JSON-RPC error into a bib file", async function () {
    response = {
      jsonrpc: "2.0",
      error: { code: -32602, message: "Citation key not found" },
      id: null,
    };
    await expectTexOnly();
    expect(requests.length).to.equal(1);
  });

  for (const result of [null, { result: [bibContent] }]) {
    it(`rejects an invalid response ${JSON.stringify(result)}`, async function () {
      response = result;
      await expectTexOnly();
      expect(requests.length).to.equal(1);
    });
  }

  it("does not request a bib file for an empty export result", async function () {
    response = { jsonrpc: "2.0", result: "", id: null };
    await expectTexOnly();
    expect(requests.length).to.equal(1);
  });

  it("does not require Better BibTeX for notes without citations", async function () {
    await bbt!.uninstall();
    bbt = null;
    note.setNote('<div data-schema-version="9"><p>No citations</p></div>');
    await note.saveTx();
    await addon.api.$export.saveLatex(texPath, note.id);
    expect(await Zotero.File.getContentsAsync(texPath)).to.include(
      "No citations",
    );
    expect(requests.length).to.equal(0);
    expect(pickerCalls).to.equal(0);
  });

  it("exports bibliography content for merged notes", async function () {
    await addon.api.$export.saveMergedLatex(texPath, [note.id]);
    expect(await Zotero.File.getContentsAsync(texPath)).to.include(
      "\\cite{regression1637}",
    );
    expect(await Zotero.File.getContentsAsync(bibPath)).to.include(bibContent);
    expect(pickerCalls).to.equal(1);
  });
});
