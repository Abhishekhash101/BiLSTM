import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, canonicalJSON, SEED, PGS_THRESHOLD } from "./helpers/setup.js";

describe("Requirement 5: Gating Logic Execution Cost", function () {
  // Anchored forecast timestamp and payload setup
  const ANCHORED_TIMESTAMP = 1573300800; // 2019-11-09 06:00 UTC
  const UNANCHORED_TIMESTAMP = 9999999999; // Never anchored
  const ETH_TRANSFER_BASELINE = 21000n;

  async function deployAndAnchor() {
    const deployment = await deployAll();
    const { predictionStorage, energyTrading, owner } = deployment;

    // Generate a payload with PGS >= 1500
    const payload = generatePayload(SEED, 100);
    const pgsAboveThreshold = 1800; // Explicitly above PGS_THRESHOLD (1500)
    const cid = payload.cid;
    const payloadHash = payload.payloadHash;

    // Anchor forecast with PGS >= 1500
    await predictionStorage.anchorForecast(
      ANCHORED_TIMESTAMP,
      payloadHash,
      cid,
      pgsAboveThreshold
    );

    return { ...deployment, pgsAboveThreshold };
  }

  describe("5.1 - isEligible gas with anchored forecast (PGS >= 1500)", function () {
    it("Should measure gas for isEligible call with PGS >= 1500", async function () {
      const { energyTrading } = await loadFixture(deployAndAnchor);

      // isEligible is a view function, use estimateGas to measure cost
      const gasUsed = await energyTrading.isEligible.estimateGas(ANCHORED_TIMESTAMP);

      // Verify it actually returns true (eligible)
      const eligible = await energyTrading.isEligible(ANCHORED_TIMESTAMP);
      expect(eligible).to.be.true;

      console.log(`\n  ⛽ Gating Logic Cost — isEligible (PGS >= 1500):`);
      console.log(`     Gas consumed: ${gasUsed.toString()} gas units`);
      console.log(`     Forecast timestamp: ${ANCHORED_TIMESTAMP}`);
      console.log(`     Result: eligible = true`);
    });
  });

  describe("5.2 - createTrade gas and PGS cross-contract call overhead", function () {
    it("Should measure createTrade gas and compute cross-contract PGS overhead", async function () {
      const { energyTrading, seller } = await loadFixture(deployAndAnchor);

      // Measure total gas for createTrade (internally calls getPGS cross-contract)
      const tx = await energyTrading.connect(seller).createTrade(
        ANCHORED_TIMESTAMP,
        5000, // energyMWh
        ethers.parseEther("0.01") // pricePerMWh
      );
      const receipt = await tx.wait();
      const createTradeGas = receipt.gasUsed;

      // Estimate isEligible gas as a proxy for the getPGS cross-contract read cost
      const isEligibleGas = await energyTrading.isEligible.estimateGas(ANCHORED_TIMESTAMP);

      // The overhead attributable to the cross-contract PGS call is approximated
      // by the isEligible gas (which itself reads getPGS from PredictionStorage)
      // Baseline storage cost = createTrade total - cross-contract read overhead
      const crossContractOverhead = isEligibleGas;
      const baseStorageCost = createTradeGas - crossContractOverhead;

      console.log(`\n  ⛽ Gating Logic Cost — createTrade gas breakdown:`);
      console.log(`     Total createTrade gas: ${createTradeGas.toString()} gas units`);
      console.log(`     Estimated getPGS cross-contract overhead: ${crossContractOverhead.toString()} gas units`);
      console.log(`     Baseline storage write cost (total - overhead): ${baseStorageCost.toString()} gas units`);
    });
  });

  describe("5.3 - Gated createTrade vs 21000 gas baseline overhead", function () {
    it("Should compare gated createTrade cost against 21000 gas and report overhead percentage", async function () {
      const { energyTrading, seller } = await loadFixture(deployAndAnchor);

      // Measure createTrade gas
      const tx = await energyTrading.connect(seller).createTrade(
        ANCHORED_TIMESTAMP,
        5000, // energyMWh
        ethers.parseEther("0.01") // pricePerMWh
      );
      const receipt = await tx.wait();
      const gatedGas = receipt.gasUsed;

      // Compute overhead percentage: ((gated_gas - 21000) / 21000) * 100
      const overheadPct = (Number(gatedGas - ETH_TRANSFER_BASELINE) / Number(ETH_TRANSFER_BASELINE)) * 100;
      const overheadRounded = Math.round(overheadPct * 100) / 100; // Round to 2 decimal places

      console.log(`\n  ⛽ Gating Logic Cost — Overhead vs ETH transfer baseline:`);
      console.log(`     Gated createTrade gas: ${gatedGas.toString()} gas units`);
      console.log(`     ETH transfer baseline: ${ETH_TRANSFER_BASELINE.toString()} gas units`);
      console.log(`     Overhead: ${overheadRounded.toFixed(2)}%`);

      // Sanity check: createTrade should cost more than a basic ETH transfer
      expect(gatedGas).to.be.greaterThan(ETH_TRANSFER_BASELINE);
    });
  });

  describe("5.4 - isEligible gas with unanchored timestamp (PGS = 0)", function () {
    it("Should measure gas for isEligible with unanchored timestamp and confirm returns false", async function () {
      const { energyTrading } = await loadFixture(deployAndAnchor);

      // isEligible on unanchored timestamp — PGS defaults to 0, should return false without revert
      const gasUsed = await energyTrading.isEligible.estimateGas(UNANCHORED_TIMESTAMP);

      // Verify it returns false (not eligible)
      const eligible = await energyTrading.isEligible(UNANCHORED_TIMESTAMP);
      expect(eligible).to.be.false;

      console.log(`\n  ⛽ Gating Logic Cost — isEligible (unanchored, PGS = 0):`);
      console.log(`     Gas consumed: ${gasUsed.toString()} gas units`);
      console.log(`     Forecast timestamp: ${UNANCHORED_TIMESTAMP} (not anchored)`);
      console.log(`     Result: eligible = false (no revert)`);
    });
  });
});
