import { Signer } from "@ethersproject/abstract-signer";

import { ChainlinkOperator } from "../../typechain/ChainlinkOperator";
import { DummyPriceFeed } from "../../typechain";
import { Erc20Mintable } from "../../typechain/Erc20Mintable";
import { Fintroller } from "../../typechain/Fintroller";
import { GodModeBalanceSheet } from "../../typechain/GodModeBalanceSheet";
import { GodModeFyToken } from "../../typechain/GodModeFyToken";
import { GodModeRedemptionPool } from "../../typechain/GodModeRedemptionPool";
import {
  deployChainlinkOperator,
  deployCollateral,
  deployCollateralPriceFeed,
  deployFintroller,
  deployGodModeBalanceSheet,
  deployGodModeFyToken,
  deployGodModeRedemptionPool,
  deployUnderlying,
  deployUnderlyingPriceFeed,
} from "../deployers";
import { fyTokenConstants } from "../../helpers/constants";

type IntegrationFixtureReturnType = {
  balanceSheet: GodModeBalanceSheet;
  collateral: Erc20Mintable;
  collateralPriceFeed: DummyPriceFeed;
  fintroller: Fintroller;
  fyToken: GodModeFyToken;
  oracle: ChainlinkOperator;
  redemptionPool: GodModeRedemptionPool;
  underlying: Erc20Mintable;
  underlyingPriceFeed: DummyPriceFeed;
};

export async function integrationFixture(signers: Signer[]): Promise<IntegrationFixtureReturnType> {
  const deployer: Signer = signers[0];

  const collateral: Erc20Mintable = await deployCollateral(deployer);
  const underlying: Erc20Mintable = await deployUnderlying(deployer);

  const collateralPriceFeed: DummyPriceFeed = await deployCollateralPriceFeed(deployer);
  const underlyingPriceFeed: DummyPriceFeed = await deployUnderlyingPriceFeed(deployer);
  const oracle: ChainlinkOperator = await deployChainlinkOperator(deployer);
  await oracle.setFeed(collateral.address, collateralPriceFeed.address);
  await oracle.setFeed(underlying.address, underlyingPriceFeed.address);

  const fintroller: Fintroller = await deployFintroller(deployer);
  await fintroller.connect(deployer).setOracle(oracle.address);

  const balanceSheet: GodModeBalanceSheet = await deployGodModeBalanceSheet(deployer, fintroller.address);

  /* Override the RedemptionPool.sol contract created by the fyToken with GodModeRedemptionPool.sol */
  const fyToken: GodModeFyToken = await deployGodModeFyToken(
    deployer,
    fyTokenConstants.expirationTime,
    fintroller.address,
    balanceSheet.address,
    underlying.address,
    collateral.address,
  );

  const redemptionPool: GodModeRedemptionPool = await deployGodModeRedemptionPool(
    deployer,
    fintroller.address,
    fyToken.address,
  );
  await fyToken.__godMode__setRedemptionPool(redemptionPool.address);

  return {
    balanceSheet,
    collateral,
    collateralPriceFeed,
    fintroller,
    fyToken,
    oracle,
    redemptionPool,
    underlying,
    underlyingPriceFeed,
  };
}
