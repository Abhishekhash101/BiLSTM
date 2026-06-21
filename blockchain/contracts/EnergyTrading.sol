// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PredictionStorage.sol";

/**
 * @title EnergyTrading
 * @notice PGS-gated energy trading contract. Only allows trades when the
 *         Predictive Green Score exceeds the on-chain confidence threshold.
 *         Uses PGS >= 1500 (corresponding to forecast threshold 0.15).
 */
contract EnergyTrading {
    PredictionStorage public predictionStorage;
    
    // PGS threshold for scheduling eligibility (1500 = 0.15 on normalized scale)
    uint256 public constant PGS_THRESHOLD = 1500;
    
    // ENRG token denomination (simplified as wei-based for prototype)
    uint256 public constant MIN_TRADE_AMOUNT = 0.001 ether;

    struct TradeOffer {
        uint256 id;
        address seller;
        uint256 forecastTimestamp;  // Which forecast hour this trade is for
        uint256 energyMWh;         // Energy amount in MWh (scaled by 1000)
        uint256 pricePerMWh;       // Price per MWh in wei
        bool active;
        bool filled;
        address buyer;
    }

    uint256 public nextTradeId;
    mapping(uint256 => TradeOffer) public trades;
    
    // Escrow balances
    mapping(address => uint256) public escrowBalance;

    // Events
    event TradeCreated(uint256 indexed tradeId, address indexed seller, uint256 forecastTimestamp, uint256 energyMWh, uint256 pricePerMWh);
    event TradeFilled(uint256 indexed tradeId, address indexed buyer, uint256 pgsAtExecution);
    event TradeBlocked(uint256 indexed tradeId, uint256 pgsValue, string reason);
    event EscrowDeposited(address indexed user, uint256 amount);
    event EscrowWithdrawn(address indexed user, uint256 amount);

    constructor(address _predictionStorage) {
        predictionStorage = PredictionStorage(_predictionStorage);
    }

    /**
     * @notice Create a trade offer gated by forecast quality
     * @param _forecastTimestamp The hour for which this energy is being traded
     * @param _energyMWh Energy amount (scaled by 1000 for precision)
     * @param _pricePerMWh Price per MWh in wei
     */
    function createTrade(
        uint256 _forecastTimestamp,
        uint256 _energyMWh,
        uint256 _pricePerMWh
    ) external returns (uint256 tradeId) {
        require(_energyMWh > 0, "Energy must be positive");
        require(_pricePerMWh > 0, "Price must be positive");

        // Check PGS gate — forecast must be anchored and meet threshold
        uint256 pgs = predictionStorage.getPGS(_forecastTimestamp);
        require(pgs >= PGS_THRESHOLD, "PGS below threshold: scheduling not eligible");

        tradeId = nextTradeId++;
        trades[tradeId] = TradeOffer({
            id: tradeId,
            seller: msg.sender,
            forecastTimestamp: _forecastTimestamp,
            energyMWh: _energyMWh,
            pricePerMWh: _pricePerMWh,
            active: true,
            filled: false,
            buyer: address(0)
        });

        emit TradeCreated(tradeId, msg.sender, _forecastTimestamp, _energyMWh, _pricePerMWh);
    }

    /**
     * @notice Fill (accept) a trade offer. Buyer sends payment to escrow.
     * @param _tradeId The trade to fill
     */
    function fillTrade(uint256 _tradeId) external payable {
        TradeOffer storage trade = trades[_tradeId];
        require(trade.active, "Trade not active");
        require(!trade.filled, "Trade already filled");
        require(msg.sender != trade.seller, "Cannot fill own trade");

        // Re-verify PGS at execution time
        uint256 pgs = predictionStorage.getPGS(trade.forecastTimestamp);
        if (pgs < PGS_THRESHOLD) {
            trade.active = false;
            emit TradeBlocked(_tradeId, pgs, "PGS dropped below threshold");
            // Refund buyer
            if (msg.value > 0) {
                payable(msg.sender).transfer(msg.value);
            }
            return;
        }

        uint256 totalCost = trade.energyMWh * trade.pricePerMWh / 1000;
        require(msg.value >= totalCost, "Insufficient payment");

        trade.filled = true;
        trade.active = false;
        trade.buyer = msg.sender;

        // Hold in escrow
        escrowBalance[trade.seller] += totalCost;

        // Refund excess
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }

        emit TradeFilled(_tradeId, msg.sender, pgs);
    }

    /**
     * @notice Withdraw accumulated escrow balance
     */
    function withdrawEscrow() external {
        uint256 amount = escrowBalance[msg.sender];
        require(amount > 0, "No escrow balance");
        escrowBalance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
        emit EscrowWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Check if a timestamp is eligible for trading
     */
    function isEligible(uint256 _forecastTimestamp) external view returns (bool) {
        return predictionStorage.getPGS(_forecastTimestamp) >= PGS_THRESHOLD;
    }
}
