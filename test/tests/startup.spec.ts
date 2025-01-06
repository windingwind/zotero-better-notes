import { getAddon } from "../utils/global";

describe("Startup", function () {
  it("should have plugin instance defined", function () {
    assert.isNotEmpty(getAddon());
  });
});
