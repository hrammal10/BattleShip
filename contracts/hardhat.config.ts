import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    paths: {
        sources: "./src",
        artifacts: "./artifacts",
    },
    networks: {
        sepolia: {
            url: process.env.RPC_URL ?? "",
            accounts: process.env.OPERATOR_PRIVATE_KEY ? [process.env.OPERATOR_PRIVATE_KEY] : [],
        },
    },
};

export default config;
