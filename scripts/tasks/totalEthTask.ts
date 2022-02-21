import * as dotenv from "dotenv";
import { task } from "hardhat/config";

dotenv.config();

task("totalEth", "Get the total amount of ETH held in the contract.")
  .addParam(
    "contract",
    "The contract address.",
    process.env.ROPSTEN_CONTRACT_ADDRESS!
  )
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const { contract } = taskArgs;

    const network = await ethers.provider.getNetwork();

    console.log(
      `Getting ETH balance from ${contract} on network ${network.name}...`
    );

    const balance = await ethers.provider.getBalance(contract);

    const ethPoolContract = await ethers.getContractAt("ETHPool", contract);
    const totalActiveStakes = await ethPoolContract.totalActiveStakes();

    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(
      `Total active stakes: ${ethers.utils.formatEther(totalActiveStakes)} ETH`
    );
  });
