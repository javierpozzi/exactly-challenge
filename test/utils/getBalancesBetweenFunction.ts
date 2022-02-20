import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction } from "ethers";

export async function getBalancesBetweenFunction(
  account: SignerWithAddress,
  promise: Promise<ContractTransaction>
) {
  const balanceBefore = await account.getBalance();
  const tx = await promise;
  const receipt = await tx.wait();
  const balanceAfter = await account.getBalance();
  const gasCost = receipt.effectiveGasPrice.mul(receipt.gasUsed);
  return [balanceBefore, balanceAfter, gasCost];
}
