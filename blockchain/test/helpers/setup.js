import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import pkg from "hardhat";
const { ethers } = pkg;

// ─── Constants ───────────────────────────────────────────────────────────────

export const SEED = 42;
export const PGS_THRESHOLD = 1500;
export const PAYLOAD_SIZES = [100, 1024, 10240]; // bytes

// ─── Deployment Fixture ──────────────────────────────────────────────────────

/**
 * Deploy all contracts and return instances + signers.
 * Use with loadFixture(deployAll) for efficient state snapshotting.
 */
export async function deployAll() {
  const [owner, seller, buyer, arbiter, ...signers] = await ethers.getSigners();

  // Deploy PredictionStorage (no constructor args)
  const PredictionStorage = await ethers.getContractFactory("PredictionStorage");
  const predictionStorage = await PredictionStorage.deploy();
  await predictionStorage.waitForDeployment();

  // Deploy EnergyTrading (needs PredictionStorage address)
  const EnergyTrading = await ethers.getContractFactory("EnergyTrading");
  const energyTrading = await EnergyTrading.deploy(await predictionStorage.getAddress());
  await energyTrading.waitForDeployment();

  // Deploy TradeDispute (needs EnergyTrading + PredictionStorage + arbiter)
  const TradeDispute = await ethers.getContractFactory("TradeDispute");
  const tradeDispute = await TradeDispute.deploy(
    await energyTrading.getAddress(),
    await predictionStorage.getAddress(),
    arbiter.address
  );
  await tradeDispute.waitForDeployment();

  return {
    predictionStorage,
    energyTrading,
    tradeDispute,
    owner,
    seller,
    buyer,
    arbiter,
    signers
  };
}

// ─── Payload Generation ──────────────────────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32) for deterministic byte generation.
 * @param {number} seed - Integer seed value
 * @returns {function} - Function that returns a pseudo-random float in [0, 1)
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a deterministic payload with hash, PGS, and simulated CID.
 * @param {number} seed - Random seed for deterministic generation
 * @param {number} sizeBytes - Approximate size of the payload in bytes
 * @returns {{ payloadString: string, payloadBytes: Uint8Array, payloadHash: string, pgs: number, cid: string }}
 */
export function generatePayload(seed, sizeBytes) {
  const rng = mulberry32(seed);

  // Build a forecast-like JSON object sized approximately to sizeBytes
  const basePayload = {
    features: {
      P_gen: parseFloat((rng() * 10000).toFixed(2)),
      P_load: parseFloat((rng() * 15000).toFixed(2)),
      SoC: parseFloat(rng().toFixed(4)),
      hour_sin: parseFloat((Math.sin(rng() * Math.PI * 2)).toFixed(6)),
      hour_cos: parseFloat((Math.cos(rng() * Math.PI * 2)).toFixed(6))
    },
    forecast_timestamp: Math.floor(1573300800 + rng() * 31536000),
    model_id: "hybrid_residual_v1",
    predicted_y: parseFloat(rng().toFixed(6)),
    scheduling_eligible: rng() > 0.5,
    threshold: 0.15
  };

  // Serialize and pad to reach desired size
  let payloadString = canonicalJSON(basePayload);

  if (payloadString.length < sizeBytes) {
    // Pad with deterministic data field
    const paddingNeeded = sizeBytes - payloadString.length - 15; // account for ,"pad":"..."
    let padding = "";
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < Math.max(0, paddingNeeded); i++) {
      padding += chars[Math.floor(rng() * chars.length)];
    }
    const paddedPayload = { ...basePayload, pad: padding };
    payloadString = canonicalJSON(paddedPayload);
  } else if (payloadString.length > sizeBytes && sizeBytes > 20) {
    // Truncate the string content (still valid for hashing purposes)
    payloadString = payloadString.slice(0, sizeBytes);
  }

  // Compute keccak256 hash
  const payloadBytes = ethers.toUtf8Bytes(payloadString);
  const payloadHash = ethers.keccak256(payloadBytes);

  // Deterministic PGS value (0-10000 scale)
  const pgs = Math.floor(rng() * 10001);

  // Simulated CID (base58-like string, 46+ characters like CIDv0)
  const base58Chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let cid = "Qm"; // CIDv0 prefix
  for (let i = 0; i < 44; i++) {
    cid += base58Chars[Math.floor(rng() * base58Chars.length)];
  }

  return { payloadString, payloadBytes, payloadHash, pgs, cid };
}

// ─── Canonical JSON ──────────────────────────────────────────────────────────

/**
 * Produce deterministic JSON serialization with recursively sorted keys.
 * @param {*} obj - Object to serialize
 * @returns {string} - Deterministic JSON string
 */
export function canonicalJSON(obj) {
  if (obj === null || obj === undefined) {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalJSON(item)).join(",") + "]";
  }
  if (typeof obj === "object") {
    const sortedKeys = Object.keys(obj).sort();
    const entries = sortedKeys.map(
      (key) => JSON.stringify(key) + ":" + canonicalJSON(obj[key])
    );
    return "{" + entries.join(",") + "}";
  }
  return JSON.stringify(obj);
}

// ─── Timing Utility ──────────────────────────────────────────────────────────

/**
 * Measure execution time of an async function.
 * @param {function} fn - Async function to time
 * @returns {Promise<{ result: *, elapsedMs: number }>}
 */
export async function measureTime(fn) {
  const start = performance.now();
  const result = await fn();
  const elapsedMs = performance.now() - start;
  return { result, elapsedMs };
}

// ─── Statistics Utility ──────────────────────────────────────────────────────

/**
 * Compute descriptive statistics for a numeric array.
 * @param {number[]} values - Array of numeric measurements
 * @returns {{ mean: number, stdDev: number, min: number, max: number, p95: number }}
 */
export function stats(values) {
  if (!values || values.length === 0) {
    return { mean: 0, stdDev: 0, min: 0, max: 0, p95: 0 };
  }

  const n = values.length;
  const sorted = [...values].sort((a, b) => a - b);

  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const min = sorted[0];
  const max = sorted[n - 1];

  // 95th percentile (nearest-rank method)
  const p95Index = Math.ceil(0.95 * n) - 1;
  const p95 = sorted[Math.min(p95Index, n - 1)];

  return { mean, stdDev, min, max, p95 };
}
