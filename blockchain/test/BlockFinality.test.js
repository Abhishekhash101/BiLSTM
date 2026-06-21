import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, stats, SEED, PGS_THRESHOLD } from "./helpers/setup.js";

describe("Requirement 10: Block Finality and Consensus Delay Evaluation", function () {
  this.timeout(120000);

  const AUTOMINE_ITERATIONS = 50;
  const INTERVAL_ITERATIONS = 20;
  const MINING_INTERVALS = [1000, 3000, 5000]; // ms
  const BASE_TIMESTAMP = 1_700_000_000;

  /**
   * Convert BigInt nanoseconds to milliseconds (float).
   */
  function nsToMs(ns) {
    return Number(ns) / 1_000_000;
  }

  /**
   * Helper: anchor a forecast with PGS >= PGS_THRESHOLD and return the timestamp used.
   */
  async function anchorEligibleForecast(predictionStorage, signer, timestamp) {
    const { payloadHash, cid } = generatePayload(SEED + timestamp, 1024);
    const pgs = PGS_THRESHOLD + 500; // well above threshold
    await predictionStorage.connect(signer).anchorForecast(timestamp, payloadHash, cid, pgs);
    return timestamp;
  }

  /**
   * Helper: create a full trade lifecycle (anchor → createTrade → fillTrade → raiseDispute → resolveDispute).
   * Returns all IDs needed.
   */
  async function setupFullTradeLifecycle(predictionStorage, energyTrading, tradeDispute, seller, buyer, arbiter, baseTs) {
    // Anchor forecast
    await anchorEligibleForecast(predictionStorage, seller, baseTs);

    // Create trade
    const createTx = await energyTrading.connect(seller).createTrade(baseTs, 1000, ethers.parseEther("0.01"));
    const createReceipt = await createTx.wait();
    const tradeId = 0n; // first trade

    // Fill trade
    const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
    const fillTx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
    await fillTx.wait();

    // Raise dispute
    const disputeTx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Test dispute");
    await disputeTx.wait();

    return { tradeId, disputeId: 0n };
  }

  /**
   * Print formatted stats table for a set of measurements.
   */
  function printStats(label, measurements) {
    const s = stats(measurements);
    console.log(`     ${label}:`);
    console.log(`       Mean:   ${s.mean.toFixed(3)} ms`);
    console.log(`       Min:    ${s.min.toFixed(3)} ms`);
    console.log(`       Max:    ${s.max.toFixed(3)} ms`);
    console.log(`       StdDev: ${s.stdDev.toFixed(3)} ms`);
    return s;
  }

  describe("10.1 Time from function call initiation to transaction receipt", function () {
    it("should measure time from call initiation to receipt for each operation", async function () {
      const { predictionStorage, energyTrading, tradeDispute, seller, buyer, arbiter } = await loadFixture(deployAll);

      const latencies = [];

      for (let i = 0; i < 5; i++) {
        const ts = BASE_TIMESTAMP + i * 3600;
        const { payloadHash, cid } = generatePayload(SEED + i, 1024);
        const pgs = PGS_THRESHOLD + 500;

        const start = process.hrtime.bigint();
        const tx = await predictionStorage.anchorForecast(ts, payloadHash, cid, pgs);
        await tx.wait();
        const end = process.hrtime.bigint();

        latencies.push(nsToMs(end - start));
      }

      const s = stats(latencies);
      console.log(`\n  ⏱️  Call-to-Receipt Latency (sample, 5 ops):`);
      console.log(`     Mean: ${s.mean.toFixed(3)} ms | Min: ${s.min.toFixed(3)} ms | Max: ${s.max.toFixed(3)} ms`);

      expect(latencies.length).to.equal(5);
      expect(s.mean).to.be.greaterThan(0);
    });
  });

  describe("10.2 Finality latency per contract operation type", function () {
    it("should measure finality latency for anchorForecast, createTrade, fillTrade, raiseDispute, resolveDispute", async function () {
      const { predictionStorage, energyTrading, tradeDispute, owner, seller, buyer, arbiter } = await loadFixture(deployAll);

      const operationLatencies = {
        anchorForecast: [],
        createTrade: [],
        fillTrade: [],
        raiseDispute: [],
        resolveDispute: []
      };

      // We need to run a few of each to demonstrate measurement per type
      const sampleSize = 5;

      for (let i = 0; i < sampleSize; i++) {
        const ts = BASE_TIMESTAMP + (i + 100) * 3600;
        const { payloadHash, cid } = generatePayload(SEED + i + 100, 1024);
        const pgs = PGS_THRESHOLD + 500;

        // anchorForecast
        let start = process.hrtime.bigint();
        let tx = await predictionStorage.connect(seller).anchorForecast(ts, payloadHash, cid, pgs);
        await tx.wait();
        let end = process.hrtime.bigint();
        operationLatencies.anchorForecast.push(nsToMs(end - start));

        // createTrade
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.01"));
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.createTrade.push(nsToMs(end - start));

        const tradeId = BigInt(i);

        // fillTrade
        const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.fillTrade.push(nsToMs(end - start));

        // raiseDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Dispute reason");
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.raiseDispute.push(nsToMs(end - start));

        const disputeId = BigInt(i);

        // resolveDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(arbiter).resolveDispute(disputeId, true);
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.resolveDispute.push(nsToMs(end - start));
      }

      console.log(`\n  ⏱️  Finality Latency per Operation Type (${sampleSize} samples):`);
      for (const [op, values] of Object.entries(operationLatencies)) {
        printStats(op, values);
      }

      // Assertions
      for (const [op, values] of Object.entries(operationLatencies)) {
        expect(values.length).to.equal(sampleSize, `${op} should have ${sampleSize} measurements`);
        expect(stats(values).mean).to.be.greaterThan(0);
      }
    });
  });

  describe("10.3 Statistical reporting over 50+ transactions per operation type", function () {
    it("should execute 50+ transactions per operation and report mean, min, max, stdDev", async function () {
      const { predictionStorage, energyTrading, tradeDispute, owner, seller, buyer, arbiter } = await loadFixture(deployAll);

      const operationLatencies = {
        anchorForecast: [],
        createTrade: [],
        fillTrade: [],
        raiseDispute: [],
        resolveDispute: []
      };

      for (let i = 0; i < AUTOMINE_ITERATIONS; i++) {
        const ts = BASE_TIMESTAMP + (i + 200) * 3600;
        const { payloadHash, cid } = generatePayload(SEED + i + 200, 1024);
        const pgs = PGS_THRESHOLD + 500;

        // anchorForecast
        let start = process.hrtime.bigint();
        let tx = await predictionStorage.connect(seller).anchorForecast(ts, payloadHash, cid, pgs);
        await tx.wait();
        let end = process.hrtime.bigint();
        operationLatencies.anchorForecast.push(nsToMs(end - start));

        // createTrade
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.01"));
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.createTrade.push(nsToMs(end - start));

        const tradeId = BigInt(i);

        // fillTrade
        const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.fillTrade.push(nsToMs(end - start));

        // raiseDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Dispute reason");
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.raiseDispute.push(nsToMs(end - start));

        const disputeId = BigInt(i);

        // resolveDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(arbiter).resolveDispute(disputeId, true);
        await tx.wait();
        end = process.hrtime.bigint();
        operationLatencies.resolveDispute.push(nsToMs(end - start));
      }

      console.log(`\n  📊 Finality Statistics — Automine Mode (${AUTOMINE_ITERATIONS} iterations per operation):`);
      console.log(`  ${"─".repeat(75)}`);
      console.log(`  ${"Operation".padEnd(20)} ${"Mean (ms)".padEnd(12)} ${"Min (ms)".padEnd(12)} ${"Max (ms)".padEnd(12)} ${"StdDev (ms)".padEnd(12)}`);
      console.log(`  ${"─".repeat(75)}`);

      for (const [op, values] of Object.entries(operationLatencies)) {
        const s = stats(values);
        console.log(`  ${op.padEnd(20)} ${s.mean.toFixed(3).padEnd(12)} ${s.min.toFixed(3).padEnd(12)} ${s.max.toFixed(3).padEnd(12)} ${s.stdDev.toFixed(3).padEnd(12)}`);
      }
      console.log(`  ${"─".repeat(75)}`);

      // Assertions
      for (const [op, values] of Object.entries(operationLatencies)) {
        expect(values.length).to.be.at.least(50, `${op} must have at least 50 iterations`);
        const s = stats(values);
        expect(s.mean).to.be.greaterThan(0, `${op} mean must be positive`);
        expect(s.min).to.be.greaterThan(0, `${op} min must be positive`);
        expect(s.max).to.be.greaterThanOrEqual(s.min, `${op} max must be >= min`);
        expect(s.stdDev).to.be.at.least(0, `${op} stdDev must be non-negative`);
      }
    });
  });

  describe("10.4 Finality latency with evm_setIntervalMining", function () {
    this.timeout(300000); // 5 min for interval mining tests

    for (const interval of MINING_INTERVALS) {
      it(`should measure finality at ${interval}ms mining interval (20+ tx per operation)`, async function () {
        const { predictionStorage, energyTrading, tradeDispute, owner, seller, buyer, arbiter } = await loadFixture(deployAll);

        // Configure interval mining
        await ethers.provider.send("evm_setAutomine", [false]);
        await ethers.provider.send("evm_setIntervalMining", [interval]);

        const operationLatencies = {
          anchorForecast: [],
          createTrade: [],
          fillTrade: [],
          raiseDispute: [],
          resolveDispute: []
        };

        try {
          for (let i = 0; i < INTERVAL_ITERATIONS; i++) {
            const ts = BASE_TIMESTAMP + (i + 1000 + interval) * 3600;
            const { payloadHash, cid } = generatePayload(SEED + i + 1000 + interval, 1024);
            const pgs = PGS_THRESHOLD + 500;

            // anchorForecast
            let start = process.hrtime.bigint();
            let tx = await predictionStorage.connect(seller).anchorForecast(ts, payloadHash, cid, pgs);
            await tx.wait();
            let end = process.hrtime.bigint();
            operationLatencies.anchorForecast.push(nsToMs(end - start));

            // createTrade
            start = process.hrtime.bigint();
            tx = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.01"));
            await tx.wait();
            end = process.hrtime.bigint();
            operationLatencies.createTrade.push(nsToMs(end - start));

            const tradeId = BigInt(i);

            // fillTrade
            const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
            start = process.hrtime.bigint();
            tx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
            await tx.wait();
            end = process.hrtime.bigint();
            operationLatencies.fillTrade.push(nsToMs(end - start));

            // raiseDispute
            start = process.hrtime.bigint();
            tx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Dispute reason");
            await tx.wait();
            end = process.hrtime.bigint();
            operationLatencies.raiseDispute.push(nsToMs(end - start));

            const disputeId = BigInt(i);

            // resolveDispute
            start = process.hrtime.bigint();
            tx = await tradeDispute.connect(arbiter).resolveDispute(disputeId, true);
            await tx.wait();
            end = process.hrtime.bigint();
            operationLatencies.resolveDispute.push(nsToMs(end - start));
          }
        } finally {
          // Reset to automine
          await ethers.provider.send("evm_setIntervalMining", [0]);
          await ethers.provider.send("evm_setAutomine", [true]);
        }

        console.log(`\n  ⏱️  Finality Latency @ ${interval}ms Interval Mining (${INTERVAL_ITERATIONS} iterations):`);
        console.log(`  ${"─".repeat(75)}`);
        console.log(`  ${"Operation".padEnd(20)} ${"Mean (ms)".padEnd(12)} ${"Min (ms)".padEnd(12)} ${"Max (ms)".padEnd(12)} ${"StdDev (ms)".padEnd(12)}`);
        console.log(`  ${"─".repeat(75)}`);

        for (const [op, values] of Object.entries(operationLatencies)) {
          const s = stats(values);
          console.log(`  ${op.padEnd(20)} ${s.mean.toFixed(3).padEnd(12)} ${s.min.toFixed(3).padEnd(12)} ${s.max.toFixed(3).padEnd(12)} ${s.stdDev.toFixed(3).padEnd(12)}`);
        }
        console.log(`  ${"─".repeat(75)}`);

        // Assertions
        for (const [op, values] of Object.entries(operationLatencies)) {
          expect(values.length).to.be.at.least(20, `${op} must have at least 20 iterations at ${interval}ms interval`);
          const s = stats(values);
          expect(s.mean).to.be.greaterThan(0, `${op} mean must be positive`);
        }
      });
    }
  });

  describe("10.5 Absolute and percentage increase vs automine mode", function () {
    this.timeout(300000); // 5 min for interval mining comparisons

    it("should report absolute increase and percentage change vs automine for each interval", async function () {
      const { predictionStorage, energyTrading, tradeDispute, owner, seller, buyer, arbiter } = await loadFixture(deployAll);

      const automineLatencies = {
        anchorForecast: [],
        createTrade: [],
        fillTrade: [],
        raiseDispute: [],
        resolveDispute: []
      };

      // Measure automine baseline (20 iterations for comparison)
      const comparisonIterations = 20;

      for (let i = 0; i < comparisonIterations; i++) {
        const ts = BASE_TIMESTAMP + (i + 5000) * 3600;
        const { payloadHash, cid } = generatePayload(SEED + i + 5000, 1024);
        const pgs = PGS_THRESHOLD + 500;

        // anchorForecast
        let start = process.hrtime.bigint();
        let tx = await predictionStorage.connect(seller).anchorForecast(ts, payloadHash, cid, pgs);
        await tx.wait();
        let end = process.hrtime.bigint();
        automineLatencies.anchorForecast.push(nsToMs(end - start));

        // createTrade
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.01"));
        await tx.wait();
        end = process.hrtime.bigint();
        automineLatencies.createTrade.push(nsToMs(end - start));

        const tradeId = BigInt(i);

        // fillTrade
        const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
        start = process.hrtime.bigint();
        tx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
        await tx.wait();
        end = process.hrtime.bigint();
        automineLatencies.fillTrade.push(nsToMs(end - start));

        // raiseDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Dispute reason");
        await tx.wait();
        end = process.hrtime.bigint();
        automineLatencies.raiseDispute.push(nsToMs(end - start));

        const disputeId = BigInt(i);

        // resolveDispute
        start = process.hrtime.bigint();
        tx = await tradeDispute.connect(arbiter).resolveDispute(disputeId, true);
        await tx.wait();
        end = process.hrtime.bigint();
        automineLatencies.resolveDispute.push(nsToMs(end - start));
      }

      // Compute automine baselines
      const automineBaselines = {};
      for (const [op, values] of Object.entries(automineLatencies)) {
        automineBaselines[op] = stats(values).mean;
      }

      console.log(`\n  📊 Automine Baseline Latencies (${comparisonIterations} iterations):`);
      for (const [op, mean] of Object.entries(automineBaselines)) {
        console.log(`     ${op}: ${mean.toFixed(3)} ms`);
      }

      // Track the next trade/dispute IDs across intervals
      let nextTradeIdx = comparisonIterations;
      let nextDisputeIdx = comparisonIterations;

      // Now test each interval and compare
      for (const interval of MINING_INTERVALS) {
        const intervalLatencies = {
          anchorForecast: [],
          createTrade: [],
          fillTrade: [],
          raiseDispute: [],
          resolveDispute: []
        };

        // Configure interval mining
        await ethers.provider.send("evm_setAutomine", [false]);
        await ethers.provider.send("evm_setIntervalMining", [interval]);

        try {
          // Use reduced sample for comparison test (5 per operation to keep total time manageable)
          const sampleSize = 5;

          for (let i = 0; i < sampleSize; i++) {
            const ts = BASE_TIMESTAMP + (nextTradeIdx + 6000) * 3600;
            const { payloadHash, cid } = generatePayload(SEED + nextTradeIdx + 6000, 1024);
            const pgs = PGS_THRESHOLD + 500;

            // anchorForecast
            let start = process.hrtime.bigint();
            let tx = await predictionStorage.connect(seller).anchorForecast(ts, payloadHash, cid, pgs);
            await tx.wait();
            let end = process.hrtime.bigint();
            intervalLatencies.anchorForecast.push(nsToMs(end - start));

            // createTrade
            start = process.hrtime.bigint();
            tx = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.01"));
            await tx.wait();
            end = process.hrtime.bigint();
            intervalLatencies.createTrade.push(nsToMs(end - start));

            const tradeId = BigInt(nextTradeIdx);

            // fillTrade
            const totalCost = (1000n * ethers.parseEther("0.01")) / 1000n;
            start = process.hrtime.bigint();
            tx = await energyTrading.connect(buyer).fillTrade(tradeId, { value: totalCost });
            await tx.wait();
            end = process.hrtime.bigint();
            intervalLatencies.fillTrade.push(nsToMs(end - start));

            // raiseDispute
            start = process.hrtime.bigint();
            tx = await tradeDispute.connect(seller).raiseDispute(tradeId, "Dispute reason");
            await tx.wait();
            end = process.hrtime.bigint();
            intervalLatencies.raiseDispute.push(nsToMs(end - start));

            const disputeId = BigInt(nextDisputeIdx);

            // resolveDispute
            start = process.hrtime.bigint();
            tx = await tradeDispute.connect(arbiter).resolveDispute(disputeId, true);
            await tx.wait();
            end = process.hrtime.bigint();
            intervalLatencies.resolveDispute.push(nsToMs(end - start));

            nextTradeIdx++;
            nextDisputeIdx++;
          }
        } finally {
          // Reset to automine
          await ethers.provider.send("evm_setIntervalMining", [0]);
          await ethers.provider.send("evm_setAutomine", [true]);
        }

        // Report comparison
        console.log(`\n  📈 Finality Increase @ ${interval}ms vs Automine:`);
        console.log(`  ${"─".repeat(80)}`);
        console.log(`  ${"Operation".padEnd(20)} ${"Automine (ms)".padEnd(15)} ${"Interval (ms)".padEnd(15)} ${"Δ Abs (ms)".padEnd(12)} ${"Δ %".padEnd(10)}`);
        console.log(`  ${"─".repeat(80)}`);

        for (const [op, values] of Object.entries(intervalLatencies)) {
          const intervalMean = stats(values).mean;
          const autoMineMean = automineBaselines[op];
          const absoluteIncrease = intervalMean - autoMineMean;
          const percentageChange = autoMineMean > 0 ? ((absoluteIncrease / autoMineMean) * 100) : 0;

          console.log(
            `  ${op.padEnd(20)} ${autoMineMean.toFixed(3).padEnd(15)} ${intervalMean.toFixed(3).padEnd(15)} ${absoluteIncrease.toFixed(3).padEnd(12)} ${percentageChange.toFixed(2).padEnd(10)}%`
          );
        }
        console.log(`  ${"─".repeat(80)}`);
      }

      // Assertions
      for (const [op, mean] of Object.entries(automineBaselines)) {
        expect(mean).to.be.greaterThan(0, `${op} automine baseline must be positive`);
      }
    });
  });
});
