import { config } from "../../package.json";

describe("Startup", function () {
  it("should have plugin instance defined", function () {
    assert.isNotEmpty(Zotero[config.addonRef]);
  });
});
