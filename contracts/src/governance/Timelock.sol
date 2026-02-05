// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Timelock - Governance Execution Delay
/// @notice Enforces a delay between proposal approval and execution
/// @dev Implements 7-day timelock as per vTON DAO Governance Model
///      - Proposals must wait in queue before execution
///      - Security Council can cancel queued proposals
///      - Grace period of 14 days after eta
contract Timelock is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotAdmin();
    error NotGovernor();
    error NotSecurityCouncil();
    error TransactionNotQueued();
    error TransactionAlreadyQueued();
    error TransactionNotReady();
    error TransactionExpired();
    error TransactionAlreadyCanceled();
    error ExecutionFailed();
    error ZeroAddress();
    error InvalidDelay();

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event TransactionQueued(
        bytes32 indexed txHash, address target, uint256 value, bytes data, uint256 eta
    );

    event TransactionExecuted(bytes32 indexed txHash, address target, uint256 value, bytes data);

    event TransactionCanceled(bytes32 indexed txHash);

    event DelayUpdated(uint256 oldDelay, uint256 newDelay);

    event GovernorUpdated(address oldGovernor, address newGovernor);

    event SecurityCouncilUpdated(address oldCouncil, address newCouncil);

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Minimum delay (1 hour)
    uint256 public constant MINIMUM_DELAY = 1 hours;

    /// @notice Maximum delay (30 days)
    uint256 public constant MAXIMUM_DELAY = 30 days;

    /// @notice Grace period after eta (14 days)
    uint256 public constant GRACE_PERIOD = 14 days;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    /// @notice Admin address (initially deployer, then DAO)
    address public admin;

    /// @notice DAO Governor address
    address public governor;

    /// @notice Security Council address
    address public securityCouncil;

    /// @notice Execution delay in seconds
    uint256 public delay;

    /// @notice Queued transactions: hash => queued
    mapping(bytes32 => bool) public queuedTransactions;

    /// @notice Canceled transactions
    mapping(bytes32 => bool) public canceledTransactions;

    /// @notice Transaction eta: hash => eta
    mapping(bytes32 => uint256) public transactionEta;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Deploy the Timelock
    /// @param admin_ Initial admin address
    /// @param delay_ Initial delay (must be between 1-30 days)
    constructor(address admin_, uint256 delay_) {
        if (admin_ == address(0)) revert ZeroAddress();
        if (delay_ < MINIMUM_DELAY || delay_ > MAXIMUM_DELAY) revert InvalidDelay();

        admin = admin_;
        delay = delay_;
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    modifier onlySecurityCouncil() {
        if (msg.sender != securityCouncil) revert NotSecurityCouncil();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                         TRANSACTION LIFECYCLE
    //////////////////////////////////////////////////////////////*/

    /// @notice Queue a transaction for execution
    /// @param target Target address
    /// @param value ETH value
    /// @param data Calldata
    /// @return txHash The transaction hash
    function queueTransaction(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyGovernor returns (bytes32 txHash) {
        uint256 eta = block.timestamp + delay;
        txHash = keccak256(abi.encode(target, value, data, eta));

        if (queuedTransactions[txHash]) revert TransactionAlreadyQueued();

        queuedTransactions[txHash] = true;
        transactionEta[txHash] = eta;

        emit TransactionQueued(txHash, target, value, data, eta);
    }

    /// @notice Execute a queued transaction
    /// @param target Target address
    /// @param value ETH value
    /// @param data Calldata
    /// @param eta The eta timestamp
    /// @return result The return data
    function executeTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 eta
    ) external payable onlyGovernor nonReentrant returns (bytes memory result) {
        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));

        if (!queuedTransactions[txHash]) revert TransactionNotQueued();
        if (canceledTransactions[txHash]) revert TransactionAlreadyCanceled();
        if (block.timestamp < eta) revert TransactionNotReady();
        if (block.timestamp > eta + GRACE_PERIOD) revert TransactionExpired();

        queuedTransactions[txHash] = false;

        bool success;
        (success, result) = target.call{ value: value }(data);
        if (!success) revert ExecutionFailed();

        emit TransactionExecuted(txHash, target, value, data);
    }

    /// @notice Cancel a queued transaction (Security Council only)
    /// @param target Target address
    /// @param value ETH value
    /// @param data Calldata
    /// @param eta The eta timestamp
    function cancelTransaction(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 eta
    ) external onlySecurityCouncil {
        bytes32 txHash = keccak256(abi.encode(target, value, data, eta));

        if (!queuedTransactions[txHash]) revert TransactionNotQueued();

        canceledTransactions[txHash] = true;

        emit TransactionCanceled(txHash);
    }

    /// @notice Cancel a transaction by hash (Security Council only)
    /// @param txHash The transaction hash
    function cancelTransactionByHash(bytes32 txHash) external onlySecurityCouncil {
        if (!queuedTransactions[txHash]) revert TransactionNotQueued();

        canceledTransactions[txHash] = true;

        emit TransactionCanceled(txHash);
    }

    /*//////////////////////////////////////////////////////////////
                           ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Set the governor address
    /// @param newGovernor New governor address
    function setGovernor(address newGovernor) external onlyAdmin {
        if (newGovernor == address(0)) revert ZeroAddress();

        address oldGovernor = governor;
        governor = newGovernor;

        emit GovernorUpdated(oldGovernor, newGovernor);
    }

    /// @notice Set the security council address
    /// @param newCouncil New security council address
    function setSecurityCouncil(address newCouncil) external onlyAdmin {
        if (newCouncil == address(0)) revert ZeroAddress();

        address oldCouncil = securityCouncil;
        securityCouncil = newCouncil;

        emit SecurityCouncilUpdated(oldCouncil, newCouncil);
    }

    /// @notice Set the delay
    /// @param newDelay New delay in seconds
    function setDelay(uint256 newDelay) external onlyAdmin {
        if (newDelay < MINIMUM_DELAY || newDelay > MAXIMUM_DELAY) revert InvalidDelay();

        uint256 oldDelay = delay;
        delay = newDelay;

        emit DelayUpdated(oldDelay, newDelay);
    }

    /// @notice Transfer admin to a new address
    /// @param newAdmin New admin address
    function setAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        admin = newAdmin;
    }

    /*//////////////////////////////////////////////////////////////
                              VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Check if a transaction is queued
    /// @param txHash The transaction hash
    /// @return True if queued and not canceled
    function isQueued(bytes32 txHash) external view returns (bool) {
        return queuedTransactions[txHash] && !canceledTransactions[txHash];
    }

    /// @notice Check if a transaction is ready for execution
    /// @param txHash The transaction hash
    /// @return True if ready
    function isReady(bytes32 txHash) external view returns (bool) {
        if (!queuedTransactions[txHash] || canceledTransactions[txHash]) {
            return false;
        }
        uint256 eta = transactionEta[txHash];
        return block.timestamp >= eta && block.timestamp <= eta + GRACE_PERIOD;
    }

    /// @notice Get transaction hash
    /// @param target Target address
    /// @param value ETH value
    /// @param data Calldata
    /// @param eta The eta timestamp
    /// @return The transaction hash
    function getTransactionHash(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 eta
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, eta));
    }

    /// @notice Receive ETH
    receive() external payable { }
}
