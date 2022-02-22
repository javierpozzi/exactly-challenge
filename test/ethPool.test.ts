import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ETHPool } from "../typechain";

describe("ETHPool", function () {
  const adminRoleBytes = ethers.constants.HashZero;
  const teamRoleBytes = ethers.utils.id("TEAM_ROLE");

  let ethPoolContract: ETHPool;

  let deployer: SignerWithAddress;
  let teamMember: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  before(async () => {
    [deployer, teamMember, userA, userB] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const ETHPool = await ethers.getContractFactory("ETHPool");
    ethPoolContract = await ETHPool.deploy();
    await ethPoolContract.grantRole(teamRoleBytes, teamMember.address);
  });

  describe("Constructor", function () {
    it("Should be assigned the admin role to deployer of the contract", async function () {
      await ethPoolContract.hasRole(adminRoleBytes, deployer.address);
    });

    it("Should be assigned the team role to deployer of the contract", async function () {
      await ethPoolContract.hasRole(teamRoleBytes, deployer.address);
    });
  });

  describe("Receive", function () {
    it("Should execute a deposit", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await expect(
        userA.sendTransaction({
          to: ethPoolContract.address,
          value: depositAmount,
        })
      )
        .to.emit(ethPoolContract, "Deposit")
        .withArgs(userA.address, depositAmount);
    });
  });

  describe("Deposit", function () {
    it("Should add the active stake of the user by the amount sended", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      const userStake = await ethPoolContract.activeStakes(userA.address);

      expect(userStake).to.be.equal(depositAmount);
    });

    it("Should make consecutive deposits", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      const userStake = await ethPoolContract.activeStakes(userA.address);

      expect(userStake).to.be.equal(depositAmount.mul(2));
    });

    it("Should make deposit after distribution without adding to the reward", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract.connect(userB).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const currentRewardBefore = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });

      const currentRewardAfter = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentRewardAfter).to.be.equal(currentRewardBefore);
      expect(currentRewardAfter).to.be.equal(distributeAmount.div(2));
    });

    it("Should increase total active stakes by the amount sended", async function () {
      const depositAmountA = ethers.utils.parseEther("100");
      const depositAmountB = ethers.utils.parseEther("200");

      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });

      const totalActiveStakesBefore = await ethPoolContract.totalActiveStakes();
      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
      const totalActiveStakesAfter = await ethPoolContract.totalActiveStakes();

      expect(totalActiveStakesAfter).to.be.equal(
        totalActiveStakesBefore.add(depositAmountB)
      );
    });

    it("Should add to discount reward based on distribution rate and the deposit amount", async function () {
      const decimalFactor = BigNumber.from(10).pow(18);
      const depositAmountA = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");
      const depositAmountB = ethers.utils.parseEther("200");

      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const discountRewardBefore = await ethPoolContract.discountRewards(
        userB.address
      );

      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });

      const discountRewardAfterFirstDeposit =
        await ethPoolContract.discountRewards(userB.address);

      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });

      const discountRewardAfterSecondDeposit =
        await ethPoolContract.discountRewards(userB.address);

      const distributionRate = await ethPoolContract.distributionRate();

      expect(discountRewardBefore).to.be.equal(ethers.constants.Zero);
      expect(discountRewardAfterFirstDeposit).to.be.equal(
        distributionRate.mul(depositAmountB).div(decimalFactor)
      );
      expect(discountRewardAfterSecondDeposit).to.be.equal(
        distributionRate
          .mul(depositAmountB)
          .div(decimalFactor)
          .add(discountRewardAfterFirstDeposit)
      );
    });

    it("Should increase contract balance", async function () {
      const depositAmountA = ethers.utils.parseEther("100");
      const depositAmountB = ethers.utils.parseEther("200");

      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });

      const contractBalanceBefore = await ethers.provider.getBalance(
        ethPoolContract.address
      );
      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
      const contractBalanceAfter = await ethers.provider.getBalance(
        ethPoolContract.address
      );

      expect(contractBalanceAfter).to.be.equal(
        contractBalanceBefore.add(depositAmountA)
      );
    });

    it("Should emit Deposit event", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await expect(
        ethPoolContract.connect(userA).deposit({ value: depositAmount })
      )
        .to.emit(ethPoolContract, "Deposit")
        .withArgs(userA.address, depositAmount);
    });

    it("Should revert if deposit value is 0", async function () {
      await expect(
        ethPoolContract.connect(userA).deposit({ value: 0 })
      ).to.be.revertedWith("Deposit must be greater than 0");
    });
  });

  describe("Distribute", function () {
    it("Should add distribution rate", async function () {
      const rateExponent = BigNumber.from(10).pow(18);
      const depositAmountA = ethers.utils.parseEther("100");
      const distributeAmount1 = ethers.utils.parseEther("50");
      const depositAmountB = ethers.utils.parseEther("200");
      const distributeAmount2 = ethers.utils.parseEther("80");

      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });

      const distributionRateBeforeDistribute =
        await ethPoolContract.distributionRate();

      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount1 });

      const distributionRateAfterFirstDistribute =
        await ethPoolContract.distributionRate();

      const totalActiveStakesAfterFirstDistribute =
        await ethPoolContract.totalActiveStakes();

      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });

      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount2 });

      const distributionRateAfterSecondDistribute =
        await ethPoolContract.distributionRate();

      const totalActiveStakesAfterSecondDistribute =
        await ethPoolContract.totalActiveStakes();

      expect(distributionRateBeforeDistribute).to.be.equal(
        ethers.constants.Zero
      );
      expect(distributionRateAfterFirstDistribute).to.be.equal(
        distributeAmount1
          .mul(rateExponent)
          .div(totalActiveStakesAfterFirstDistribute)
      );
      expect(distributionRateAfterSecondDistribute).to.be.equal(
        distributeAmount2
          .mul(rateExponent)
          .div(totalActiveStakesAfterSecondDistribute)
          .add(distributionRateAfterFirstDistribute)
      );
    });

    it("Should increase contract balance", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });

      const contractBalanceBefore = await ethers.provider.getBalance(
        ethPoolContract.address
      );

      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const contractBalanceAfter = await ethers.provider.getBalance(
        ethPoolContract.address
      );

      expect(contractBalanceAfter).to.be.equal(
        contractBalanceBefore.add(distributeAmount)
      );
    });

    it("Should emit Distribute event", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });

      await expect(
        ethPoolContract
          .connect(teamMember)
          .distribute({ value: distributeAmount })
      )
        .to.emit(ethPoolContract, "Distribute")
        .withArgs(teamMember.address, distributeAmount);
    });

    it("Should revert if there is no active stakers", async function () {
      await expect(
        ethPoolContract.connect(teamMember).distribute()
      ).to.be.revertedWith("No active stakers to distribute");
    });

    it("Should revert if user don't have team role", async function () {
      await expect(
        ethPoolContract.connect(userA).distribute()
      ).to.be.revertedWith(
        `AccessControl: account ${userA.address.toLowerCase()} is missing role ${teamRoleBytes}`
      );
    });
  });

  describe("Withdraw", function () {
    it("Should decrease total active stakes by the active stake of the the withdrawal user", async function () {
      const depositAmountA = ethers.utils.parseEther("100");
      const depositAmountB = ethers.utils.parseEther("300");
      const distributeAmount = ethers.utils.parseEther("200");

      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const totalActiveStakesBefore = await ethPoolContract.totalActiveStakes();
      await ethPoolContract.connect(userA).withdraw();
      const totalActiveStakesAfter = await ethPoolContract.totalActiveStakes();

      expect(totalActiveStakesAfter).to.be.equal(
        totalActiveStakesBefore.sub(depositAmountA)
      );
    });

    it("Should set to 0 the active stake of the withdrawal user", async function () {
      const depositAmountA = ethers.utils.parseEther("100");
      const depositAmountB = ethers.utils.parseEther("300");
      const distributeAmount = ethers.utils.parseEther("200");

      await ethPoolContract.connect(userA).deposit({ value: depositAmountA });
      await ethPoolContract.connect(userB).deposit({ value: depositAmountB });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });
      await ethPoolContract.connect(userA).withdraw();

      const activeStake = await ethPoolContract.activeStakes(userA.address);

      expect(activeStake).to.be.equal(ethers.constants.Zero);
    });

    it("Should send the deposit and the reward to the withdrawal user", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const balanceBefore = await userA.getBalance();
      const tx = await ethPoolContract.connect(userA).withdraw();
      const receipt = await tx.wait();

      const balanceAfter = await userA.getBalance();
      const gasCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);

      expect(balanceAfter.add(gasCost)).to.be.equal(
        balanceBefore.add(depositAmount).add(distributeAmount)
      );
    });

    it("Should decrease contract balance", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract.connect(userB).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const contractBalanceBefore = await ethers.provider.getBalance(
        ethPoolContract.address
      );

      await ethPoolContract.connect(userA).withdraw();

      const contractBalanceAfter = await ethers.provider.getBalance(
        ethPoolContract.address
      );

      expect(contractBalanceAfter).to.be.equal(
        contractBalanceBefore.sub(depositAmount).sub(distributeAmount.div(2))
      );
    });

    it("Should emit Withdraw event", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });

      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      await expect(ethPoolContract.connect(userA).withdraw())
        .to.emit(ethPoolContract, "Withdraw")
        .withArgs(userA.address, depositAmount.add(distributeAmount));
    });

    it("Should revert if user don't have active stake", async function () {
      await expect(
        ethPoolContract.connect(userA).withdraw()
      ).to.be.revertedWith("No active stake to withdraw");
    });
  });

  describe("Get current reward", function () {
    it("Should get the current reward", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract.connect(userB).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const currentReward = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentReward).to.be.equals(distributeAmount.div(2));
    });

    it("Should get 0 if there is no active stake", async function () {
      const currentReward = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentReward).to.be.equals(0);
    });

    it("Should get 0 if there is no current reward", async function () {
      const depositAmount = ethers.utils.parseEther("100");

      await ethPoolContract.connect(userA).deposit({ value: depositAmount });
      await ethPoolContract.connect(userB).deposit({ value: depositAmount });

      const currentReward = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentReward).to.be.equals(0);
    });

    it("Should get 0 if there is no active stake and distributionRate > 0", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userB).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });

      const currentReward = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentReward).to.be.equals(0);
    });

    it("Should get 0 if there is no current reward and distributionRate > 0", async function () {
      const depositAmount = ethers.utils.parseEther("100");
      const distributeAmount = ethers.utils.parseEther("50");

      await ethPoolContract.connect(userB).deposit({ value: depositAmount });
      await ethPoolContract
        .connect(teamMember)
        .distribute({ value: distributeAmount });
      await ethPoolContract.connect(userA).deposit({ value: depositAmount });

      const currentReward = await ethPoolContract
        .connect(userA)
        .getCurrentReward(userA.address);

      expect(currentReward).to.be.equals(0);
    });
  });
});
