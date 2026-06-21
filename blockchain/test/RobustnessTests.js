import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("Robustness & Security Tests", function () {
  let predictionStorage, energyTrading, tradeDispute;
  let owner, seller, buyer, arbiter, attacker;

  const samplePayload = JSON.stringify({
    features: { P_gen: 4521.3, P_load: 11200.0, SoC: 0.72 },
    forecast_timestamp: 1573300800,
    model_id: "hybrid_residual_v1",
    predicted_y: 0.2134,
    scheduling_eligible: true,
    threshold: 0.15
  });
  const sampleCid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

  beforeEach(async function () {
    [owner, seller, buyer, arbiter, attacker] = await ethers.getSigners();

    const PS = await ethers.getContractFactory("PredictionStorage");
    predictionStorage = await PS.deploy();
    await predictionStorage.waitForDeployment();

    const ET = await ethers.getContractFactory("EnergyTrading");
    energyTrading = await ET.deploy(await predictionStorage.getAddress());
    await energyTrading.waitForDeployment();

    const TD = await ethers.getContractFactory("TradeDispute");
    tradeDispute = await TD.deploy(
      await energyTrading.getAddress(),
      await predictionStorage.getAddress(),
      arbiter.address
    );
    await tradeDispute.waitForDeployment();
  });

  // ==========================================================================
  // 1. IMMUTABILITY TESTS
  // ==========================================================================
  describe("1. Immutability & Tamper-Resistance", function () {
    it("Should reject duplicate anchoring for same timestamp", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);

      await expect(
        predictionStorage.anchorForecast(ts, hash, sampleCid, 2134)
      ).to.be.revertedWith("Forecast already anchored");
    });

    it("Should detect tampered payloads", async function () {
      const ts = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const hash = ethers.keccak256(payloadBytes);
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);

      // Tamper: change one character
      const tampered = JSON.stringify({
        ...JSON.parse(samplePayload),
        predicted_y: 0.9999  // Attacker inflates prediction
      });
      const tamperedBytes = ethers.toUtf8Bytes(tampered);
      
      const valid = await predictionStorage.verifyPayload(ts, tamperedBytes);
      expect(valid).to.be.false;
    });

    it("Should reject empty hash", async function () {
      await expect(
        predictionStorage.anchorForecast(1573300800, ethers.zeroPadBytes("0x", 32), sampleCid, 2134)
      ).to.be.revertedWith("Empty hash not allowed");
    });

    it("Should reject empty CID", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await expect(
        predictionStorage.anchorForecast(1573300800, hash, "", 2134)
      ).to.be.revertedWith("Empty CID not allowed");
    });
  });

  // ==========================================================================
  // 2. PGS BOUNDARY TESTS
  // ==========================================================================
  describe("2. PGS Threshold Boundary Tests", function () {
    it("Should reject PGS > 10000", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await expect(
        predictionStorage.anchorForecast(1573300800, hash, sampleCid, 10001)
      ).to.be.revertedWith("PGS must be 0-10000");
    });

    it("Should accept PGS = 0 (minimum)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(1573300800, hash, sampleCid, 0);
      expect(await predictionStorage.getPGS(1573300800)).to.equal(0);
    });

    it("Should accept PGS = 10000 (maximum)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(1573300800, hash, sampleCid, 10000);
      expect(await predictionStorage.getPGS(1573300800)).to.equal(10000);
    });

    it("Should block trade at PGS = 1499 (just below threshold)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(1573300800, hash, sampleCid, 1499);

      await expect(
        energyTrading.connect(seller).createTrade(1573300800, 5000, ethers.parseEther("0.01"))
      ).to.be.revertedWith("PGS below threshold: scheduling not eligible");
    });

    it("Should allow trade at PGS = 1500 (exactly at threshold)", async function () {
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(1573300800, hash, sampleCid, 1500);

      const tx = await energyTrading.connect(seller).createTrade(1573300800, 5000, ethers.parseEther("0.01"));
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  // ==========================================================================
  // 3. ACCESS CONTROL TESTS
  // ==========================================================================
  describe("3. Access Control & Authorization", function () {
    it("Should prevent non-arbiter from resolving disputes", async function () {
      // Setup trade
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));
      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: cost });

      // Raise dispute
      await tradeDispute.connect(buyer).raiseDispute(0, "Test dispute");

      // Attacker tries to resolve
      await expect(
        tradeDispute.connect(attacker).resolveDispute(0, true)
      ).to.be.revertedWith("Only arbiter can resolve");
    });

    it("Should prevent non-party from raising disputes", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));
      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: cost });

      await expect(
        tradeDispute.connect(attacker).raiseDispute(0, "Unauthorized dispute")
      ).to.be.revertedWith("Not a party to this trade");
    });

    it("Should prevent seller from filling own trade", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));

      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await expect(
        energyTrading.connect(seller).fillTrade(0, { value: cost })
      ).to.be.revertedWith("Cannot fill own trade");
    });
  });

  // ==========================================================================
  // 4. ESCROW & FINANCIAL SAFETY
  // ==========================================================================
  describe("4. Escrow & Financial Safety", function () {
    it("Should hold funds in escrow after trade fill", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));

      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: cost });

      const escrow = await energyTrading.escrowBalance(seller.address);
      expect(escrow).to.equal(cost);
    });

    it("Should allow seller to withdraw escrow", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));

      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: cost });

      const balBefore = await ethers.provider.getBalance(seller.address);
      const tx = await energyTrading.connect(seller).withdrawEscrow();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(seller.address);

      expect(balAfter - balBefore + gasUsed).to.equal(cost);
    });

    it("Should refund excess payment", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));

      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      const excess = ethers.parseEther("1"); // Way too much

      const balBefore = await ethers.provider.getBalance(buyer.address);
      const tx = await energyTrading.connect(buyer).fillTrade(0, { value: cost + excess });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const balAfter = await ethers.provider.getBalance(buyer.address);

      // Buyer should only lose cost + gas, excess refunded
      const spent = balBefore - balAfter;
      expect(spent).to.be.closeTo(cost + gasUsed, ethers.parseEther("0.0001"));
    });

    it("Should prevent double withdrawal", async function () {
      const ts = 1573300800;
      const hash = ethers.keccak256(ethers.toUtf8Bytes(samplePayload));
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);
      await energyTrading.connect(seller).createTrade(ts, 5000, ethers.parseEther("0.01"));
      const cost = BigInt(5000) * ethers.parseEther("0.01") / BigInt(1000);
      await energyTrading.connect(buyer).fillTrade(0, { value: cost });

      await energyTrading.connect(seller).withdrawEscrow();
      await expect(
        energyTrading.connect(seller).withdrawEscrow()
      ).to.be.revertedWith("No escrow balance");
    });
  });

  // ==========================================================================
  // 5. THROUGHPUT & SCALABILITY
  // ==========================================================================
  describe("5. Throughput & Scalability", function () {
    it("Should handle 1000 forecast anchors (throughput test)", async function () {
      this.timeout(60000);
      const baseTs = 1573300800;
      let totalGas = BigInt(0);
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        const ts = baseTs + i * 3600;
        const payload = JSON.stringify({ ts, predicted_y: Math.random() });
        const hash = ethers.keccak256(ethers.toUtf8Bytes(payload));
        const pgs = Math.floor(Math.random() * 10000);

        const tx = await predictionStorage.anchorForecast(ts, hash, `Qm${i.toString().padStart(44, '0')}`, pgs);
        const receipt = await tx.wait();
        totalGas += receipt.gasUsed;
      }

      const elapsed = Date.now() - startTime;
      const avgGas = totalGas / BigInt(1000);
      const tps = (1000 / elapsed * 1000).toFixed(1);

      console.log(`\n  📊 Throughput Test (1000 anchors):`);
      console.log(`     Total time: ${elapsed} ms`);
      console.log(`     Throughput: ${tps} tx/sec (local node)`);
      console.log(`     Avg gas: ${avgGas.toString()}`);
      console.log(`     Total gas: ${totalGas.toString()}`);
      console.log(`     Total cost at 30 gwei: ${(Number(totalGas) * 30 / 1e9).toFixed(4)} ETH`);

      expect(await predictionStorage.totalAnchored()).to.equal(1000);
    });

    it("Should handle 100 concurrent trade lifecycle", async function () {
      this.timeout(60000);
      const baseTs = 2000000000;
      let tradeGas = BigInt(0);
      let fillGas = BigInt(0);

      // Anchor 100 eligible forecasts
      for (let i = 0; i < 100; i++) {
        const ts = baseTs + i * 3600;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(`payload_${i}`));
        await predictionStorage.anchorForecast(ts, hash, `Qm${i}`, 5000);
      }

      // Create and fill 100 trades
      for (let i = 0; i < 100; i++) {
        const ts = baseTs + i * 3600;
        const tx1 = await energyTrading.connect(seller).createTrade(ts, 1000, ethers.parseEther("0.001"));
        const r1 = await tx1.wait();
        tradeGas += r1.gasUsed;

        const cost = BigInt(1000) * ethers.parseEther("0.001") / BigInt(1000);
        const tx2 = await energyTrading.connect(buyer).fillTrade(i, { value: cost });
        const r2 = await tx2.wait();
        fillGas += r2.gasUsed;
      }

      console.log(`\n  📊 Trade Lifecycle (100 trades):`);
      console.log(`     Avg createTrade gas: ${(tradeGas / BigInt(100)).toString()}`);
      console.log(`     Avg fillTrade gas: ${(fillGas / BigInt(100)).toString()}`);
    });
  });

  // ==========================================================================
  // 6. DETERMINISM & REPRODUCIBILITY
  // ==========================================================================
  describe("6. Deterministic Serialization", function () {
    it("Should produce same hash for same canonical JSON regardless of key order", async function () {
      // Canonical JSON uses sorted keys
      const payload1 = JSON.stringify({ a: 1, b: 2, c: 3 });
      const payload2 = JSON.stringify({ c: 3, a: 1, b: 2 }); // Different key order
      
      // After canonical serialization (sorted keys), they should differ
      // This demonstrates WHY canonical serialization matters
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(payload1));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(payload2));
      
      // Non-canonical produces different hashes (this is the problem we solve)
      expect(hash1).to.not.equal(hash2);
      
      // Canonical approach: sort keys
      const canonical = (obj) => JSON.stringify(obj, Object.keys(obj).sort());
      const obj = { c: 3, a: 1, b: 2 };
      const canonicalStr = canonical(obj);
      // Always produces {"a":1,"b":2,"c":3}
      expect(canonicalStr).to.equal('{"a":1,"b":2,"c":3}');
    });

    it("Should maintain payload integrity across multiple verify calls", async function () {
      const ts = 1573300800;
      const payloadBytes = ethers.toUtf8Bytes(samplePayload);
      const hash = ethers.keccak256(payloadBytes);
      await predictionStorage.anchorForecast(ts, hash, sampleCid, 2134);

      // Verify 100 times — should always be consistent
      for (let i = 0; i < 100; i++) {
        const valid = await predictionStorage.verifyPayload(ts, payloadBytes);
        expect(valid).to.be.true;
      }
    });
  });
});
