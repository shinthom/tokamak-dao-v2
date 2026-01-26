// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import { ERC20Votes } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import { Votes } from "@openzeppelin/contracts/governance/utils/Votes.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IvTON } from "../interfaces/IvTON.sol";

/// @title vTON - Tokamak Network Governance Token
/// @notice The governance token for Tokamak Network DAO
/// @dev Key properties:
///      - Infinite supply (minted based on seigniorage)
///      - Tradeable (can be transferred)
///      - Not burned on voting (voting is based on balance, not consumption)
///      - Distributed to L2 Operators and Validators (NOT DAO Treasury)
///      - Emission ratio adjustable by DAO (0-100%)
contract vTON is ERC20, ERC20Permit, ERC20Votes, Ownable, IvTON {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @notice Thrown when caller is not an authorized minter
    error NotMinter();

    /// @notice Thrown when emission ratio exceeds maximum (100%)
    error InvalidEmissionRatio();

    /// @notice Thrown when setting zero address as minter
    error ZeroAddress();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice Emission ratio for vTON distribution (scaled by 1e18)
    /// @dev 1e18 = 100%, 0 = 0%
    uint256 public override emissionRatio;

    /// @notice Maximum emission ratio (100%)
    uint256 public constant MAX_EMISSION_RATIO = 1e18;

    /// @notice Mapping of authorized minters
    mapping(address => bool) private _minters;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the vTON token
    /// @param initialOwner The initial owner (admin)
    constructor(address initialOwner)
        ERC20("Tokamak Network Governance Token", "vTON")
        ERC20Permit("Tokamak Network Governance Token")
        Ownable(initialOwner)
    {
        if (initialOwner == address(0)) revert ZeroAddress();
        emissionRatio = MAX_EMISSION_RATIO; // Start at 100%
    }

    /*//////////////////////////////////////////////////////////////
                            MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IvTON
    function mint(address to, uint256 amount) external override {
        if (!_minters[msg.sender]) revert NotMinter();
        if (to == address(0)) revert ZeroAddress();

        // Apply emission ratio
        uint256 adjustedAmount = (amount * emissionRatio) / MAX_EMISSION_RATIO;
        if (adjustedAmount == 0) return;

        _mint(to, adjustedAmount);
        emit Minted(to, adjustedAmount);
    }

    /// @inheritdoc IvTON
    function setEmissionRatio(uint256 ratio) external override onlyOwner {
        if (ratio > MAX_EMISSION_RATIO) revert InvalidEmissionRatio();

        uint256 oldRatio = emissionRatio;
        emissionRatio = ratio;
        emit EmissionRatioUpdated(oldRatio, ratio);
    }

    /// @inheritdoc IvTON
    function isMinter(address account) external view override returns (bool) {
        return _minters[account];
    }

    /// @inheritdoc IvTON
    function setMinter(address minter, bool allowed) external override onlyOwner {
        if (minter == address(0)) revert ZeroAddress();

        _minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    /*//////////////////////////////////////////////////////////////
                            VOTING POWER
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IvTON
    function getPastVotes(
        address account,
        uint256 blockNumber
    ) public view override(Votes, IvTON) returns (uint256) {
        return super.getPastVotes(account, blockNumber);
    }

    /// @inheritdoc IvTON
    function getVotes(address account) public view override(Votes, IvTON) returns (uint256) {
        return super.getVotes(account);
    }

    /*//////////////////////////////////////////////////////////////
                           REQUIRED OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /// @dev Override required by Solidity for ERC20Votes
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    /// @dev Override required by Solidity for ERC20Permit
    function nonces(
        address owner
    ) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
