import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("Oracle Pipeline Gas Benchmark", function () {
  let predictionStorage, energyTrading, tradeDispute;
  let owner, seller, buyer, arbiter;

  // Sample forecast payload (canonical JSON)
  const samplePayload = JSON.stringify({
    features: { P_gen: 4521.3, P_load: 11200.0, SoC: 0.72, hour_sin: 0.866, hour_cos: 0.5 },
    forecast_timestamp: 1573300800,
    model_id: "hybrid_residual_v1",
    predicted_y: 0.2134,
    scheduling_eligible: true,
    threshold: 0.15
  });

  const sampleCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

  beforeEach(async function () {
    [owner, seller, buyer, arbiter] = await ethers.getSigners();

    // Deploy PredictionStorage
    const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
    predictionStorage = await PredictionStorage.deploy();
    await predictionStorage.waitForDeployment();

    // Deploy EnergyTrading
    const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
    energyTrading = await EnergyTrading.deploy(await predictionStorage.getAddress());
    await energyTrading.waitForDeployment();

    // Deploy TradeDispute
    const TradeDispute = await ethers.getContractFactory("TradeDispute");
    tradeDispute = await TradeDispute.deploy(
      await energyTrading.getAddress(),
      await predictionStorage.getAddress(),
      arbiter.address
    );
    await tradeDispute.waitForDeployment();
  });

  describe("PredictionStorage", function () {
    it("Should anchor a forecast and measure gas", async function () {
      const timestamp = 1573300800; // 2019-11-09 06:00 UTC
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const payloadHash = ethers.keccak256(payloadBytes);
      const pgs = 2134; // round(10000 * 0.2134)

      const tx = await predictionStorage.anchorForecast(timestamp, payloadHash, sampleCid, pgs);
      const receipt = await tx.wait();

      console.log(`\n  ⛽ anchorForecast gas used: ${receipt.gasUsed.toString()}`);

      // Verify storage
      const record = await predictionStorage.forecasts(timestamp);
      expect(record.payloadHash).to.equal(payloadHash);
      expect(record.pgs).to.equal(pgs);
      expect(record.ipfsCid).to.equal(sampleCid);
    });

    it("Should verify a payload", async function () {
      const timestamp = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const payloadHash = ethers.keccak256(payloadBytes);

      await predictionStorage.anchorForecast(timestamp, payloadHash, sampleCid, 2134);

      const valid = await predictionStorage.verifyPayload(timestamp, payloadBytes);
      expect(valid).to.be.true;

      // Tampered payload should fail
      const tampered = ethers.toUtf8Bytes(samplePayload + " ");
      const invalid = await predictionStorage.verifyPayload(timestamp, tampered);
      expect(invalid).to.be.false;
    });

    it("Should benchmark batch anchoring (280 eligible hours)", async function () {
      const baseTimestamp = 1573300800;
      let totalGas = BigInt(0);

      for (let i = 0; i < 280; i++) {
        const ts = baseTimestamp + i * 3600;
        const payload = JSON.stringify({ ...JSON.parse(samplePayload), forecast_timestamp: ts, predicted_y: 0.15 + Math.random() * 0.15 });
        const payloadBytes = ethers.toUtf8Bytes(payload);
        const hash = ethers.keccak256(payloadBytes);
        const pgs = Math.floor(1500 + Math.random() * 3500);

        const tx = await predictionStorage.anchorForecast(ts, hash, sampleCid + i, pgs);
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed;
      }

      const avgGas = totalGas / BigInt(280);
      console.log(`\n  ⛽ Batch 280 forecasts:`);
      console.log(`     Total gas: ${totalGas.toString()}`);
      console.log(`     Average gas per anchor: ${avgGas.toString()}`);
      console.log(`     At 30 gwei gas price: ${(Number(avgGas) * 30 / 1e9).toFixed(6)} ETH per anchor`);
    });
  });

  describe("EnergyTrading", function () {
    it("Should create and fill a PGS-gated trade", async function () {
      // First anchor a forecast with PGS above threshold
      const timestamp = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const payloadHash = ethers.keccak256(payloadBytes);
      const pgs = 2134; // Above 1500 threshold

      await predictionStorage.anchorForecast(timestamp, payloadHash, sampleCid, pgs);

      // Create trade
      const tx1 = await energyTrading.connect(seller).createTrade(timestamp, 5000, ethers.parseEther("0.01"));
      const receipt1 = await tx1.wait();
      console.log(`\n  ⛽ createTrade gas: ${receipt1.gasUsed.toString()}`);

      // Fill trade
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      const tx2 = await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });
      const receipt2 = await tx2.wait();
      console.log(`  ⛽ fillTrade gas: ${receipt2.gasUsed.toString()}`);

      // Verify trade filled
      const trade = await energyTrading.trades(0);
      expect(trade.filled).to.be.true;
      expect(trade.buyer).to.equal(buyer.address);
    });

    it("Should block trade when PGS below threshold", async function () {
      const timestamp = 1573304400;
      const payloadBytes = ethers.toUtf8Bytes(JSON.stringify({ ...JSON.parse(samplePayload), predicted_y: 0.05 }));
      const payloadHash = ethers.keccak256(payloadBytes);
      const pgs = 500; // Below 1500 threshold

      await predictionStorage.anchorForecast(timestamp, payloadHash, sampleCid, pgs);

      // Should revert
      await expect(
        energyTrading.connect(seller).createTrade(timestamp, 5000, ethers.parseEther("0.01"))
      ).to.be.revertedWith("PGS below threshold: scheduling not eligible");
    });

    it("Should check eligibility", async function () {
      const ts1 = 1573300800;
      const ts2 = 1573304400;
      
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      await predictionStorage.anchorForecast(ts1, ethers.keccak256(payloadBytes), sampleCid, 2134);
      await predictionStorage.anchorForecast(ts2, ethers.keccak256(payloadBytes), sampleCid + "2", 800);

      expect(await energyTrading.isEligible(ts1)).to.be.true;
      expect(await energyTrading.isEligible(ts2)).to.be.false;
    });
  });

  describe("TradeDispute", function () {
    it("Should raise and resolve a dispute", async function () {
      // Setup: anchor + create + fill trade
      const timestamp = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      await predictionStorage.anchorForecast(timestamp, ethers.keccak256(payloadBytes), sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(timestamp, 5000, ethers.parseEther("0.01"));
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });

      // Raise dispute
      const tx1 = await tradeDispute.connect(buyer).raiseDispute(0, "Forecast was manipulated");
      const receipt1 = await tx1.wait();
      console.log(`\n  ⛽ raiseDispute gas: ${receipt1.gasUsed.toString()}`);

      // Resolve dispute
      const tx2 = await tradeDispute.connect(arbiter).resolveDispute(0, true);
      const receipt2 = await tx2.wait();
      console.log(`  ⛽ resolveDispute gas: ${receipt2.gasUsed.toString()}`);

      const dispute = await tradeDispute.disputes(0);
      expect(dispute.status).to.equal(1); // ResolvedForBuyer
    });

    it("Should verify trade integrity", async function () {
      const timestamp = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      await predictionStorage.anchorForecast(timestamp, ethers.keccak256(payloadBytes), sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(timestamp, 5000, ethers.parseEther("0.01"));
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });

      const [valid, pgs] = await tradeDispute.verifyTradeIntegrity(0, payloadBytes);
      expect(valid).to.be.true;
      expect(pgs).to.equal(2134);
    });
  });

  describe("End-to-End Latency Benchmark", function () {
    it("Should measure full pipeline: anchor → trade → verify", async function () {
      const start = Date.now();

      // Step 1: Anchor forecast
      const timestamp = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const payloadHash = ethers.keccak256(payloadBytes);
      const tx1 = await predictionStorage.anchorForecast(timestamp, payloadHash, sampleCid, 2134);
      await tx1.wait();
      const afterAnchor = Date.now();

      // Step 2: Create trade
      const tx2 = await energyTrading.connect(seller).createTrade(timestamp, 5000, ethers.parseEther("0.01"));
      await tx2.wait();
      const afterCreate = Date.now();

      // Step 3: Fill trade
      const totalCost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      const tx3 = await energyTrading.connect(buyer).fillTrade(0, { value: totalCost });
      await tx3.wait();
      const afterFill = Date.now();

      // Step 4: Verify
      const [valid,] = await tradeDispute.verifyTradeIntegrity(0, payloadBytes);
      const afterVerify = Date.now();

      console.log(`\n  ⏱️  Pipeline Latency (local Hardhat node):`);
      console.log(`     Anchor:  ${afterAnchor - start} ms`);
      console.log(`     Create:  ${afterCreate - afterAnchor} ms`);
      console.log(`     Fill:    ${afterFill - afterCreate} ms`);
      console.log(`     Verify:  ${afterVerify - afterFill} ms`);
      console.log(`     Total:   ${afterVerify - start} ms`);

      expect(valid).to.be.true;
    });
  });
});
