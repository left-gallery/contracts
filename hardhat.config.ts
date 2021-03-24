import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";

import("./tasks").catch((e) => console.log("Cannot load tasks", e.toString()));

// TODO: reenable solidity-coverage when it works
// import "solidity-coverage";

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const RINKEBY_PRIVATE_KEY =
  process.env.RINKEBY_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key
const KOVAN_PRIVATE_KEY =
  process.env.KOVAN_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key
const MAINNET_PRIVATE_KEY =
  process.env.MAINNET_PRIVATE_KEY! ||
  "0xc87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"; // well known private key
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || "";

const GWEI = 1000000000;

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    compilers: [
      {
        version: "0.5.17",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    ],
  },
  networks: {
    hardhat: {},
    localhost: {},
    kovan: {
      url: `https://kovan.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [KOVAN_PRIVATE_KEY],
      gasMultiplier: 1.2,
      gasPrice: 10 * GWEI,
      loggingEnabled: true,
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [RINKEBY_PRIVATE_KEY],
      gasMultiplier: 1.2,
      gasPrice: 123 * GWEI,
      loggingEnabled: true,
    },
    mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [MAINNET_PRIVATE_KEY],
      gasMultiplier: 1.2,
      gasPrice: 150 * GWEI,
      loggingEnabled: true,
    },
    coverage: {
      url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    currency: "USD",
    coinmarketcap: COINMARKETCAP_KEY,
    gasPrice: 135,
  },
};

export default config;
