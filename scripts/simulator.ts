import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import inquirer from "inquirer";
import { ETHPool } from "../typechain";

const ethPoolActions = [
  { name: "Deposit", value: deposit },
  { name: "Distribute", value: distribute },
  { name: "Withdraw", value: withdraw },
  { name: "Contract Status", value: printContractStatus },
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
    await printUsersStatus(ethPoolContract);
  } catch (error: any) {
    console.error(
      "Transaction reverted with the following error:\n",
      getRevertMessage(error)
    );
  }
}

async function distribute(ethPoolContract: ETHPool) {
  const [teamMember] = await ethers.getSigners();
  const amount = await askAmount();
  try {
    await ethPoolContract.connect(teamMember).distribute({ value: amount });
    console.log(`Distributed ${ethers.utils.formatEther(amount)} ETH`);
    await printUsersStatus(ethPoolContract);
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
    await printUsersStatus(ethPoolContract);
  } catch (error: any) {
    console.error(
      "Transaction reverted with the following error:\n",
      getRevertMessage(error)
    );
  }
}

async function printContractStatus(ethPoolContract: ETHPool) {
  const balance = await ethers.provider.getBalance(ethPoolContract.address);
  const totalActiveStakes = await ethPoolContract.totalActiveStakes();
  const distributionRate = await ethPoolContract.distributionRate();
  console.table({
    balance: ethers.utils.formatEther(balance) + " ETH",
    totalActiveStakes: ethers.utils.formatEther(totalActiveStakes) + " ETH",
    distributionRate: distributionRate.toString(),
  });
}

function exit() {
  /* eslint no-process-exit: 0 */
  process.exit(0);
}

async function getUsers() {
  const [teamMember, userA, userB] = await ethers.getSigners();

  return [
    { name: "User A", value: userA },
    { name: "User B", value: userB },
    { name: "Team Member", value: teamMember },
  ];
}

async function printUsersStatus(ethPoolContract: ETHPool) {
  const users = await getUsers();
  const userStatus: any[] = [];

  for (const user of users) {
    const userSigner = user.value;
    const balance = await userSigner.getBalance();
    const activeStake = await ethPoolContract
      .connect(userSigner)
      .activeStakes(userSigner.address);
    const currentReward = await ethPoolContract
      .connect(userSigner)
      .getCurrentReward(userSigner.address);
    const discountReward = await ethPoolContract
      .connect(userSigner)
      .discountRewards(userSigner.address);
    userStatus.push({
      user: user.name,
      balance: ethers.utils.formatEther(balance) + " ETH",
      activeStake: ethers.utils.formatEther(activeStake) + " ETH",
      currentReward: ethers.utils.formatEther(currentReward) + " ETH",
      discountReward: ethers.utils.formatEther(discountReward) + " ETH",
    });
  }
  console.table(userStatus);
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
  const users = await getUsers();

  const answer = await inquirer.prompt({
    name: "user",
    type: "list",
    message: "Choose a user",
    choices: users,
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
