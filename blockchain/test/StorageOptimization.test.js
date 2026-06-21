import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { canonicalJSON } from "./helpers/setup.js";

describe("Requirement 11: Storage Optimization Analysis", function () {
  this.timeout(10000);

  // Reference forecast payload matching criterion 11.1 fields
  const samplePayload = {
    generation_mw: 45.678,
    load_mw: 123.456,
    model_version: "hybrid_residual_v1",
    pgs_score: 2500,
    site_id: "TN_SOLAR_01",
    soc_percent: 67.89,
    timestamp: "2024-01-15T10:00:00Z"
  };

  // Constants
  const HASH_BYTES = 32;
  const CID_V0_BYTES = 46;
  const CID_V1_BYTES = 59;
  const FORECASTS_PER_WEEK = 280; // 7 days × 40 eligible hours

  // Per-forecast on-chain struct storage (ForecastRecord)
  // timestamp(uint256): 32, payloadHash(bytes32): 32, ipfsCid(string): CID length,
  // pgs(uint256): 32, submitter(address): 32, blockAnchored(uint256): 32
  const PER_FORECAST_FIXED_SLOTS = 32 + 32 + 32 + 32 + 32; // 160 bytes (5 × 32-byte slots)

  let payloadBytes;
  let payloadString;

  before(function () {
    // Serialize using canonical JSON (sorted keys, no whitespace)
    payloadString = canonicalJSON(samplePayload);
    payloadBytes = new TextEncoder().encode(payloadString).length;
  });

  it("11.1 Compute and report canonical JSON forecast payload byte size", function () {
    expect(payloadBytes).to.be.greaterThan(0);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║          STORAGE OPTIMIZATION ANALYSIS REPORT               ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log(`║ 11.1 Canonical JSON Payload                                 ║`);
    console.log(`║   Serialized payload: ${payloadString.substring(0, 50)}...`);
    console.log(`║   Payload byte size: ${payloadBytes} bytes                  `);
    console.log("╠══════════════════════════════════════════════════════════════╣");
  });

  it("11.2 Report fixed 32-byte keccak256 hash size", function () {
    // Compute keccak256 of the payload to confirm 32-byte output
    const encoded = ethers.toUtf8Bytes(payloadString);
    const hash = ethers.keccak256(encoded);

    // keccak256 returns 0x-prefixed hex string → 66 chars → 32 bytes raw
    const hashByteLength = ethers.getBytes(hash).length;
    expect(hashByteLength).to.equal(HASH_BYTES);

    console.log(`║ 11.2 Keccak256 Hash Size                                    ║`);
    console.log(`║   Hash: ${hash.substring(0, 22)}...                         `);
    console.log(`║   Fixed size: ${hashByteLength} bytes                        `);
    console.log("╠══════════════════════════════════════════════════════════════╣");
  });

  it("11.3 Report CID byte size for CIDv0 (46 bytes) and CIDv1 (59 bytes)", function () {
    // CIDv0 example: Qm + 44 base58 chars = 46 characters
    const cidV0Example = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    // CIDv1 example: bafy... = 59 characters
    const cidV1Example = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oquooekztinez4";

    expect(cidV0Example.length).to.equal(CID_V0_BYTES);
    expect(cidV1Example.length).to.equal(CID_V1_BYTES);

    console.log(`║ 11.3 CID Byte Sizes                                         ║`);
    console.log(`║   CIDv0 string length: ${CID_V0_BYTES} bytes                `);
    console.log(`║   CIDv1 string length: ${CID_V1_BYTES} bytes                `);
    console.log("╠══════════════════════════════════════════════════════════════╣");
  });

  it("11.4 Calculate and report storage compression ratio", function () {
    // On-chain footprint per forecast = payloadHash (32) + CID string (46 for CIDv0)
    const onChainFootprint = HASH_BYTES + CID_V0_BYTES;
    const compressionRatio = payloadBytes / onChainFootprint;

    expect(onChainFootprint).to.equal(78);
    expect(compressionRatio).to.be.greaterThan(0);

    console.log(`║ 11.4 Storage Compression Ratio                              ║`);
    console.log(`║   Full payload size:       ${payloadBytes} bytes             `);
    console.log(`║   On-chain footprint:      ${onChainFootprint} bytes (hash + CIDv0)`);
    console.log(`║   Compression ratio:       ${compressionRatio.toFixed(2)}:1  `);
    console.log("╠══════════════════════════════════════════════════════════════╣");
  });

  it("11.5 Compute cumulative state growth for 280 forecasts (7 days × 40 eligible hours)", function () {
    // Per-forecast on-chain storage (ForecastRecord struct):
    // - timestamp (uint256): 32 bytes
    // - payloadHash (bytes32): 32 bytes
    // - ipfsCid (string): 46 bytes (CIDv0)
    // - pgs (uint256): 32 bytes
    // - submitter (address, stored as 32-byte slot): 32 bytes
    // - blockAnchored (uint256): 32 bytes
    // Total per forecast = 206 bytes
    const perForecastBytes = PER_FORECAST_FIXED_SLOTS + CID_V0_BYTES; // 160 + 46 = 206
    const cumulativeGrowth = perForecastBytes * FORECASTS_PER_WEEK;

    expect(perForecastBytes).to.equal(206);
    expect(cumulativeGrowth).to.equal(206 * 280);

    console.log(`║ 11.5 Cumulative State Growth (7-day window)                 ║`);
    console.log(`║   Per-forecast struct size: ${perForecastBytes} bytes        `);
    console.log(`║     - timestamp (uint256):    32 bytes                       ║`);
    console.log(`║     - payloadHash (bytes32):  32 bytes                       ║`);
    console.log(`║     - ipfsCid (string):       ${CID_V0_BYTES} bytes (CIDv0)  ║`);
    console.log(`║     - pgs (uint256):          32 bytes                       ║`);
    console.log(`║     - submitter (address):    32 bytes                       ║`);
    console.log(`║     - blockAnchored (uint256):32 bytes                       ║`);
    console.log(`║   Forecasts per week:      ${FORECASTS_PER_WEEK} (7 days × 40 hrs)`);
    console.log(`║   Cumulative growth:       ${cumulativeGrowth} bytes (${(cumulativeGrowth / 1024).toFixed(2)} KB)`);
    console.log("╠══════════════════════════════════════════════════════════════╣");
  });

  it("11.6 Verify compression ratio >= 2:1", function () {
    const onChainFootprint = HASH_BYTES + CID_V0_BYTES;
    const compressionRatio = payloadBytes / onChainFootprint;

    // The compression ratio must be at least 2:1
    expect(compressionRatio).to.be.at.least(2.0,
      `Compression ratio ${compressionRatio.toFixed(2)}:1 is below the required 2:1 minimum`
    );

    console.log(`║ 11.6 Compression Ratio Verification                         ║`);
    console.log(`║   Payload size:      ${payloadBytes} bytes                   `);
    console.log(`║   On-chain footprint: ${onChainFootprint} bytes              `);
    console.log(`║   Ratio:             ${compressionRatio.toFixed(2)}:1        `);
    console.log(`║   Requirement:       >= 2.0:1                                ║`);
    console.log(`║   Status:            ${compressionRatio >= 2.0 ? "✓ PASS" : "✗ FAIL"} `);
    console.log("╚══════════════════════════════════════════════════════════════╝\n");
  });
});
