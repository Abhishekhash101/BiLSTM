import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, stats, SEED, PAYLOAD_SIZES } from "./helpers/setup.js";

describe("Hashing Overhead Benchmark", function () {
  // Increase timeout for benchmarking iterations
  this.timeout(120_000);

  const ITERATIONS = 100;
  const GAS_PRICE_GWEI = 30;

  async function setupFixture() {
    const deployed = await deployAll();
    return deployed;
  }

  describe("6.1 Local keccak256 Computation Benchmark", function () {
    it("Should benchmark local keccak256 for all payload sizes (100 iterations each)", async function () {
      console.log("\n  ┌─────────────────────────────────────────────────────────────┐");
      console.log("  │         Local keccak256 Benchmark (100 iterations)          │");
      console.log("  ├────────────┬──────────────────┬──────────────────┬──────────┤");
      console.log("  │ Size (B)   │ Mean (ms)        │ StdDev (ms)      │ P95 (ms) │");
      console.log("  ├────────────┼──────────────────┼──────────────────┼──────────┤");

      for (const size of PAYLOAD_SIZES) {
        const { payloadBytes } = generatePayload(SEED, size);
        const hexPayload = ethers.hexlify(payloadBytes);
        const timings = [];

        for (let i = 0; i < ITERATIONS; i++) {
          const start = performance.now();
          ethers.keccak256(hexPayload);
          const elapsed = performance.now() - start;
          timings.push(elapsed);
        }

        const result = stats(timings);
        console.log(
          `  │ ${String(size).padEnd(10)}│ ${result.mean.toFixed(6).padEnd(16)}│ ${result.stdDev.toFixed(6).padEnd(16)}│ ${result.p95.toFixed(6).padEnd(8)}│`
        );

        expect(result.mean).to.be.greaterThan(0);
        expect(result.stdDev).to.be.a("number");
      }

      console.log("  └────────────┴──────────────────┴──────────────────┴──────────┘");
    });
  });

  describe("6.2 On-Chain verifyPayload Gas Estimation", function () {
    it("Should estimate gas for on-chain verifyPayload per payload size", async function () {
      const { predictionStorage } = await loadFixture(setupFixture);

      console.log("\n  ┌───────────────────────────────────────────────────┐");
      console.log("  │     On-Chain verifyPayload Gas Estimation         │");
      console.log("  ├────────────┬──────────────────┬──────────────────┤");
      console.log("  │ Size (B)   │ Gas Units        │ Cost (ETH@30gwei)│");
      console.log("  ├────────────┼──────────────────┼──────────────────┤");

      for (const size of PAYLOAD_SIZES) {
        const { payloadBytes, payloadHash, pgs, cid } = generatePayload(SEED, size);

        // Use unique timestamps per payload size to avoid "already anchored" error
        const timestamp = 1573300800 + size;

        // Anchor the forecast first so verifyPayload has stored hash to compare
        await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

        // Estimate gas for verifyPayload
        const hexPayload = ethers.hexlify(payloadBytes);
        const gasEstimate = await predictionStorage.verifyPayload.estimateGas(timestamp, hexPayload);

        const gasNumber = Number(gasEstimate);
        const costEth = (gasNumber * GAS_PRICE_GWEI) / 1e9;

        console.log(
          `  │ ${String(size).padEnd(10)}│ ${String(gasNumber).padEnd(16)}│ ${costEth.toFixed(9).padEnd(16)}│`
        );

        expect(gasNumber).to.be.greaterThan(0);
      }

      console.log("  └────────────┴──────────────────┴──────────────────┘");
    });
  });

  describe("6.3 Cost Ratio: On-Chain Gas vs Local Compute", function () {
    it("Should compute and report cost ratio (gas × 30 gwei) / local_mean_time_ms", async function () {
      const { predictionStorage } = await loadFixture(setupFixture);

      console.log("\n  ┌──────────────────────────────────────────────────────────────────────────┐");
      console.log("  │              Cost Ratio: (Gas × 30 gwei) / Local Mean Time              │");
      console.log("  ├────────────┬──────────────┬──────────────┬──────────────────────────────┤");
      console.log("  │ Size (B)   │ Local (ms)   │ Gas Units    │ Ratio (gwei/ms)              │");
      console.log("  ├────────────┼──────────────┼──────────────┼──────────────────────────────┤");

      for (const size of PAYLOAD_SIZES) {
        const { payloadBytes, payloadHash, pgs, cid } = generatePayload(SEED, size);
        const hexPayload = ethers.hexlify(payloadBytes);

        // --- Local benchmark ---
        const timings = [];
        for (let i = 0; i < ITERATIONS; i++) {
          const start = performance.now();
          ethers.keccak256(hexPayload);
          const elapsed = performance.now() - start;
          timings.push(elapsed);
        }
        const localStats = stats(timings);

        // --- On-chain gas estimation ---
        const timestamp = 1573400800 + size; // Different from 6.2 to avoid collision
        await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);
        const gasEstimate = await predictionStorage.verifyPayload.estimateGas(timestamp, hexPayload);
        const gasNumber = Number(gasEstimate);

        // --- Cost ratio ---
        // cost in gwei = gasUnits × 30 gwei
        const costGwei = gasNumber * GAS_PRICE_GWEI;
        // ratio = costGwei / localMeanTimeMs  (units: gwei/ms)
        const ratio = costGwei / localStats.mean;

        console.log(
          `  │ ${String(size).padEnd(10)}│ ${localStats.mean.toFixed(4).padEnd(12)}│ ${String(gasNumber).padEnd(12)}│ ${ratio.toFixed(2).padEnd(28)}│`
        );

        expect(ratio).to.be.greaterThan(0);
      }

      console.log("  └────────────┴──────────────┴──────────────┴──────────────────────────────┘");
      console.log("\n  Note: Ratio represents gwei of on-chain cost per ms of local computation.");
      console.log("  Higher ratio = on-chain hashing is proportionally more expensive relative to local speed.");
    });
  });

  describe("6.4 Deterministic Payload Generation (SEED=42)", function () {
    it("Should generate reproducible payloads using fixed SEED=42", function () {
      // Verify SEED constant
      expect(SEED).to.equal(42);

      // Generate payloads twice and verify determinism
      for (const size of PAYLOAD_SIZES) {
        const payload1 = generatePayload(SEED, size);
        const payload2 = generatePayload(SEED, size);

        expect(payload1.payloadHash).to.equal(payload2.payloadHash);
        expect(payload1.payloadString).to.equal(payload2.payloadString);
        expect(payload1.pgs).to.equal(payload2.pgs);
        expect(payload1.cid).to.equal(payload2.cid);

        // Verify payload is approximately the requested size
        expect(payload1.payloadBytes.length).to.be.closeTo(size, size * 0.15);
      }

      console.log("\n  ✓ All payloads generated with SEED=42 are deterministic and reproducible");
      console.log(`  ✓ Payload sizes verified: ${PAYLOAD_SIZES.join(", ")} bytes`);
    });
  });
});
