describe("Array", function () {
  it("should return -1 when the value is not present", function () {
    expect([1, 2, 3].indexOf(4)).to.equal(-1);
  });

  it("should return the index when the value is present", function () {
    expect([1, 2, 3].indexOf(2)).to.equal(1);
  });
});
