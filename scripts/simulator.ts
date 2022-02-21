import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import inquirer from "inquirer";
import { ETHPool } from "../typechain";

const ethPoolActions = [
  { name: "Deposit", value: deposit },
  { name: "Distribute", value: distribute },
  { name: "Withdraw", value: withdraw },
  { name: "User Status", value: userStatus },
  { name: "Contract Status", value: contractStatus },
  { name: "Exit", value: exit },
];

async function main() {
  const ETHPool = await ethers.getContractFactory("ETHPool");
  const ethPoolContract = await ETHPool.deploy();
  await ethPoolContract.deployed();

  console.log("\nWelcome to the ETHPool simulator!\n");

  while (true) {
    const action = await chooseAction();
    await action(ethPoolContract);
    console.log("");
  }
}

async function deposit(ethPoolContract: ETHPool) {
  const user = await chooseUser();
  const amount = await askAmount();
  try {
    await ethPoolContract.connect(user).deposit({ value: amount });
    console.log(`Deposited ${ethers.utils.formatEther(amount)} ETH`);
  } catch (error: any) {
    console.error(
      "Transaction reverted with the following error:\n",
      getRevertMessage(error)
    );
  }
}

async function distribute(ethPoolContract: ETHPool) {
  const user = await chooseUser();
  const amount = await askAmount();
  try {
    await ethPoolContract.connect(user).distribute({ value: amount });
    console.log(`Distributed ${ethers.utils.formatEther(amount)} ETH`);
  } catch (error: any) {
    console.error(
      "Transaction reverted with the following error:\n",
      getRevertMessage(error)
    );
  }
}

async function withdraw(ethPoolContract: ETHPool) {
  const user = await chooseUser();
  try {
    const tx = await ethPoolContract.connect(user).withdraw();
    const receipt = await tx.wait();
    const event = receipt.events!.find((e) => e.event === "Withdraw");
    const [, amount] = event!.args!;
    console.log(`Withdrawed ${ethers.utils.formatEther(amount)} ETH`);
  } catch (error: any) {
    console.error(
      "Transaction reverted with the following error:\n",
      getRevertMessage(error)
    );
  }
}

async function userStatus(ethPoolContract: ETHPool) {
  const user = await chooseUser();
  const balance = await user.getBalance();
  const activeStake = await ethPoolContract
    .connect(user)
    .activeStakes(user.address);
  const currentReward = await ethPoolContract
    .connect(user)
    .getCurrentReward(user.address);
  console.log(
    `Balance: ${ethers.utils.formatEther(
      balance
    )} ETH - Active stake: ${ethers.utils.formatEther(
      activeStake
    )} ETH - Current reward: ${ethers.utils.formatEther(currentReward)} ETH`
  );
}

async function contractStatus(ethPoolContract: ETHPool) {
  const balance = await ethers.provider.getBalance(ethPoolContract.address);
  const totalActiveStakes = await ethPoolContract.totalActiveStakes();
  const distributionRate = await ethPoolContract.distributionRate();
  console.log(
    `Balance: ${ethers.utils.formatEther(
      balance
    )} ETH - Total active stakes: ${ethers.utils.formatEther(
      totalActiveStakes
    )} ETH - Distribution rate: ${distributionRate}`
  );
}

function exit() {
  /* eslint no-process-exit: 0 */
  process.exit(0);
}

async function chooseAction(): Promise<Function> {
  const answer = await inquirer.prompt({
    name: "action",
    type: "list",
    message: "Choose an action",
    choices: ethPoolActions,
  });

  return answer.action;
}

async function chooseUser(): Promise<SignerWithAddress> {
  const [teamMember, userA, userB] = await ethers.getSigners();

  const answer = await inquirer.prompt({
    name: "user",
    type: "list",
    message: "Choose a user",
    choices: [
      { name: "User A", value: userA },
      { name: "User B", value: userB },
      { name: "Team Member", value: teamMember },
    ],
  });

  return answer.user;
}

async function askAmount(): Promise<BigNumber> {
  const answer = await inquirer.prompt({
    name: "amount",
    type: "input",
    message: "Enter an amount (ETH)",
    validate: (input: string) => {
      const num = Number(input);

      return Number.isFinite(num) && num > 0
        ? true
        : "Amount must be a number greater than 0";
    },
  });

  return ethers.utils.parseEther(answer.amount.toString());
}

function getRevertMessage(error: any): string {
  const errorString = error.toString();
  const revertMessage = errorString.substring(
    errorString.indexOf("'") + 1,
    errorString.lastIndexOf("'")
  );
  return revertMessage;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
