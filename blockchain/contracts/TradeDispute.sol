// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./EnergyTrading.sol";
import "./PredictionStorage.sol";

/**
 * @title TradeDispute
 * @notice Manages disputed settlements through a resolution mechanism.
 *         If a trade's underlying forecast is later found invalid,
 *         parties can raise disputes and funds are resolved accordingly.
 */
contract TradeDispute {
    EnergyTrading public energyTrading;
    PredictionStorage public predictionStorage;

    enum DisputeStatus { Open, ResolvedForBuyer, ResolvedForSeller, Rejected }

    struct Dispute {
        uint256 id;
        uint256 tradeId;
        address initiator;
        string reason;
        DisputeStatus status;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    uint256 public nextDisputeId;
    mapping(uint256 => Dispute) public disputes;
    
    // Arbiter address (simplified — in production, use multi-sig or DAO)
    address public arbiter;

    // Events
    event DisputeRaised(uint256 indexed disputeId, uint256 indexed tradeId, address indexed initiator, string reason);
    event DisputeResolved(uint256 indexed disputeId, DisputeStatus status);

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only arbiter can resolve");
        _;
    }

    constructor(address _energyTrading, address _predictionStorage, address _arbiter) {
        energyTrading = EnergyTrading(_energyTrading);
        predictionStorage = PredictionStorage(_predictionStorage);
        arbiter = _arbiter;
    }

    /**
     * @notice Raise a dispute on a filled trade
     * @param _tradeId The trade being disputed
     * @param _reason Description of the dispute
     */
    function raiseDispute(uint256 _tradeId, string calldata _reason) external returns (uint256 disputeId) {
        (,address seller,,,,,, address buyer) = energyTrading.trades(_tradeId);
        require(msg.sender == seller || msg.sender == buyer, "Not a party to this trade");

        disputeId = nextDisputeId++;
        disputes[disputeId] = Dispute({
            id: disputeId,
            tradeId: _tradeId,
            initiator: msg.sender,
            reason: _reason,
            status: DisputeStatus.Open,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        emit DisputeRaised(disputeId, _tradeId, msg.sender, _reason);
    }

    /**
     * @notice Resolve a dispute (arbiter only)
     * @param _disputeId The dispute to resolve
     * @param _forBuyer True if resolved in buyer's favor, false for seller
     */
    function resolveDispute(uint256 _disputeId, bool _forBuyer) external onlyArbiter {
        Dispute storage d = disputes[_disputeId];
        require(d.status == DisputeStatus.Open, "Dispute not open");

        d.status = _forBuyer ? DisputeStatus.ResolvedForBuyer : DisputeStatus.ResolvedForSeller;
        d.resolvedAt = block.timestamp;

        emit DisputeResolved(_disputeId, d.status);
    }

    /**
     * @notice Verify that a trade's forecast is still valid on-chain
     * @param _tradeId The trade to verify
     * @param _payload The original forecast payload bytes
     */
    function verifyTradeIntegrity(uint256 _tradeId, bytes calldata _payload) 
        external view returns (bool forecastValid, uint256 pgs) 
    {
        (,,uint256 forecastTimestamp,,,,,) = energyTrading.trades(_tradeId);
        forecastValid = predictionStorage.verifyPayload(forecastTimestamp, _payload);
        pgs = predictionStorage.getPGS(forecastTimestamp);
    }
}
