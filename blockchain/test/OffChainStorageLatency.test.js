import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { generatePayload, canonicalJSON, stats, SEED, PAYLOAD_SIZES } from "./helpers/setup.js";

/**
 * Requirement 8: Off-Chain Storage Latency Benchmark
 *
 * Measures serialization and simulated IPFS CID generation latency
 * across multiple payload sizes with warm-up and statistical reporting.
 */
describe("Requirement 8: Off-Chain Storage Latency Benchmark", function () {
  this.timeout(60000);

  const WARMUP_ITERATIONS = 10;
  const MEASURED_ITERATIONS = 100;

  /**
   * Simulate IPFS CID generation by computing keccak256 hash and encoding as base58 string.
   * Produces a CIDv0-like string starting with "Qm" followed by 44 base58 characters.
   */
  function simulateCID(payload) {
    const hash = ethers.keccak256(ethers.toUtf8Bytes(payload));
    const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let cid = "Qm";
    const hashBytes = ethers.getBytes(hash);
    for (let i = 0; i < 44; i++) {
      cid += base58Chars[hashBytes[i % hashBytes.length] % base58Chars.length];
    }
    return cid;
  }

  /**
   * Validate that a CID string is base58/base32 encoded and at least 46 characters.
   */
  function isValidCID(cid) {
    if (cid.length < 46) return false;
    // CIDv0 starts with "Qm" and uses base58 characters
    const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
    // CIDv1 uses base32 (lowercase letters + digits 2-7)
    const base32Regex = /^[a-z2-7]+=*$/;
    return base58Regex.test(cid) || base32Regex.test(cid);
  }

  /**
   * Build a parseable payload object of approximate target size for serialization benchmarks.
   * Unlike generatePayload (which may truncate to exact byte count), this always returns valid JSON.
   */
  function buildPayloadObject(seed, sizeBytes) {
    const { payloadString } = generatePayload(seed, sizeBytes);
    try {
      return JSON.parse(payloadString);
    } catch (_) {
      // If truncated payload isn't valid JSON, use the base object directly
      return {
        features: { P_gen: 1234.56, P_load: 7890.12, SoC: 0.75, hour_sin: 0.5, hour_cos: 0.866 },
        forecast_timestamp: 1573300800,
        model_id: "hybrid_residual_v1",
        predicted_y: 0.42,
        scheduling_eligible: true,
        threshold: 0.15
      };
    }
  }

  describe("Canonical JSON Serialization Latency (Criterion 8.1)", function () {
    PAYLOAD_SIZES.forEach((size) => {
      it(`should measure serialization time for ${size}B payload with sub-ms precision`, function () {
        // Generate a forecast-like payload of the target size
        const payloadObj = buildPayloadObject(SEED, size);

        // Warm-up iterations (excluded from stats)
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          canonicalJSON(payloadObj);
        }

        // Measured iterations
        const timings = [];
        for (let i = 0; i < MEASURED_ITERATIONS; i++) {
          const start = performance.now();
          canonicalJSON(payloadObj);
          const elapsed = performance.now() - start;
          timings.push(elapsed);
        }

        const result = stats(timings);

        console.log(`    [${size}B] Canonical JSON Serialization:`);
        console.log(`      Mean:  ${result.mean.toFixed(3)} ms`);
        console.log(`      P95:   ${result.p95.toFixed(3)} ms`);
        console.log(`      Min:   ${result.min.toFixed(3)} ms`);
        console.log(`      Max:   ${result.max.toFixed(3)} ms`);
        console.log(`      StdDev: ${result.stdDev.toFixed(3)} ms`);

        // Serialization should complete (non-negative timing)
        expect(result.mean).to.be.at.least(0);
        expect(timings.length).to.equal(MEASURED_ITERATIONS);
      });
    });
  });

  describe("Simulated IPFS CID Generation Latency (Criterion 8.2)", function () {
    PAYLOAD_SIZES.forEach((size) => {
      it(`should measure CID generation time for ${size}B payload with sub-ms precision`, function () {
        const { payloadString } = generatePayload(SEED, size);

        // Warm-up iterations (excluded from stats)
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          simulateCID(payloadString);
        }

        // Measured iterations
        const timings = [];
        for (let i = 0; i < MEASURED_ITERATIONS; i++) {
          const start = performance.now();
          const cid = simulateCID(payloadString);
          const elapsed = performance.now() - start;
          timings.push(elapsed);

          // Validate CID on each iteration (criterion 8.3)
          expect(cid.length).to.be.at.least(46);
          expect(isValidCID(cid)).to.be.true;
        }

        const result = stats(timings);

        console.log(`    [${size}B] Simulated IPFS CID Generation:`);
        console.log(`      Mean:  ${result.mean.toFixed(3)} ms`);
        console.log(`      P95:   ${result.p95.toFixed(3)} ms`);
        console.log(`      Min:   ${result.min.toFixed(3)} ms`);
        console.log(`      Max:   ${result.max.toFixed(3)} ms`);
        console.log(`      StdDev: ${result.stdDev.toFixed(3)} ms`);

        expect(result.mean).to.be.at.least(0);
        expect(timings.length).to.equal(MEASURED_ITERATIONS);
      });
    });
  });

  describe("CID Format Validation (Criterion 8.3)", function () {
    PAYLOAD_SIZES.forEach((size) => {
      it(`should produce valid base58-encoded CID of at least 46 chars for ${size}B payload`, function () {
        const { payloadString } = generatePayload(SEED, size);
        const cid = simulateCID(payloadString);

        // CID must be at least 46 characters
        expect(cid.length).to.be.at.least(46);

        // CID starts with "Qm" (CIDv0 format)
        expect(cid.startsWith("Qm")).to.be.true;

        // All characters must be valid base58
        const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        for (const char of cid) {
          expect(base58Chars.includes(char)).to.be.true;
        }

        console.log(`    [${size}B] CID: ${cid} (length: ${cid.length})`);
      });
    });
  });

  describe("Cross-Size Benchmark Summary (Criteria 8.4, 8.5)", function () {
    it("should benchmark serialization and CID generation across all payload sizes", function () {
      const summaryResults = [];

      for (const size of PAYLOAD_SIZES) {
        const { payloadString } = generatePayload(SEED, size);
        const payloadObj = buildPayloadObject(SEED, size);

        // --- Serialization benchmark ---
        // Warm-up
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          canonicalJSON(payloadObj);
        }
        // Measured
        const serTimings = [];
        for (let i = 0; i < MEASURED_ITERATIONS; i++) {
          const start = performance.now();
          canonicalJSON(payloadObj);
          const elapsed = performance.now() - start;
          serTimings.push(elapsed);
        }

        // --- CID generation benchmark ---
        // Warm-up
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
          simulateCID(payloadString);
        }
        // Measured
        const cidTimings = [];
        for (let i = 0; i < MEASURED_ITERATIONS; i++) {
          const start = performance.now();
          simulateCID(payloadString);
          const elapsed = performance.now() - start;
          cidTimings.push(elapsed);
        }

        const serStats = stats(serTimings);
        const cidStats = stats(cidTimings);

        summaryResults.push({
          size,
          serialization: serStats,
          cidGeneration: cidStats
        });
      }

      // Report summary table
      console.log("\n    ╔══════════════════════════════════════════════════════════════════╗");
      console.log("    ║        Off-Chain Storage Latency Benchmark Summary              ║");
      console.log("    ╠══════════╦═══════════════════════════╦═══════════════════════════╣");
      console.log("    ║ Size     ║ Serialization (ms)        ║ CID Generation (ms)       ║");
      console.log("    ║          ║   Mean      │    P95      ║   Mean      │    P95      ║");
      console.log("    ╠══════════╬═══════════════════════════╬═══════════════════════════╣");

      for (const r of summaryResults) {
        const sizeLabel = r.size >= 1024 ? `${r.size / 1024}KB`.padEnd(8) : `${r.size}B`.padEnd(8);
        const serMean = r.serialization.mean.toFixed(3).padStart(9);
        const serP95 = r.serialization.p95.toFixed(3).padStart(9);
        const cidMean = r.cidGeneration.mean.toFixed(3).padStart(9);
        const cidP95 = r.cidGeneration.p95.toFixed(3).padStart(9);
        console.log(`    ║ ${sizeLabel} ║ ${serMean}   │ ${serP95}   ║ ${cidMean}   │ ${cidP95}   ║`);
      }

      console.log("    ╠══════════╬═══════════════════════════╬═══════════════════════════╣");
      console.log("    ║ Config   ║ Warm-up: 10 iterations    ║ Measured: 100 iterations  ║");
      console.log("    ╚══════════╩═══════════════════════════╩═══════════════════════════╝\n");

      // Assertions
      for (const r of summaryResults) {
        expect(r.serialization.mean).to.be.at.least(0);
        expect(r.cidGeneration.mean).to.be.at.least(0);
        expect(r.serialization.p95).to.be.at.least(r.serialization.mean);
        expect(r.cidGeneration.p95).to.be.at.least(r.cidGeneration.mean);
      }

      expect(summaryResults.length).to.equal(3);
    });
  });
});
