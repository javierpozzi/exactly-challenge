//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract ETHPool is AccessControl {
    bytes32 public constant TEAM_ROLE = keccak256("TEAM_ROLE");

    uint256 public totalActiveStakes;
    mapping(address => uint256) public activeStakes;
    uint256 public distributionRate;
    mapping(address => uint256) public distributionRateSnapshots;

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

    function distribute() external payable onlyRole(TEAM_ROLE) {
        require(totalActiveStakes > 0, "No active stakers to distribute");
        distributionRate += (msg.value * 1e18) / totalActiveStakes;
        emit Distribute(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 deposited = activeStakes[msg.sender];
        require(deposited > 0, "No active stake to withdraw");
        uint256 reward = (deposited *
            (distributionRate - distributionRateSnapshots[msg.sender])) / 1e18;
        totalActiveStakes -= deposited;
        activeStakes[msg.sender] = 0;
        uint256 totalWithdrawn = deposited + reward;
        emit Withdraw(msg.sender, totalWithdrawn);
        (bool success, ) = msg.sender.call{value: totalWithdrawn}("");
        require(success, "Withdraw failed");
    }

    function deposit() public payable {
        require(msg.value > 0, "Deposit must be greater than 0");
        require(
            activeStakes[msg.sender] == 0,
            "You already have an active stake"
        );
        activeStakes[msg.sender] = msg.value;
        distributionRateSnapshots[msg.sender] = distributionRate;
        totalActiveStakes += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
}
