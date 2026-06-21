import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, canonicalJSON, SEED } from "./helpers/setup.js";

describe("Requirement 1: Hash Integrity Verification", function () {
  // 1.1 - Verify payloadHash stored equals local keccak256 of canonical JSON payload
  it("1.1 anchored forecast payloadHash equals locally computed keccak256 of canonical JSON", async function () {
    const { predictionStorage } = await loadFixture(deployAll);

    const timestamp = 1700000000;
    const { payloadString, payloadHash, pgs, cid } = generatePayload(SEED, 1024);

    // Anchor the forecast on-chain
    await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

    // Read back the stored record
    const record = await predictionStorage.forecasts(timestamp);

    // Verify the stored payloadHash matches our locally computed keccak256
    const localHash = ethers.keccak256(ethers.toUtf8Bytes(payloadString));
    expect(record.payloadHash).to.equal(localHash);
    expect(record.payloadHash).to.equal(payloadHash);
  });

  // 1.2 - Two differing payloads produce different hashes
  it("1.2 two differing payloads produce different hashes", async function () {
    const { predictionStorage } = await loadFixture(deployAll);

    const timestamp1 = 1700000000;
    const timestamp2 = 1700003600;

    // Generate two payloads with different seeds to ensure different content
    const payload1 = generatePayload(SEED, 1024);
    const payload2 = generatePayload(SEED + 1, 1024);

    // Anchor both forecasts at distinct timestamps
    await predictionStorage.anchorForecast(timestamp1, payload1.payloadHash, payload1.cid, payload1.pgs);
    await predictionStorage.anchorForecast(timestamp2, payload2.payloadHash, payload2.cid, payload2.pgs);

    // Read back stored records
    const record1 = await predictionStorage.forecasts(timestamp1);
    const record2 = await predictionStorage.forecasts(timestamp2);

    // Verify the two hashes are different
    expect(record1.payloadHash).to.not.equal(record2.payloadHash);
  });

  // 1.3 - Tampered payload returns false from verifyPayload
  it("1.3 tampered payload returns false from verifyPayload", async function () {
    const { predictionStorage } = await loadFixture(deployAll);

    const timestamp = 1700000000;
    const { payloadString, payloadHash, pgs, cid } = generatePayload(SEED, 1024);

    // Anchor the original forecast
    await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

    // Verify the original payload matches
    const originalBytes = ethers.toUtf8Bytes(payloadString);
    const validResult = await predictionStorage.verifyPayload(timestamp, originalBytes);
    expect(validResult).to.equal(true);

    // Tamper with the payload by modifying a single character
    const tamperedString = payloadString.slice(0, -1) + "X";
    const tamperedBytes = ethers.toUtf8Bytes(tamperedString);

    // Verify tampered payload returns false
    const tamperedResult = await predictionStorage.verifyPayload(timestamp, tamperedBytes);
    expect(tamperedResult).to.equal(false);
  });

  // 1.4 - Same payload produces identical hash across 10 computations
  it("1.4 same payload produces identical hash across 10 computations", async function () {
    const { payloadString } = generatePayload(SEED, 1024);
    const payloadBytes = ethers.toUtf8Bytes(payloadString);

    // Compute keccak256 10 times and verify all are identical
    const hashes = [];
    for (let i = 0; i < 10; i++) {
      hashes.push(ethers.keccak256(payloadBytes));
    }

    // All hashes should be the same
    const firstHash = hashes[0];
    for (let i = 1; i < hashes.length; i++) {
      expect(hashes[i]).to.equal(firstHash);
    }
  });

  // 1.5 - verifyPayload returns false for unanchored timestamp
  it("1.5 verifyPayload returns false for unanchored timestamp", async function () {
    const { predictionStorage } = await loadFixture(deployAll);

    const unanchoredTimestamp = 9999999999;
    const { payloadString } = generatePayload(SEED, 1024);
    const payloadBytes = ethers.toUtf8Bytes(payloadString);

    // Call verifyPayload with a timestamp that has no anchored forecast
    const result = await predictionStorage.verifyPayload(unanchoredTimestamp, payloadBytes);
    expect(result).to.equal(false);
  });
});
