// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ETHPool
 *
 * @dev This contract provides a service where users can deposit ETH and
 * receive rewards.
 *
 * Rewards are distributed by team members to the pool, not directly to users.
 * Users can withdraw their deposits and rewards at any time.
 *
 * It uses a pull based system for the rewards, avoiding high computational costs,
 * allowing a highly scalable solution.
 */
contract ETHPool is AccessControl {
    bytes32 public constant TEAM_ROLE = keccak256("TEAM_ROLE");

    uint256 public totalActiveStakes;
    uint256 public distributionRate;
    mapping(address => uint256) public activeStakes;
    mapping(address => uint256) public discountRewards;

    event Deposit(address indexed user, uint256 amount);
    event Distribute(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TEAM_ROLE, msg.sender);
    }

    receive() external payable {
        deposit();
    }

    /**
     * @dev Distribute the rewards to the pool.
     *
     * It calculates a distribution rate based on the distribution value and
     * the users active stakes. This rate allows calculating the reward for each user,
     * based on their active stakes and the discount reward, without the need to store
     * a registry of distribution values.
     *
     * The distribution rate uses a 1e18 exponent to avoid rounding errors.
     *
     * Only accessible by team members.
     *
     * msg.value must be greater than 0.
     */
    function distribute() external payable onlyRole(TEAM_ROLE) {
        require(totalActiveStakes > 0, "No active stakers to distribute");
        distributionRate += (msg.value * 1e18) / totalActiveStakes;
        emit Distribute(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw the user's active stake plus the reward from the pool,
     * and send the ETH to the user.
     *
     * The user must have an active stake to withdraw successfully.
     */
    function withdraw() external {
        uint256 activeStake = activeStakes[msg.sender];
        require(activeStake > 0, "No active stake to withdraw");
        uint256 reward = getCurrentReward(msg.sender);
        totalActiveStakes -= activeStake;
        discountRewards[msg.sender] = 0;
        activeStakes[msg.sender] = 0;
        uint256 totalWithdrawn = activeStake + reward;
        emit Withdraw(msg.sender, totalWithdrawn);
        (bool success, ) = msg.sender.call{value: totalWithdrawn}("");
        require(success, "Withdraw failed");
    }

    /**
     * @dev Deposit ETH to the pool, setting the active stake, the
     * the discount reward and the total active stakes.
     *
     * msg.value must be greater than 0.
     */
    function deposit() public payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        activeStakes[msg.sender] += msg.value;
        discountRewards[msg.sender] += (distributionRate * msg.value) / 1e18;
        totalActiveStakes += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Returns the current reward value for the user.
     *
     * This is calculated based on the distribution rate, multiplied by the
     * active stake (deposits) of the user, minus the discount reward.
     *
     * @param user The user whose current reward is calculated.
     */
    function getCurrentReward(address user) public view returns (uint256) {
        return
            ((distributionRate * activeStakes[user]) / 1e18) -
            discountRewards[user];
    }
}
