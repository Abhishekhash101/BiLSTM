import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, stats, SEED, PGS_THRESHOLD } from "./helpers/setup.js";

describe("Throughput Stress Tests", function () {
  this.timeout(120000);

  const BASE_TIMESTAMP = 1_600_000_000;
  const TOTAL_FORECAST_TXS = 500;
  const SIGNER_COUNT = 10;
  const TXS_PER_SIGNER = TOTAL_FORECAST_TXS / SIGNER_COUNT; // 50
  const TRADE_COUNT = 100;

  // ─── 500 Concurrent Forecast Anchoring (Criteria 9.1, 9.2, 9.3, 9.5) ──────

  describe("Forecast Anchoring Throughput", function () {
    it("should submit 500 concurrent forecast anchoring txs via 10 signers and measure TPS", async function () {
      const { predictionStorage, signers } = await loadFixture(deployAll);

      // Use 10 signers from the signers array
      const selectedSigners = signers.slice(0, SIGNER_COUNT);
      expect(selectedSigners.length).to.equal(SIGNER_COUNT);

      // Build all 500 transactions with unique timestamps and payload hashes
      const txPromises = [];
      const startTime = performance.now();

      for (let signerIdx = 0; signerIdx < SIGNER_COUNT; signerIdx++) {
        const signer = selectedSigners[signerIdx];
        for (let j = 0; j < TXS_PER_SIGNER; j++) {
          const i = signerIdx * TXS_PER_SIGNER + j;
          const timestamp = BASE_TIMESTAMP + i; // unique timestamp per tx (criterion 9.2)
          const { payloadHash, cid, pgs } = generatePayload(SEED + i, 1024); // unique hash per tx (criterion 9.2)

          txPromises.push(
            predictionStorage
              .connect(signer)
              .anchorForecast(timestamp, payloadHash, cid, Math.min(pgs, 10000))
              .then((tx) => tx.wait())
              .then((receipt) => ({ status: "fulfilled", receipt }))
              .catch((err) => ({ status: "rejected", reason: err }))
          );
        }
      }

      // Submit all concurrently via Promise.allSettled pattern
      const results = await Promise.all(txPromises);

      const endTime = performance.now();
      const totalElapsedMs = endTime - startTime;
      const totalElapsedSec = totalElapsedMs / 1000;

      // Separate successful from reverted txs (criterion 9.5)
      const confirmed = results.filter((r) => r.status === "fulfilled");
      const reverted = results.filter((r) => r.status === "rejected");

      // Compute gas stats for confirmed transactions
      const gasValues = confirmed.map((r) => Number(r.receipt.gasUsed));
      const gasStats = stats(gasValues);

      // TPS = confirmed tx count / elapsed seconds (criterion 9.5: exclude reverted)
      const tps = parseFloat((confirmed.length / totalElapsedSec).toFixed(2));

      // ─── Report (criterion 9.3) ───────────────────────────────────────────
      console.log("\n  ┌───────────────────────────────────────────────────────────────┐");
      console.log("  │       Forecast Anchoring Throughput (500 txs, 10 signers)     │");
      console.log("  ├───────────────────────────────┬─────────────────────────────────┤");
      console.log(`  │ Total Transactions Submitted   │ ${TOTAL_FORECAST_TXS}                             │`);
      console.log(`  │ Confirmed Transactions         │ ${String(confirmed.length).padEnd(31)} │`);
      console.log(`  │ Reverted Transactions          │ ${String(reverted.length).padEnd(31)} │`);
      console.log(`  │ Total Elapsed Time (s)         │ ${totalElapsedSec.toFixed(4).padEnd(31)} │`);
      console.log(`  │ Average Gas per Tx             │ ${gasStats.mean.toFixed(0).padEnd(31)} │`);
      console.log(`  │ TPS (confirmed only)           │ ${tps.toFixed(2).padEnd(31)} │`);
      console.log("  └───────────────────────────────┴─────────────────────────────────┘");

      // Assertions
      expect(confirmed.length).to.be.greaterThan(0, "At least some transactions should confirm");
      expect(gasStats.mean).to.be.greaterThan(0, "Average gas should be positive");
      expect(tps).to.be.greaterThan(0, "TPS should be positive");
    });
  });

  // ─── 100 Concurrent Trade Lifecycle Pairs (Criterion 9.4, 9.5) ────────────

  describe("Trade Lifecycle Throughput", function () {
    it("should submit 100 concurrent trade lifecycle pairs (createTrade + fillTrade) and measure throughput", async function () {
      const { predictionStorage, energyTrading, signers } = await loadFixture(deployAll);

      // Use first signer to anchor all forecasts, remaining signers for trades
      const anchorSigner = signers[0];
      const tradeSellers = signers.slice(1, 6); // 5 sellers
      const tradeBuyers = signers.slice(6, 11); // 5 buyers

      // Step 1: Anchor 100 forecasts with PGS >= PGS_THRESHOLD (prerequisite for createTrade)
      const TRADE_BASE_TIMESTAMP = BASE_TIMESTAMP + 10000; // avoid collision with forecast test
      const anchorPromises = [];

      for (let i = 0; i < TRADE_COUNT; i++) {
        const timestamp = TRADE_BASE_TIMESTAMP + i;
        const { payloadHash, cid } = generatePayload(SEED + 1000 + i, 1024);
        // Ensure PGS >= PGS_THRESHOLD for trade eligibility
        const pgs = PGS_THRESHOLD + 500;

        anchorPromises.push(
          predictionStorage
            .connect(anchorSigner)
            .anchorForecast(timestamp, payloadHash, cid, pgs)
            .then((tx) => tx.wait())
        );
      }

      await Promise.all(anchorPromises);

      // Step 2: Submit 100 createTrade calls concurrently
      const createStartTime = performance.now();
      const createPromises = [];

      for (let i = 0; i < TRADE_COUNT; i++) {
        const timestamp = TRADE_BASE_TIMESTAMP + i;
        const seller = tradeSellers[i % tradeSellers.length];

        createPromises.push(
          energyTrading
            .connect(seller)
            .createTrade(timestamp, 5000, ethers.parseEther("0.001"))
            .then((tx) => tx.wait())
            .then((receipt) => ({ status: "fulfilled", receipt, tradeId: i }))
            .catch((err) => ({ status: "rejected", reason: err, tradeId: i }))
        );
      }

      const createResults = await Promise.all(createPromises);
      const createEndTime = performance.now();

      const confirmedCreates = createResults.filter((r) => r.status === "fulfilled");
      const revertedCreates = createResults.filter((r) => r.status === "rejected");

      // Step 3: Submit 100 fillTrade calls concurrently (different signer than seller)
      // totalCost = energyMWh * pricePerMWh / 1000 = 5000 * 0.001 ETH / 1000 = 0.005 ETH
      const totalCost = BigInt(5000) * ethers.parseEther("0.001") / BigInt(1000);

      const fillStartTime = performance.now();
      const fillPromises = [];

      for (let i = 0; i < TRADE_COUNT; i++) {
        // Only attempt to fill if the corresponding createTrade succeeded
        const createResult = createResults[i];
        if (createResult.status !== "fulfilled") {
          fillPromises.push(
            Promise.resolve({ status: "rejected", reason: "createTrade failed", tradeId: i })
          );
          continue;
        }

        // Buyer must be different signer than seller
        const buyer = tradeBuyers[i % tradeBuyers.length];

        fillPromises.push(
          energyTrading
            .connect(buyer)
            .fillTrade(i, { value: totalCost })
            .then((tx) => tx.wait())
            .then((receipt) => ({ status: "fulfilled", receipt, tradeId: i }))
            .catch((err) => ({ status: "rejected", reason: err, tradeId: i }))
        );
      }

      const fillResults = await Promise.all(fillPromises);
      const fillEndTime = performance.now();

      const confirmedFills = fillResults.filter((r) => r.status === "fulfilled");
      const revertedFills = fillResults.filter((r) => r.status === "rejected");

      // Compute metrics
      const totalElapsedMs = fillEndTime - createStartTime;
      const totalElapsedSec = totalElapsedMs / 1000;

      // Total confirmed lifecycle txs (create + fill that succeeded)
      const totalConfirmed = confirmedCreates.length + confirmedFills.length;
      const totalReverted = revertedCreates.length + revertedFills.length;

      // Gas stats for all confirmed txs
      const allGasValues = [
        ...confirmedCreates.map((r) => Number(r.receipt.gasUsed)),
        ...confirmedFills.map((r) => Number(r.receipt.gasUsed)),
      ];
      const gasStatsAll = stats(allGasValues);

      // TPS = confirmed tx count / total elapsed seconds (criterion 9.5)
      const tradeTps = parseFloat((totalConfirmed / totalElapsedSec).toFixed(2));

      // ─── Report (criterion 9.3) ───────────────────────────────────────────
      console.log("\n  ┌───────────────────────────────────────────────────────────────┐");
      console.log("  │       Trade Lifecycle Throughput (100 pairs)                  │");
      console.log("  ├───────────────────────────────┬─────────────────────────────────┤");
      console.log(`  │ Trade Pairs Submitted          │ ${String(TRADE_COUNT).padEnd(31)} │`);
      console.log(`  │ Confirmed createTrade          │ ${String(confirmedCreates.length).padEnd(31)} │`);
      console.log(`  │ Reverted createTrade           │ ${String(revertedCreates.length).padEnd(31)} │`);
      console.log(`  │ Confirmed fillTrade            │ ${String(confirmedFills.length).padEnd(31)} │`);
      console.log(`  │ Reverted fillTrade             │ ${String(revertedFills.length).padEnd(31)} │`);
      console.log(`  │ Total Confirmed Txs            │ ${String(totalConfirmed).padEnd(31)} │`);
      console.log(`  │ Total Reverted Txs             │ ${String(totalReverted).padEnd(31)} │`);
      console.log(`  │ Total Elapsed Time (s)         │ ${totalElapsedSec.toFixed(4).padEnd(31)} │`);
      console.log(`  │ Average Gas per Tx             │ ${gasStatsAll.mean.toFixed(0).padEnd(31)} │`);
      console.log(`  │ Trade TPS (confirmed only)     │ ${tradeTps.toFixed(2).padEnd(31)} │`);
      console.log("  └───────────────────────────────┴─────────────────────────────────┘");

      // Assertions
      expect(confirmedCreates.length).to.be.greaterThan(0, "At least some createTrade should confirm");
      expect(confirmedFills.length).to.be.greaterThan(0, "At least some fillTrade should confirm");
      expect(tradeTps).to.be.greaterThan(0, "Trade TPS should be positive");
    });
  });
});
