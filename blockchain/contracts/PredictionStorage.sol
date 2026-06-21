// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PredictionStorage
 * @notice Anchors forecast payloads on-chain via IPFS CID and keccak256 hash.
 *         Provides immutable provenance for each forecast used in scheduling decisions.
 */
contract PredictionStorage {
    struct ForecastRecord {
        uint256 timestamp;        // Unix timestamp of the forecast hour
        bytes32 payloadHash;      // keccak256 hash of canonical JSON payload
        string ipfsCid;           // IPFS Content Identifier for full payload retrieval
        uint256 pgs;              // Predictive Green Score (0-10000 scale)
        address submitter;        // Address that submitted the forecast
        uint256 blockAnchored;    // Block number when anchored
    }

    // Mapping from forecast timestamp to record
    mapping(uint256 => ForecastRecord) public forecasts;
    
    // Array of all anchored timestamps for enumeration
    uint256[] public anchoredTimestamps;
    
    // Events
    event ForecastAnchored(
        uint256 indexed timestamp,
        bytes32 payloadHash,
        string ipfsCid,
        uint256 pgs,
        address indexed submitter
    );

    /**
     * @notice Anchor a forecast payload on-chain
     * @param _timestamp Unix timestamp of the forecast hour
     * @param _payloadHash keccak256 hash of the canonical JSON payload
     * @param _ipfsCid IPFS CID where the full payload is stored
     * @param _pgs Predictive Green Score (0-10000)
     */
    function anchorForecast(
        uint256 _timestamp,
        bytes32 _payloadHash,
        string calldata _ipfsCid,
        uint256 _pgs
    ) external {
        require(_pgs <= 10000, "PGS must be 0-10000");
        require(_payloadHash != bytes32(0), "Empty hash not allowed");
        require(bytes(_ipfsCid).length > 0, "Empty CID not allowed");
        require(forecasts[_timestamp].blockAnchored == 0, "Forecast already anchored");

        forecasts[_timestamp] = ForecastRecord({
            timestamp: _timestamp,
            payloadHash: _payloadHash,
            ipfsCid: _ipfsCid,
            pgs: _pgs,
            submitter: msg.sender,
            blockAnchored: block.number
        });

        anchoredTimestamps.push(_timestamp);

        emit ForecastAnchored(_timestamp, _payloadHash, _ipfsCid, _pgs, msg.sender);
    }

    /**
     * @notice Verify a forecast payload against its on-chain hash
     * @param _timestamp The forecast timestamp to verify
     * @param _payload The raw canonical JSON payload bytes
     * @return valid Whether the payload matches the stored hash
     */
    function verifyPayload(uint256 _timestamp, bytes calldata _payload) 
        external view returns (bool valid) 
    {
        bytes32 computedHash = keccak256(_payload);
        return forecasts[_timestamp].payloadHash == computedHash;
    }

    /**
     * @notice Get the PGS for a given timestamp
     */
    function getPGS(uint256 _timestamp) external view returns (uint256) {
        return forecasts[_timestamp].pgs;
    }

    /**
     * @notice Get total number of anchored forecasts
     */
    function totalAnchored() external view returns (uint256) {
        return anchoredTimestamps.length;
    }
}
