import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";

export default function shouldBehaveLikeListBond(): void {
  describe("when the contract to be listed is compliant", function () {
    it("lists the new bond", async function () {
      await this.fintroller._listBond(this.yToken.address);
    });
  });

  describe("when the contract to be listed is non-compliant", function () {
    it("rejects", async function () {
      await expect(this.fintroller._listBond(AddressZero)).to.be.reverted;
    });
  });
}