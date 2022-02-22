import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ETHPool } from "../typechain";
import { getBalancesBetweenFunction } from "./utils";

describe("Scenarios", function () {
  let ethPoolContract: ETHPool;

  let teamMember: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  before(async () => {
    [teamMember, userA, userB] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const ETHPool = await ethers.getContractFactory("ETHPool");
    ethPoolContract = await ETHPool.deploy();
  });

  it("A deposits 100, B deposits 300, T distributes 200, A withdraws 150, B withdraws 450", async function () {
    const depositAmountA = ethers.utils.parseEther("100");
    const depositAmountB = ethers.utils.parseEther("300");
    const distributeAmount = ethers.utils.parseEther("200");
    const withdrawAmountA = ethers.utils.parseEther("150");
    const withdrawAmountB = ethers.utils.parseEther("450");

    await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
    await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount });

    const [balanceABefore, balanceAAfter, gasCostA] =
      await getBalancesBetweenFunction(
        userA,
        ethPoolContract.connect(userA).withdraw()
      );

    const [balanceBBefore, balanceBAfter, gasCostB] =
      await getBalancesBetweenFunction(
        userB,
        ethPoolContract.connect(userB).withdraw()
      );

    const contractBalance = await ethers.provider.getBalance(
      ethPoolContract.address
    );

    expect(balanceAAfter.add(gasCostA)).to.be.equal(
      balanceABefore.add(withdrawAmountA)
    );
    expect(balanceBAfter.add(gasCostB)).to.be.equal(
      balanceBBefore.add(withdrawAmountB)
    );
    expect(contractBalance).to.be.equal(ethers.constants.Zero);
  });

  it("A deposits 200, B deposits 400, T distributes 100, T distributes 300, A withdraws 333.333, B withdraws 666.666", async function () {
    const depositAmountA = ethers.utils.parseEther("200");
    const depositAmountB = ethers.utils.parseEther("400");
    const distributeAmount1 = ethers.utils.parseEther("100");
    const distributeAmount2 = ethers.utils.parseEther("300");
    const withdrawAmountA = ethers.utils.parseEther("333.33333333");
    const withdrawAmountB = ethers.utils.parseEther("666.66666666");

    await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
    await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount1 });
    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount2 });

    const [balanceABefore, balanceAAfter, gasCostA] =
      await getBalancesBetweenFunction(
        userA,
        ethPoolContract.connect(userA).withdraw()
      );

    const [balanceBBefore, balanceBAfter, gasCostB] =
      await getBalancesBetweenFunction(
        userB,
        ethPoolContract.connect(userB).withdraw()
      );

    const contractBalance = await ethers.provider.getBalance(
      ethPoolContract.address
    );

    expect(balanceAAfter.add(gasCostA)).to.be.closeTo(
      balanceABefore.add(withdrawAmountA),
      1e10
    );
    expect(balanceBAfter.add(gasCostB)).to.be.closeTo(
      balanceBBefore.add(withdrawAmountB),
      1e10
    );
    expect(contractBalance).to.be.closeTo(ethers.constants.Zero, 1e5);
  });

  it("A deposits 200, B deposits 800, T distributes 200, A withdraws 240, T distributes 300, A deposits 100, B withdraws 1260, A withdraws 100", async function () {
    const depositAmountA1 = ethers.utils.parseEther("200");
    const depositAmountB = ethers.utils.parseEther("800");
    const distributeAmount1 = ethers.utils.parseEther("200");
    const withdrawAmountA1 = ethers.utils.parseEther("240");
    const distributeAmount2 = ethers.utils.parseEther("300");
    const depositAmountA2 = ethers.utils.parseEther("100");
    const withdrawAmountB = ethers.utils.parseEther("1260");
    const withdrawAmountA2 = ethers.utils.parseEther("100");

    await ethPoolContract.connect(userA).deposit({ value: depositAmountA1 });
    await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount1 });

    const [balanceA1Before, balanceA1After, gasCostA1] =
      await getBalancesBetweenFunction(
        userA,
        ethPoolContract.connect(userA).withdraw()
      );

    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount2 });

    await ethPoolContract.connect(userA).deposit({ value: depositAmountA2 });

    const [balanceBBefore, balanceBAfter, gasCostB] =
      await getBalancesBetweenFunction(
        userB,
        ethPoolContract.connect(userB).withdraw()
      );

    const [balanceA2Before, balanceA2After, gasCostA2] =
      await getBalancesBetweenFunction(
        userA,
        ethPoolContract.connect(userA).withdraw()
      );

    const contractBalance = await ethers.provider.getBalance(
      ethPoolContract.address
    );

    expect(balanceA1After.add(gasCostA1)).to.be.equal(
      balanceA1Before.add(withdrawAmountA1)
    );
    expect(balanceBAfter.add(gasCostB)).to.be.equal(
      balanceBBefore.add(withdrawAmountB)
    );
    expect(balanceA2After.add(gasCostA2)).to.be.equal(
      balanceA2Before.add(withdrawAmountA2)
    );
    expect(contractBalance).to.be.equal(ethers.constants.Zero);
  });

  it("A deposits 100, A deposits 100, B deposits 100, T distributes 100, A withdraws 266.666, B withdraws 133.333", async function () {
    const depositAmountA = ethers.utils.parseEther("100");
    const depositAmountB = ethers.utils.parseEther("100");
    const distributeAmount = ethers.utils.parseEther("100");
    const withdrawAmountA = ethers.utils.parseEther("266.66666666");
    const withdrawAmountB = ethers.utils.parseEther("133.33333333");

    await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
    await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
    await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
    await ethPoolContract
      .connect(teamMember)
      .distribute({ value: distributeAmount });

    const [balanceABefore, balanceAAfter, gasCostA] =
      await getBalancesBetweenFunction(
        userA,
        ethPoolContract.connect(userA).withdraw()
      );

    const [balanceBBefore, balanceBAfter, gasCostB] =
      await getBalancesBetweenFunction(
        userB,
        ethPoolContract.connect(userB).withdraw()
      );

    const contractBalance = await ethers.provider.getBalance(
      ethPoolContract.address
    );

    expect(balanceAAfter.add(gasCostA)).to.be.closeTo(
      balanceABefore.add(withdrawAmountA),
      1e10
    );
    expect(balanceBAfter.add(gasCostB)).to.be.closeTo(
      balanceBBefore.add(withdrawAmountB),
      1e10
    );
    expect(contractBalance).to.be.closeTo(ethers.constants.Zero, 1e5);
  });
});
