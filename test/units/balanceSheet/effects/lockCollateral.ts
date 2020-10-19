import { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { expect } from "chai";

import { BalanceSheetErrors, GenericErrors } from "../../../../helpers/errors";
import { TokenAmounts } from "../../../../helpers/constants";
import { Vault } from "../../../../@types";

export default function shouldBehaveLikeLockCollateral(): void {
  const depositCollateralAmount: BigNumber = TokenAmounts.Ten;

  describe("when the vault is open", function () {
    beforeEach(async function () {
      await this.contracts.balanceSheet.connect(this.signers.borrower).openVault(this.stubs.yToken.address);
    });

    describe("when the collateral amount to lock is not zero", function () {
      describe("when the caller deposited collateral", function () {
        beforeEach(async function () {
          await this.stubs.fintroller.mock.getDepositCollateralAllowed
            .withArgs(this.stubs.yToken.address)
            .returns(true);
          await this.stubs.collateral.mock.transferFrom
            .withArgs(this.accounts.borrower, this.contracts.balanceSheet.address, depositCollateralAmount)
            .returns(true);
          await this.contracts.balanceSheet
            .connect(this.signers.borrower)
            .depositCollateral(this.stubs.yToken.address, depositCollateralAmount);
        });

        it("it locks the collateral", async function () {
          const oldVault: Vault = await this.contracts.balanceSheet.getVault(
            this.stubs.yToken.address,
            this.accounts.borrower,
          );
          await this.contracts.balanceSheet
            .connect(this.signers.borrower)
            .lockCollateral(this.stubs.yToken.address, depositCollateralAmount);
          const newVault: Vault = await this.contracts.balanceSheet.getVault(
            this.stubs.yToken.address,
            this.accounts.borrower,
          );

          expect(oldVault.freeCollateral).to.equal(newVault.freeCollateral.add(depositCollateralAmount));
          expect(oldVault.lockedCollateral).to.equal(newVault.lockedCollateral.sub(depositCollateralAmount));
        });

        it("emits a LockCollateral event", async function () {
          await expect(
            this.contracts.balanceSheet
              .connect(this.signers.borrower)
              .lockCollateral(this.stubs.yToken.address, depositCollateralAmount),
          )
            .to.emit(this.contracts.balanceSheet, "LockCollateral")
            .withArgs(this.stubs.yToken.address, this.accounts.borrower, depositCollateralAmount);
        });
      });

      describe("when the caller did not deposit any collateral", function () {
        it("reverts", async function () {
          await expect(
            this.contracts.balanceSheet
              .connect(this.signers.borrower)
              .lockCollateral(this.stubs.yToken.address, depositCollateralAmount),
          ).to.be.revertedWith(BalanceSheetErrors.LockCollateralInsufficientFreeCollateral);
        });
      });
    });

    describe("when the collateral amount to lock is zero", function () {
      it("reverts", async function () {
        await expect(
          this.contracts.balanceSheet.connect(this.signers.borrower).lockCollateral(this.stubs.yToken.address, Zero),
        ).to.be.revertedWith(BalanceSheetErrors.LockCollateralZero);
      });
    });
  });

  describe("when the vault is not open", function () {
    it("reverts", async function () {
      await expect(
        this.contracts.balanceSheet
          .connect(this.signers.borrower)
          .lockCollateral(this.stubs.yToken.address, depositCollateralAmount),
      ).to.be.revertedWith(GenericErrors.VaultNotOpen);
    });
  });
}
