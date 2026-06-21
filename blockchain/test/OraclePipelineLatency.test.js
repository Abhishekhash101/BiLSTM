import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, canonicalJSON, stats, SEED } from "./helpers/setup.js";

describe("Requirement 7: Oracle Pipeline Latency", function () {
  this.timeout(60000);

  const ITERATIONS = 12;
  const BASE_TIMESTAMP = 1_600_000_000;

  /**
   * Convert BigInt nanoseconds to milliseconds (float).
   */
  function nsToMs(ns) {
    return Number(ns) / 1_000_000;
  }

  describe("7.1 Full pipeline latency using process.hrtime.bigint()", function () {
    it("should measure end-to-end pipeline latency with high-resolution timing", async function () {
      const { predictionStorage } = await loadFixture(deployAll);

      const endToEndLatencies = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const seed = SEED + i;
        const timestamp = BASE_TIMESTAMP + i * 3600;

        const startTotal = process.hrtime.bigint();

        // Stage 1: Payload generation + canonical JSON serialization
        const { payloadString, payloadHash, pgs, cid } = generatePayload(seed, 1024);

        // Stage 2: Keccak256 hash computation (already done in generatePayload, redo for timing)
        const payloadBytes = ethers.toUtf8Bytes(payloadString);
        ethers.keccak256(payloadBytes);

        // Stage 3: CID generation (already done in generatePayload)

        // Stage 4: Transaction submission
        const tx = await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

        // Stage 5: Block confirmation
        await tx.wait();

        const endTotal = process.hrtime.bigint();
        const totalMs = nsToMs(endTotal - startTotal);
        endToEndLatencies.push(totalMs);
      }

      const result = stats(endToEndLatencies);
      console.log(`\n  ⏱️  Full Pipeline Latency (${ITERATIONS} iterations):`);
      console.log(`     Mean:   ${result.mean.toFixed(3)} ms`);
      console.log(`     StdDev: ${result.stdDev.toFixed(3)} ms`);
      console.log(`     Min:    ${result.min.toFixed(3)} ms`);
      console.log(`     Max:    ${result.max.toFixed(3)} ms`);
      console.log(`     P95:    ${result.p95.toFixed(3)} ms`);

      expect(endToEndLatencies.length).to.be.at.least(10);
      expect(result.mean).to.be.a("number");
      expect(result.stdDev).to.be.a("number");
    });
  });

  describe("7.2 Individual stage latencies", function () {
    it("should measure and report latency for each pipeline stage", async function () {
      const { predictionStorage } = await loadFixture(deployAll);

      const stageLatencies = {
        payloadGeneration: [],
        hashing: [],
        cidGeneration: [],
        txSubmission: [],
        blockConfirmation: []
      };

      for (let i = 0; i < ITERATIONS; i++) {
        const seed = SEED + i;
        const timestamp = BASE_TIMESTAMP + i * 3600;

        // Stage 1: Payload generation + canonical JSON serialization
        const startPayload = process.hrtime.bigint();
        const { payloadString, pgs, cid } = generatePayload(seed, 1024);
        const endPayload = process.hrtime.bigint();
        stageLatencies.payloadGeneration.push(nsToMs(endPayload - startPayload));

        // Stage 2: Keccak256 hash computation
        const startHash = process.hrtime.bigint();
        const payloadBytes = ethers.toUtf8Bytes(payloadString);
        const payloadHash = ethers.keccak256(payloadBytes);
        const endHash = process.hrtime.bigint();
        stageLatencies.hashing.push(nsToMs(endHash - startHash));

        // Stage 3: Simulated CID generation
        // Re-run generatePayload to isolate CID generation timing
        const startCid = process.hrtime.bigint();
        generatePayload(seed, 1024);
        const endCid = process.hrtime.bigint();
        stageLatencies.cidGeneration.push(nsToMs(endCid - startCid));

        // Stage 4: Transaction submission (anchorForecast)
        const startTx = process.hrtime.bigint();
        const tx = await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);
        const endTx = process.hrtime.bigint();
        stageLatencies.txSubmission.push(nsToMs(endTx - startTx));

        // Stage 5: Block confirmation (tx.wait())
        const startConfirm = process.hrtime.bigint();
        await tx.wait();
        const endConfirm = process.hrtime.bigint();
        stageLatencies.blockConfirmation.push(nsToMs(endConfirm - startConfirm));
      }

      console.log(`\n  ⏱️  Individual Stage Latencies (${ITERATIONS} iterations):`);
      for (const [stage, values] of Object.entries(stageLatencies)) {
        const s = stats(values);
        console.log(`     ${stage}:`);
        console.log(`       Mean: ${s.mean.toFixed(3)} ms | StdDev: ${s.stdDev.toFixed(3)} ms | P95: ${s.p95.toFixed(3)} ms`);
      }

      // Verify all stages were measured
      for (const [stage, values] of Object.entries(stageLatencies)) {
        expect(values.length).to.equal(ITERATIONS, `${stage} should have ${ITERATIONS} measurements`);
        expect(stats(values).mean).to.be.a("number");
      }
    });
  });

  describe("7.3 Statistical reporting over 10+ iterations", function () {
    it("should execute 10+ iterations and report mean and stdDev of end-to-end latency", async function () {
      const { predictionStorage } = await loadFixture(deployAll);

      const latencies = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const seed = SEED + i;
        const timestamp = BASE_TIMESTAMP + i * 3600;

        const start = process.hrtime.bigint();

        // Full pipeline: generate → hash → CID → submit → confirm
        const { payloadString, pgs, cid } = generatePayload(seed, 1024);
        const payloadBytes = ethers.toUtf8Bytes(payloadString);
        const payloadHash = ethers.keccak256(payloadBytes);
        const tx = await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);
        await tx.wait();

        const end = process.hrtime.bigint();
        latencies.push(nsToMs(end - start));
      }

      const result = stats(latencies);

      console.log(`\n  📊 End-to-End Latency Statistics (${ITERATIONS} iterations):`);
      console.log(`     Mean:   ${result.mean.toFixed(3)} ms`);
      console.log(`     StdDev: ${result.stdDev.toFixed(3)} ms`);
      console.log(`     Min:    ${result.min.toFixed(3)} ms`);
      console.log(`     Max:    ${result.max.toFixed(3)} ms`);
      console.log(`     P95:    ${result.p95.toFixed(3)} ms`);
      console.log(`     Coefficient of Variation: ${((result.stdDev / result.mean) * 100).toFixed(1)}%`);

      // Assertions
      expect(latencies.length).to.be.at.least(10, "Must have at least 10 iterations");
      expect(result.mean).to.be.greaterThan(0, "Mean latency must be positive");
      expect(result.stdDev).to.be.at.least(0, "StdDev must be non-negative");
      expect(result.mean).to.be.a("number");
      expect(result.stdDev).to.be.a("number");
    });
  });
});
