import { ethers } from "hardhat";

async function main() {
    const BattleShip = await ethers.getContractFactory("BattleShip");
    const contract = await BattleShip.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log("BattleShip deployed to:", address);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
