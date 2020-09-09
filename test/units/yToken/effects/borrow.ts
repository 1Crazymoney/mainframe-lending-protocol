import { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { expect } from "chai";

import { BalanceSheetConstants, FintrollerConstants, YTokenConstants } from "../../../helpers/constants";
import { BalanceSheetErrors, YTokenErrors } from "../../../helpers/errors";
import { FintrollerErrors } from "../../../helpers/errors";
import { OneHundredTokens, TenTokens } from "../../../helpers/constants";
import { contextForTimeDependentTests } from "../../../helpers/mochaContexts";
import { increaseTime } from "../../../helpers/jsonRpcHelpers";
import { stubVaultFreeCollateral, stubVaultLockedCollateral } from "../../../helpers/stubs";

export default function shouldBehaveLikeBorrow(): void {
  describe("when the vault is open", function () {
    beforeEach(async function () {
      await this.stubs.balanceSheet.mock.getVault
        .withArgs(this.contracts.yToken.address, this.accounts.brad)
        .returns(...Object.values(BalanceSheetConstants.DefaultVault));
      await this.stubs.balanceSheet.mock.isVaultOpen
        .withArgs(this.contracts.yToken.address, this.accounts.brad)
        .returns(true);
    });

    describe("when the bond did not mature", function () {
      describe("when the amount to borrow is not zero", function () {
        describe("when the bond is listed", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.getBond
              .withArgs(this.contracts.yToken.address)
              .returns(FintrollerConstants.DefaultCollateralizationRatioMantissa);
          });

          describe("when the fintroller allows borrows", function () {
            beforeEach(async function () {
              await this.stubs.fintroller.mock.borrowAllowed.withArgs(this.contracts.yToken.address).returns(true);
            });

            /**
             * TODO: Write tests for the following scenarios:
             * - collateral value too small
             * - not enough liquidity in the guarantor pool
             */
            describe("when the caller deposited collateral", function () {
              describe("when the caller locked the collateral", function () {
                beforeEach(async function () {
                  /* Stub the value of the locked collateral. */
                  await stubVaultLockedCollateral.call(
                    this,
                    this.contracts.yToken.address,
                    this.accounts.brad,
                    TenTokens,
                  );

                  /* The yToken makes an internal call to this stubbed function. */
                  await this.stubs.balanceSheet.mock.setVaultDebt
                    .withArgs(this.contracts.yToken.address, this.accounts.brad, OneHundredTokens)
                    .returns(true);
                });

                it("borrows yTokens", async function () {
                  const oldBalance: BigNumber = await this.contracts.yToken.balanceOf(this.accounts.brad);
                  await this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens);
                  const newBalance: BigNumber = await this.contracts.yToken.balanceOf(this.accounts.brad);
                  expect(oldBalance).to.equal(newBalance.sub(OneHundredTokens));
                });

                it("emits a Borrow event", async function () {
                  await expect(this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens))
                    .to.emit(this.contracts.yToken, "Borrow")
                    .withArgs(this.accounts.brad, OneHundredTokens);
                });

                it("emits a Transfer event", async function () {
                  await expect(this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens))
                    .to.emit(this.contracts.yToken, "Transfer")
                    .withArgs(this.contracts.yToken.address, this.accounts.brad, OneHundredTokens);
                });
              });

              describe("when the caller did not lock the collateral", function () {
                beforeEach(async function () {
                  /* Stub the value of the free collateral. */
                  await stubVaultFreeCollateral.call(
                    this,
                    this.contracts.yToken.address,
                    this.accounts.brad,
                    TenTokens,
                  );
                });

                it("reverts", async function () {
                  await expect(
                    this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens),
                  ).to.be.revertedWith(BalanceSheetErrors.BelowThresholdCollateralizationRatio);
                });
              });
            });

            describe("when the caller did not deposit any collateral", function () {
              it("reverts", async function () {
                await expect(
                  this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens),
                ).to.be.revertedWith(BalanceSheetErrors.BelowThresholdCollateralizationRatio);
              });
            });
          });

          describe("when the fintroller does not allow borrows", function () {
            beforeEach(async function () {
              await this.stubs.fintroller.mock.borrowAllowed.withArgs(this.contracts.yToken.address).returns(false);
            });

            it("reverts", async function () {
              await expect(
                this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens),
              ).to.be.revertedWith(YTokenErrors.BorrowNotAllowed);
            });
          });
        });

        describe("when the bond is not listed", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.borrowAllowed
              .withArgs(this.contracts.yToken.address)
              .revertsWithReason(FintrollerErrors.BondNotListed);
          });

          it("reverts", async function () {
            await expect(this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens)).to.be.revertedWith(
              FintrollerErrors.BondNotListed,
            );
          });
        });
      });

      describe("when the amount to borrow is zero", function () {
        it("reverts", async function () {
          await expect(this.contracts.yToken.connect(this.signers.brad).borrow(Zero)).to.be.revertedWith(
            YTokenErrors.BorrowZero,
          );
        });
      });
    });

    contextForTimeDependentTests("when the bond matured", function () {
      beforeEach(async function () {
        await increaseTime(YTokenConstants.DefaultExpirationTime);
      });

      it("reverts", async function () {
        await expect(this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens)).to.be.revertedWith(
          YTokenErrors.BondMatured,
        );
      });
    });
  });

  describe("when the vault is not open", function () {
    beforeEach(async function () {
      await this.stubs.balanceSheet.mock.isVaultOpen
        .withArgs(this.contracts.yToken.address, this.accounts.brad)
        .returns(false);
    });

    it("reverts", async function () {
      await expect(this.contracts.yToken.connect(this.signers.brad).borrow(OneHundredTokens)).to.be.revertedWith(
        BalanceSheetErrors.VaultNotOpen,
      );
    });
  });
}