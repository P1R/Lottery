// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LotteryToken} from "./LotteryToken.sol";

contract Lottery is Ownable {
    /// @notice Address of the token used as payment for the bets
    LotteryToken public paymentToken;
    /// @notice Flag indicating if the lottery is open for bets
    bool public betsOpen;
    /// @notice Timestamp of the lottery next closing date
    uint256 public betsClosingTime;
    /// @notice Purchase Ratio per Eth
    uint256 public purchaseRatio;

    constructor(string memory tokenName, string memory tokenSymbol, uint256 _purchaseRatio) {
        paymentToken = new LotteryToken(tokenName, tokenSymbol);
        purchaseRatio = _purchaseRatio;
    }

    /// @notice Opens the lottery for receiving bets
    function openBets(uint256 closingTime) external onlyOwner whenBetsClosed {
        require(
            closingTime > block.timestamp,
            "Closing time must be in the future"
        );
            betsClosingTime = closingTime;
            betsOpen = true;
    }

    /// @notice Give tokens based on the amount of ETH Sent
    function purchaseTokens() public payable {
        paymentToken.mint(msg.sender, msg.value * purchaseRatio);
    }

    /// @notice Give tokens based on the amount of ETH Sent
    function returnTokens(uint256 amount) public {
        require(
            paymentToken.approve(address(this), amount)
        );
        paymentToken.burnFrom(msg.sender, amount);
        payable(msg.sender).transfer(amount / purchaseRatio);
    }

    /// @notice Charges the bet price and creates a new bet slot with the sender's address
    //function bet() public whenBetsOpen {
    //    TODO: charge bet price
    //    TODO: create new slot
    //}

    /// @notice Close the lottery and calculates the prize, if any
    /// @dev Anyone can call this function if the opwner fails to do so
    //function closeLottery() public {
    //    requre(block.timestamp >= betsClosingTime, "Too soon to close");
    //    requre(betsOpen, "Already Closed");
    //    TODO: check the winner
    //    if (_slot.length > 0) {
    //        uint256 winnerIndex = getRandomNumber() % _slots.length;
    //        address winner = _slots[winnerIndex];
    //        prize[winner] += prizePool;
    //        prizePool = 0;
    //        delete (_slots);
    //    }
    //    betsOpen = false;
    //}

    // @notice widraw `amount` from the accounts prize pool
    //function prizeWithdraw(uint256 amount) public {
    //    require(amount <= prize[msg.sender], "not enough prize")
    //    prize[msg.sender] -= amount;
    //    TODO: check the winner
    //}

    /// @notice Passes when the lottery is at open state and the current block timestamp is lower than the lottery clossing date
    modifier whenBetsOpen() {
        require(
            betsOpen && block.timestamp < betsClosingTime,
            "Lottery is closed"
        );
        _;
    }
    modifier whenBetsClosed() {
        require(!betsOpen, "Lottery is Open");
        _;
    }
}
