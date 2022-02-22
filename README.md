# Exactly Finance - Smart Contract Challenge

[Verified contract in Ropsten](https://ropsten.etherscan.io/address/0x1b725c5f6FbBB1B0f21CF796aBcE99e810a8A8e1#code)

## Summary

This is a solution to the [Exactly Finance Smart Contract Challenge](/CHALLENGE.md), using a scalable reward distribution system.

The ETHPool works in a pull based distribution for the rewards, where the team member just send the distribution value to the contract, and the users are the ones that have to pull their rewards. This avoids high computational costs and allows a highly scalable solution with O(1) time complexity.

This is achieved by:

- When distributing, calculating a distribution rate based on the distribution value and the users active stakes.
- When depositing, calculating the discount reward based on the deposit value and the distribution rate.

These allow to calculate the reward for each user based on their active stakes, without the need to store a registry of distribution values.

## Assumptions

The following assumptions were made for this solution:

- The deployer of the contract is a team member and admin, who can grant the team member role to any other user.
- The team members are responsible to deposit the rewards weekly. This contract gives them the liberty to make the deposits on any timely basis. If needed, an implementation could be done storing the timestamp of the last distribution, and comparing the diff with the `block.timestamp` of a new distribution.
- Team members are allowed to make deposits.

## Getting started

To run the project, pull the repository and install its dependencies:

```bash
git clone https://github.com/javierpozzi/exactly-challenge.git
cd exactly-challenge
npm install
```

Rename file `.env.example` to `.env` on the root of the project.

Set the `ROPSTEN_URL` to your provider, like [Alchemy](https://www.alchemy.com/).

The value of the `ROPSTEN_CONTRACT_ADDRESS` variable is the address of the deployed ETHPool on the ropsten network.

Run the tests to verify that the installation was successful:

```bash
npm test
```

## Usage

You can check the total amount of ETH in the contract deployed on ropsten with:

```bash
npx hardhat totalEth --network ropsten
```

Also, you can launch a local simulator of the ETHPool:

```bash
npx hardhat run scripts/simulator.ts
```

The simulator will be executed as a CLI, allowing you to make the following actions:

- **Deposit**: Deposit ETH to the pool, setting the active stake and the discount reward.
- **Distribute**: Distribute a reward to the pool. Only team members are allowed to execute this action.
- **Withdraw**: Withdraw the selected user's active stake plus the reward from the pool, and send the ETH to the user.
- **Contract Status**: Get the current status of the contract.

## Gas Report

If you want to check gas usage run:

```bash
npm run gas-report
```

## Credits

This software uses the following open source projects:

- [Solidity](https://github.com/ethereum/solidity/)
- [Node.js](https://nodejs.org/)
- [Hardhat](https://hardhat.org/)
- [ethers.js](https://github.com/ethers-io/ethers.js/)
- [OpenZeppelin Contracts](https://openzeppelin.com/contracts/)
