import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, canonicalJSON, SEED, PGS_THRESHOLD } from "./helpers/setup.js";

describe("Smart Contract Gas Consumption Analysis", function () {
  // ─── Deployment Gas Measurement ────────────────────────────────────────────

  describe("Deployment Gas Costs", function () {
    it("should measure and report deployment gas for PredictionStorage (criterion 4.1)", async function () {
      const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
      const tx = await PredictionStorage.deploy();
      const receipt = await tx.deploymentTransaction().wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ PredictionStorage deployment gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report deployment gas for EnergyTrading (criterion 4.2)", async function () {
      // EnergyTrading needs a PredictionStorage address
      const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
      const predictionStorage = await PredictionStorage.deploy();
      await predictionStorage.waitForDeployment();

      const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
      const tx = await EnergyTrading.deploy(await predictionStorage.getAddress());
      const receipt = await tx.deploymentTransaction().wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ EnergyTrading deployment gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report deployment gas for TradeDispute (criterion 4.3)", async function () {
      const [, , , arbiter] = await ethers.getSigners();

      const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
      const predictionStorage = await PredictionStorage.deploy();
      await predictionStorage.waitForDeployment();

      const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
      const energyTrading = await EnergyTrading.deploy(await predictionStorage.getAddress());
      await energyTrading.waitForDeployment();

      const TradeDispute = await ethers.getContractFactory("TradeDispute");
      const tx = await TradeDispute.deploy(
        await energyTrading.getAddress(),
        await predictionStorage.getAddress(),
        arbiter.address
      );
      const receipt = await tx.deploymentTransaction().wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ TradeDispute deployment gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });
  });

  // ─── Execution Gas Measurement ─────────────────────────────────────────────

  describe("Execution Gas Costs", function () {
    it("should measure and report execution gas for anchorForecast (criterion 4.4)", async function () {
      const { predictionStorage } = await loadFixture(deployAll);

      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000; // Above threshold

      const tx = await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ anchorForecast execution gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report execution gas for createTrade (criterion 4.5)", async function () {
      const { predictionStorage, energyTrading, seller } = await loadFixture(deployAll);

      // Anchor a forecast with PGS >= 1500 (required for createTrade)
      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000;

      await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

      // Create trade as seller
      const tx = await energyTrading.connect(seller).createTrade(
        timestamp,
        5000, // 5 MWh (scaled by 1000)
        ethers.parseEther("0.01") // price per MWh
      );
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ createTrade execution gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report execution gas for fillTrade (criterion 4.6)", async function () {
      const { predictionStorage, energyTrading, seller, buyer } = await loadFixture(deployAll);

      // Anchor a forecast with PGS >= 1500
      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000;

      await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

      // Create trade as seller
      await energyTrading.connect(seller).createTrade(
        timestamp,
        5000,
        ethers.parseEther("0.01")
      );

      // Fill trade as buyer with sufficient payment
      // totalCost = energyMWh * pricePerMWh / 1000 = 5000 * 0.01 ETH / 1000 = 0.05 ETH
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);

      const tx = await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ fillTrade execution gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report execution gas for raiseDispute (criterion 4.7)", async function () {
      const { predictionStorage, energyTrading, tradeDispute, seller, buyer } =
        await loadFixture(deployAll);

      // Full lifecycle: anchor → createTrade → fillTrade → raiseDispute
      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000;

      await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

      await energyTrading.connect(seller).createTrade(
        timestamp,
        5000,
        ethers.parseEther("0.01")
      );

      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });

      // Raise dispute as buyer
      const tx = await tradeDispute.connect(buyer).raiseDispute(0, "Forecast data was inaccurate");
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ raiseDispute execution gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });

    it("should measure and report execution gas for resolveDispute (criterion 4.8)", async function () {
      const { predictionStorage, energyTrading, tradeDispute, seller, buyer, arbiter } =
        await loadFixture(deployAll);

      // Full lifecycle: anchor → createTrade → fillTrade → raiseDispute → resolveDispute
      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000;

      await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);

      await energyTrading.connect(seller).createTrade(
        timestamp,
        5000,
        ethers.parseEther("0.01")
      );

      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });

      await tradeDispute.connect(buyer).raiseDispute(0, "Forecast data was inaccurate");

      // Resolve dispute as arbiter
      const tx = await tradeDispute.connect(arbiter).resolveDispute(0, true);
      const receipt = await tx.wait();

      const gasUsed = receipt.gasUsed;
      console.log(`\n  ⛽ resolveDispute execution gas: ${gasUsed.toString()} gas units`);

      expect(gasUsed).to.be.greaterThan(0);
    });
  });

  // ─── Gas Summary Table ─────────────────────────────────────────────────────

  describe("Gas Consumption Summary", function () {
    it("should report a complete gas consumption table for all operations", async function () {
      const gasResults = {};

      // --- Deployment Gas ---
      const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
      const psTx = await PredictionStorage.deploy();
      const psReceipt = await psTx.deploymentTransaction().wait();
      gasResults["PredictionStorage (deploy)"] = psReceipt.gasUsed;

      const psAddress = await psTx.getAddress();

      const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
      const etTx = await EnergyTrading.deploy(psAddress);
      const etReceipt = await etTx.deploymentTransaction().wait();
      gasResults["EnergyTrading (deploy)"] = etReceipt.gasUsed;

      const etAddress = await etTx.getAddress();

      const [, seller, buyer, arbiter] = await ethers.getSigners();

      const TradeDispute = await ethers.getContractFactory("TradeDispute");
      const tdTx = await TradeDispute.deploy(etAddress, psAddress, arbiter.address);
      const tdReceipt = await tdTx.deploymentTransaction().wait();
      gasResults["TradeDispute (deploy)"] = tdReceipt.gasUsed;

      // --- Execution Gas (full lifecycle) ---
      const predictionStorage = psTx;
      const energyTrading = etTx;
      const tradeDispute = tdTx;

      // 1. anchorForecast
      const timestamp = 1573300800;
      const { payloadHash, cid } = generatePayload(SEED, 1024);
      const pgs = 2000;

      const anchorTx = await predictionStorage.anchorForecast(timestamp, payloadHash, cid, pgs);
      const anchorReceipt = await anchorTx.wait();
      gasResults["anchorForecast"] = anchorReceipt.gasUsed;

      // 2. createTrade
      const createTx = await energyTrading.connect(seller).createTrade(
        timestamp,
        5000,
        ethers.parseEther("0.01")
      );
      const createReceipt = await createTx.wait();
      gasResults["createTrade"] = createReceipt.gasUsed;

      // 3. fillTrade
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      const fillTx = await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });
      const fillReceipt = await fillTx.wait();
      gasResults["fillTrade"] = fillReceipt.gasUsed;

      // 4. raiseDispute
      const disputeTx = await tradeDispute.connect(buyer).raiseDispute(0, "Forecast data was inaccurate");
      const disputeReceipt = await disputeTx.wait();
      gasResults["raiseDispute"] = disputeReceipt.gasUsed;

      // 5. resolveDispute
      const resolveTx = await tradeDispute.connect(arbiter).resolveDispute(0, true);
      const resolveReceipt = await resolveTx.wait();
      gasResults["resolveDispute"] = resolveReceipt.gasUsed;

      // --- Print Summary Table ---
      console.log("\n  ┌─────────────────────────────────────────────────────────────────┐");
      console.log("  │           Gas Consumption Summary (Requirement 4)              │");
      console.log("  ├───────────────────────────────┬─────────────────┬──────────────┤");
      console.log("  │ Operation                     │ Gas Used        │ ETH @ 30gwei │");
      console.log("  ├───────────────────────────────┼─────────────────┼──────────────┤");

      for (const [operation, gas] of Object.entries(gasResults)) {
        const gasStr = gas.toString().padStart(15);
        const ethCost = (Number(gas) * 30 / 1e9).toFixed(6);
        const opStr = operation.padEnd(29);
        console.log(`  │ ${opStr} │ ${gasStr} │ ${ethCost} │`);
      }

      console.log("  └───────────────────────────────┴─────────────────┴──────────────┘");

      // Verify all gas values were captured
      expect(Object.keys(gasResults).length).to.equal(8);
      for (const gas of Object.values(gasResults)) {
        expect(gas).to.be.greaterThan(0);
      }
    });
  });
});
