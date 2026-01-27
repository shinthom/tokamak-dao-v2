// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IvTON } from "../interfaces/IvTON.sol";

/// @title VTONFaucet
/// @notice Testnet faucet for distributing vTON tokens for governance testing
/// @dev Allows users to claim vTON tokens without restrictions
contract VTONFaucet is Ownable {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when claim amount is set to zero
    error InvalidClaimAmount();

    /// @notice Thrown when faucet is paused
    error FaucetPaused();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Emitted when a user claims tokens
    /// @param user The address that claimed tokens
    /// @param amount The amount of tokens claimed
    /// @param timestamp The time of the claim
    event Claimed(address indexed user, uint256 amount, uint256 timestamp);

    /// @notice Emitted when claim amount is updated
    /// @param oldAmount The previous claim amount
    /// @param newAmount The new claim amount
    event ClaimAmountUpdated(uint256 oldAmount, uint256 newAmount);

    /// @notice Emitted when faucet pause status changes
    /// @param paused New pause status
    event PauseStatusUpdated(bool paused);

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice The vTON token contract
    IvTON public immutable vton;

    /// @notice Amount of vTON tokens given per claim
    uint256 public claimAmount = 1000 ether;

    /// @notice Total amount of tokens claimed from faucet
    uint256 public totalClaimed;

    /// @notice Whether the faucet is paused
    bool public paused;

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the faucet with vTON token address
    /// @param _vton The address of the vTON token contract
    /// @param _owner The initial owner of the faucet
    constructor(address _vton, address _owner) Ownable(_owner) {
        require(_vton != address(0), "Invalid vTON address");
        vton = IvTON(_vton);
    }

    /*//////////////////////////////////////////////////////////////
                            EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Claim vTON tokens from the faucet
    function claim() external {
        if (paused) revert FaucetPaused();

        totalClaimed += claimAmount;

        vton.mint(msg.sender, claimAmount);

        emit Claimed(msg.sender, claimAmount, block.timestamp);
    }

    /// @notice Check if a user can claim
    /// @return canClaimNow Whether the user can claim now
    function canClaim() external view returns (bool canClaimNow) {
        return !paused;
    }

    /*//////////////////////////////////////////////////////////////
                             ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Set the claim amount
    /// @param _amount New claim amount
    function setClaimAmount(uint256 _amount) external onlyOwner {
        if (_amount == 0) revert InvalidClaimAmount();
        uint256 oldAmount = claimAmount;
        claimAmount = _amount;
        emit ClaimAmountUpdated(oldAmount, _amount);
    }

    /// @notice Pause or unpause the faucet
    /// @param _paused New pause status
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PauseStatusUpdated(_paused);
    }
}
