import { Erc20 } from "../typechain/Erc20";
import { GuarantorPool } from "../typechain/GuarantorPool";
import { YToken } from "../typechain/YToken";

export interface TypechainConfig {
  outDir?: string;
  target?: "ethers-v4" | "ethers-v5" | "truffle-v4" | "truffle-v5" | "web3-v1";
}

declare module "@nomiclabs/buidler/types" {
  interface BuidlerConfig {
    typechain?: TypechainConfig;
  }

  interface ProjectPaths {
    coverage: string;
    coverageJson: string;
    typechain: string;
  }
}
declare module "mocha" {
  export interface Context {
    collateral: Erc20;
    guarantorPool: GuarantorPool;
    underlying: Erc20;
    yToken: YToken;
  }
}
