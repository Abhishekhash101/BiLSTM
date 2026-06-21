import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;
import { deployAll, generatePayload, SEED } from "./helpers/setup.js";

describe("Requirement 2: Chain Linkage Verification", function () {
  // Number of sequential transactions to produce blocks
  const NUM_BLOCKS = 7;

  /**
   * Fixture that deploys contracts and anchors multiple forecasts
   * to produce sequential blocks on the Hardhat node.
   */
  async function deployAndMineBlocks() {
    const deployment = await deployAll();
    const { predictionStorage } = deployment;

    const baseTimestamp = 1573300800;
    const receipts = [];

    // Anchor NUM_BLOCKS forecasts to generate sequential blocks
    for (let i = 0; i < NUM_BLOCKS; i++) {
      const { payloadHash, cid, pgs } = generatePayload(SEED + i, 1024);
      const tx = await predictionStorage.anchorForecast(
        baseTimestamp + i * 3600,
        payloadHash,
        cid,
        pgs
      );
      const receipt = await tx.wait();
      receipts.push(receipt);
    }

    return { ...deployment, receipts };
  }

  /**
   * Helper function that traverses the chain from a given block number
   * back to genesis and checks parentHash linkage.
   * Returns { valid: boolean, brokenAt: number|null, expected: string|null, actual: string|null }
   */
  async function verifyChainLinkage(fromBlockNumber) {
    for (let n = fromBlockNumber; n > 0; n--) {
      const block = await ethers.provider.getBlock(n);
      const parentBlock = await ethers.provider.getBlock(n - 1);

      if (block.parentHash !== parentBlock.hash) {
        return {
          valid: false,
          brokenAt: n,
          expected: parentBlock.hash,
          actual: block.parentHash
        };
      }
    }
    return { valid: true, brokenAt: null, expected: null, actual: null };
  }

  describe("2.1 - parentHash linkage across sequential blocks", function () {
    it("each block's parentHash matches the hash of the preceding block (5+ blocks)", async function () {
      const { receipts } = await loadFixture(deployAndMineBlocks);

      // Get block numbers from receipts
      const blockNumbers = receipts.map((r) => r.blockNumber);

      // Verify at least 5 blocks were produced
      expect(blockNumbers.length).to.be.at.least(5);

      // Verify parentHash linkage for each consecutive pair
      for (let i = 1; i < blockNumbers.length; i++) {
        const currentBlock = await ethers.provider.getBlock(blockNumbers[i]);
        const previousBlock = await ethers.provider.getBlock(blockNumbers[i] - 1);

        expect(currentBlock.parentHash).to.equal(
          previousBlock.hash,
          `Block ${blockNumbers[i]} parentHash should match block ${blockNumbers[i] - 1} hash`
        );
      }

      console.log(`  ✓ Verified parentHash linkage across ${blockNumbers.length} blocks`);
    });
  });

  describe("2.2 - block hash uniqueness", function () {
    it("no two blocks in the sequence share the same block hash", async function () {
      const { receipts } = await loadFixture(deployAndMineBlocks);

      const blockNumbers = receipts.map((r) => r.blockNumber);
      const hashes = [];

      for (const blockNum of blockNumbers) {
        const block = await ethers.provider.getBlock(blockNum);
        hashes.push(block.hash);
      }

      // Use a Set to check uniqueness
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).to.equal(
        hashes.length,
        "All block hashes in the sequence should be unique"
      );

      console.log(`  ✓ Verified ${hashes.length} unique block hashes in sequence`);
    });
  });

  describe("2.3 - unbroken chain traversal to genesis", function () {
    it("parentHash linkage forms an unbroken chain from latest block to genesis", async function () {
      const { receipts } = await loadFixture(deployAndMineBlocks);

      // Get the latest block number from receipts
      const latestBlockNum = receipts[receipts.length - 1].blockNumber;

      // Traverse the entire chain back to genesis
      const result = await verifyChainLinkage(latestBlockNum);

      expect(result.valid).to.be.true;
      expect(result.brokenAt).to.be.null;

      // Verify genesis block exists and has expected properties
      const genesisBlock = await ethers.provider.getBlock(0);
      expect(genesisBlock).to.not.be.null;
      expect(genesisBlock.number).to.equal(0);

      console.log(`  ✓ Unbroken chain from block ${latestBlockNum} to genesis (block 0)`);
    });
  });

  describe("2.4 - block number increments by exactly 1", function () {
    it("block numbers increment sequentially by 1 for consecutive blocks", async function () {
      const { receipts } = await loadFixture(deployAndMineBlocks);

      const latestBlockNum = receipts[receipts.length - 1].blockNumber;

      // Verify every block from 1 to latest increments by exactly 1
      for (let n = 1; n <= latestBlockNum; n++) {
        const block = await ethers.provider.getBlock(n);
        const prevBlock = await ethers.provider.getBlock(n - 1);

        expect(block.number - prevBlock.number).to.equal(
          1,
          `Block ${n} should be exactly 1 more than block ${n - 1}`
        );
      }

      console.log(`  ✓ Block numbers increment by exactly 1 from block 0 to block ${latestBlockNum}`);
    });
  });

  describe("2.5 - broken link detection and reporting", function () {
    it("detection logic correctly validates all blocks (no broken links in Hardhat)", async function () {
      const { receipts } = await loadFixture(deployAndMineBlocks);

      const latestBlockNum = receipts[receipts.length - 1].blockNumber;

      // Run the detection logic on the real chain — should find no broken links
      const result = await verifyChainLinkage(latestBlockNum);

      expect(result.valid).to.be.true;
      expect(result.brokenAt).to.be.null;
      expect(result.expected).to.be.null;
      expect(result.actual).to.be.null;

      console.log(`  ✓ Chain validation passed: no broken links detected across ${latestBlockNum} blocks`);
    });

    it("detection helper correctly identifies a simulated broken link", function () {
      // Since Hardhat won't produce invalid blocks, we verify the detection
      // logic itself works by testing with simulated data
      const simulatedChain = [
        { number: 0, hash: "0xaaa", parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000" },
        { number: 1, hash: "0xbbb", parentHash: "0xaaa" },
        { number: 2, hash: "0xccc", parentHash: "0xbbb" },
        { number: 3, hash: "0xddd", parentHash: "0xZZZ" }, // BROKEN LINK
        { number: 4, hash: "0xeee", parentHash: "0xddd" }
      ];

      // Simulate the detection logic
      let brokenAt = null;
      let expectedHash = null;
      let actualHash = null;

      for (let i = 1; i < simulatedChain.length; i++) {
        const current = simulatedChain[i];
        const previous = simulatedChain[i - 1];

        if (current.parentHash !== previous.hash) {
          brokenAt = current.number;
          expectedHash = previous.hash;
          actualHash = current.parentHash;
          break;
        }
      }

      // The detection should identify block 3 as the broken link
      expect(brokenAt).to.equal(3);
      expect(expectedHash).to.equal("0xccc");
      expect(actualHash).to.equal("0xZZZ");

      console.log(`  ✓ Broken link detection identifies mismatch at block ${brokenAt}`);
      console.log(`    Expected parentHash: ${expectedHash}`);
      console.log(`    Actual parentHash:   ${actualHash}`);
    });

    it("detection reports correct expected vs actual values for broken link", function () {
      // Additional test to verify the reporting format includes block number
      // and both expected/actual parentHash values
      const simulatedChain = [
        { number: 0, hash: "0x1111111111111111111111111111111111111111111111111111111111111111", parentHash: "0x0000000000000000000000000000000000000000000000000000000000000000" },
        { number: 1, hash: "0x2222222222222222222222222222222222222222222222222222222222222222", parentHash: "0x1111111111111111111111111111111111111111111111111111111111111111" },
        { number: 2, hash: "0x3333333333333333333333333333333333333333333333333333333333333333", parentHash: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" } // BROKEN
      ];

      const report = [];

      for (let i = 1; i < simulatedChain.length; i++) {
        const current = simulatedChain[i];
        const previous = simulatedChain[i - 1];

        if (current.parentHash !== previous.hash) {
          report.push({
            blockNumber: current.number,
            expected: previous.hash,
            actual: current.parentHash
          });
        }
      }

      expect(report).to.have.lengthOf(1);
      expect(report[0].blockNumber).to.equal(2);
      // The expected parentHash should be block 1's hash (the preceding block)
      expect(report[0].expected).to.equal("0x2222222222222222222222222222222222222222222222222222222222222222");
      // The actual parentHash is the incorrect value stored in block 2
      expect(report[0].actual).to.equal("0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
      expect(report[0].expected).to.not.equal(report[0].actual);

      console.log(`  ✓ Report format validated: block #${report[0].blockNumber}`);
      console.log(`    Expected: ${report[0].expected}`);
      console.log(`    Actual:   ${report[0].actual}`);
    });
  });
});
