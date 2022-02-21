# Exactly Finance - Smart Contract Challenge

## Summary

This is a solution to the [Exactly Finance Smart Contract Challenge](/CHALLENGE.md), using a scalable reward distribution system.

The ETHPool works in a pull based distribution for the rewards, where the team member just send the distribution value to the contract, and the users are the ones that have to pull their rewards. This avoids high computational costs and allows a highly scalable solution with O(1) time complexity.

This is achieved by calculating a distribution rate based on the distribution value and the users active stakes. This rate allows calculating the reward for each user, based on their active stakes and the moment they deposited, without the need to store a registry of distribution values. When making a deposit, the user stores a snapshot of the distribution rate, for calculating in future withdrawing.

## Assumptions

The following assumptions were made for this solution:
 - The deployer of the contract is a team member and also an admin, who can grant the team member role to any other user.
 - The team members are responsible to deposit the rewards weekly. This contract gives them the liberty to make the deposits on any timely basis. If needed, an implementation could be done storing the timestamp of the last distribution, and comparing the diff with the `block.timestamp` of a new distribution.
 - Team members are allowed to make deposits.
 - Users can't make two consecutive deposits without withdrawing first.

## Getting started

To run the project, pull the repository and install its dependencies:

```bash
git clone https://github.com/javierpozzi/exactly-challenge.git
cd exactly-challenge
npm install
```

Rename file `.env.example` to `.env` on the root of the project.

Set the `ROPSTEN_URL` to your provider, like [Alchemy](https://www.alchemy.com/).

The value of the `ROPSTEN_CONTRACT_ADDRESS` variable is the address of a deployed ETHPool on the ropsten network ([Check the verified contract in Etherscan](https://ropsten.etherscan.io/address/0x6e9B6d2A90dFE12b9f650E8D5210115eE465b3f2#code)).

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

- **Deposit**: Deposit ETH to the pool, creating an active stake for the selected user and setting a distribution rate snapshot for future withdrawing.
- **Distribute**: Distribute a reward to the pool. Only team members are allowed to execute this action.
- **Withdraw**: Withdraw the selected user's active stake plus the reward from the pool, and send the ETH to the user.
- **User Status**: Get the current status of the selected user (balance, active stake and current reward).
- **Contract Status**: Get the current status of the contract (balance, total active stakes and distribution rate).

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
