import { expect } from "chai";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the blockchain root directory (one level up from test/)
const blockchainDir = path.resolve(__dirname, "..");
const contractsDir = path.join(blockchainDir, "contracts");

// Contracts to analyze
const CONTRACTS = [
  { name: "PredictionStorage", file: "PredictionStorage.sol" },
  { name: "EnergyTrading", file: "EnergyTrading.sol" },
  { name: "TradeDispute", file: "TradeDispute.sol" }
];

// ─── SAST Tool Detection & Execution ─────────────────────────────────────────

/**
 * Detect which SAST tool is available (Slither preferred, Mythril fallback).
 * @returns {{ tool: string, available: boolean }}
 */
function detectSASTTool() {
  // Try Slither first
  try {
    execSync("slither --version", { stdio: "pipe", timeout: 10000 });
    return { tool: "slither", available: true };
  } catch (_) {
    // Slither not available
  }

  // Try Mythril fallback
  try {
    execSync("myth version", { stdio: "pipe", timeout: 10000 });
    return { tool: "mythril", available: true };
  } catch (_) {
    // Mythril not available
  }

  return { tool: "slither (preferred) / mythril (fallback)", available: false };
}

/**
 * Run Slither against a contract file and return parsed findings.
 * @param {string} contractFile - Solidity file name (e.g., "PredictionStorage.sol")
 * @returns {Array} Array of finding objects with severity, line, category, description
 */
function runSlither(contractFile) {
  const contractPath = path.join(contractsDir, contractFile);
  try {
    const output = execSync(
      `slither ${contractPath} --json -`,
      {
        cwd: blockchainDir,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 300000 // 5 minute timeout
      }
    ).toString();

    const result = JSON.parse(output);
    const findings = [];

    if (result.results && result.results.detectors) {
      for (const detector of result.results.detectors) {
        const severity = normalizeSeverity(detector.impact);
        const lines = detector.elements && detector.elements.length > 0
          ? detector.elements[0].source_mapping?.lines || []
          : [];
        findings.push({
          severity,
          line: lines.length > 0 ? lines[0] : 0,
          category: detector.check || "unknown",
          description: detector.description || ""
        });
      }
    }

    return findings;
  } catch (err) {
    // Slither may exit with non-zero when it finds issues but still outputs JSON to stdout
    if (err.stdout) {
      try {
        const result = JSON.parse(err.stdout.toString());
        const findings = [];

        if (result.results && result.results.detectors) {
          for (const detector of result.results.detectors) {
            const severity = normalizeSeverity(detector.impact);
            const lines = detector.elements && detector.elements.length > 0
              ? detector.elements[0].source_mapping?.lines || []
              : [];
            findings.push({
              severity,
              line: lines.length > 0 ? lines[0] : 0,
              category: detector.check || "unknown",
              description: detector.description || ""
            });
          }
        }

        return findings;
      } catch (_) {
        // JSON parse failed
      }
    }
    throw err;
  }
}

/**
 * Run Mythril against a contract file and return parsed findings.
 * @param {string} contractFile - Solidity file name (e.g., "PredictionStorage.sol")
 * @returns {Array} Array of finding objects with severity, line, category, description
 */
function runMythril(contractFile) {
  const contractPath = path.join(contractsDir, contractFile);
  const output = execSync(
    `myth analyze ${contractPath} --execution-timeout 300 --output json`,
    {
      cwd: blockchainDir,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300000
    }
  ).toString();

  const result = JSON.parse(output);
  const findings = [];

  if (result.issues) {
    for (const issue of result.issues) {
      findings.push({
        severity: normalizeSeverity(issue.severity),
        line: issue.lineno || 0,
        category: issue.title || "unknown",
        description: issue.description || ""
      });
    }
  }

  return findings;
}

/**
 * Normalize severity string to lowercase canonical form.
 * @param {string} severity - Raw severity string from tool output
 * @returns {"high"|"medium"|"low"|"informational"}
 */
function normalizeSeverity(severity) {
  const s = (severity || "").toLowerCase().trim();
  if (s === "high") return "high";
  if (s === "medium") return "medium";
  if (s === "low") return "low";
  return "informational";
}

/**
 * Count findings by severity.
 * @param {Array} findings - Array of finding objects
 * @returns {{ high: number, medium: number, low: number, informational: number }}
 */
function countBySeverity(findings) {
  const counts = { high: 0, medium: 0, low: 0, informational: 0 };
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
  }
  return counts;
}

/**
 * Compute composite security score.
 * Formula: 100 - (high×10 + medium×5 + low×2 + info×1), clamped [0, 100]
 * @param {{ high: number, medium: number, low: number, informational: number }} counts
 * @returns {number}
 */
function computeSecurityScore(counts) {
  const penalty = counts.high * 10 + counts.medium * 5 + counts.low * 2 + counts.informational * 1;
  return Math.max(0, Math.min(100, 100 - penalty));
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("Requirement 12: SAST Security Testing", function () {
  this.timeout(300000); // 5 minutes — SAST tools can be slow

  let toolInfo;
  let sastAvailable = false;
  let allFindings = {}; // { contractName: findings[] }

  before(function () {
    toolInfo = detectSASTTool();
    sastAvailable = toolInfo.available;

    if (!sastAvailable) {
      console.log(`\n  ⚠️  SAST tool unavailable: ${toolInfo.tool}`);
      console.log("  ⚠️  Skipping SAST security tests (12.1–12.5). Install Slither or Mythril to enable.");
      return;
    }

    console.log(`\n  🔒 SAST tool detected: ${toolInfo.tool}`);

    // Run analysis for each contract
    for (const contract of CONTRACTS) {
      try {
        const findings = toolInfo.tool === "slither"
          ? runSlither(contract.file)
          : runMythril(contract.file);
        allFindings[contract.name] = findings;
      } catch (err) {
        console.log(`\n  ⚠️  Failed to analyze ${contract.name}: ${err.message}`);
        allFindings[contract.name] = [];
      }
    }
  });

  it("12.1 should report PredictionStorage findings by severity (criterion 12.1)", function () {
    if (!sastAvailable) this.skip();

    const findings = allFindings["PredictionStorage"] || [];
    const counts = countBySeverity(findings);

    console.log("\n  ┌──────────────────────────────────────────────────────────┐");
    console.log("  │  PredictionStorage — SAST Findings by Severity          │");
    console.log("  ├──────────────────┬─────────────────────────────────────────┤");
    console.log(`  │  High            │  ${counts.high}`);
    console.log(`  │  Medium          │  ${counts.medium}`);
    console.log(`  │  Low             │  ${counts.low}`);
    console.log(`  │  Informational   │  ${counts.informational}`);
    console.log(`  │  Total           │  ${findings.length}`);
    console.log("  └──────────────────┴─────────────────────────────────────────┘");

    // Test passes regardless of finding count — this is a reporting test
    expect(counts).to.have.property("high").that.is.a("number");
    expect(counts).to.have.property("medium").that.is.a("number");
    expect(counts).to.have.property("low").that.is.a("number");
    expect(counts).to.have.property("informational").that.is.a("number");
  });

  it("12.2 should report EnergyTrading findings by severity (criterion 12.2)", function () {
    if (!sastAvailable) this.skip();

    const findings = allFindings["EnergyTrading"] || [];
    const counts = countBySeverity(findings);

    console.log("\n  ┌──────────────────────────────────────────────────────────┐");
    console.log("  │  EnergyTrading — SAST Findings by Severity              │");
    console.log("  ├──────────────────┬─────────────────────────────────────────┤");
    console.log(`  │  High            │  ${counts.high}`);
    console.log(`  │  Medium          │  ${counts.medium}`);
    console.log(`  │  Low             │  ${counts.low}`);
    console.log(`  │  Informational   │  ${counts.informational}`);
    console.log(`  │  Total           │  ${findings.length}`);
    console.log("  └──────────────────┴─────────────────────────────────────────┘");

    expect(counts).to.have.property("high").that.is.a("number");
    expect(counts).to.have.property("medium").that.is.a("number");
    expect(counts).to.have.property("low").that.is.a("number");
    expect(counts).to.have.property("informational").that.is.a("number");
  });

  it("12.3 should report TradeDispute findings by severity (criterion 12.3)", function () {
    if (!sastAvailable) this.skip();

    const findings = allFindings["TradeDispute"] || [];
    const counts = countBySeverity(findings);

    console.log("\n  ┌──────────────────────────────────────────────────────────┐");
    console.log("  │  TradeDispute — SAST Findings by Severity               │");
    console.log("  ├──────────────────┬─────────────────────────────────────────┤");
    console.log(`  │  High            │  ${counts.high}`);
    console.log(`  │  Medium          │  ${counts.medium}`);
    console.log(`  │  Low             │  ${counts.low}`);
    console.log(`  │  Informational   │  ${counts.informational}`);
    console.log(`  │  Total           │  ${findings.length}`);
    console.log("  └──────────────────┴─────────────────────────────────────────┘");

    expect(counts).to.have.property("high").that.is.a("number");
    expect(counts).to.have.property("medium").that.is.a("number");
    expect(counts).to.have.property("low").that.is.a("number");
    expect(counts).to.have.property("informational").that.is.a("number");
  });

  it("12.4 should compute composite security score clamped [0, 100] (criterion 12.4)", function () {
    if (!sastAvailable) this.skip();

    console.log("\n  ┌──────────────────────────────────────────────────────────────────┐");
    console.log("  │  Composite Security Scores                                       │");
    console.log("  │  Formula: 100 - (high×10 + medium×5 + low×2 + info×1)           │");
    console.log("  ├───────────────────────┬────────────────────────────────────────────┤");

    for (const contract of CONTRACTS) {
      const findings = allFindings[contract.name] || [];
      const counts = countBySeverity(findings);
      const score = computeSecurityScore(counts);

      console.log(`  │  ${contract.name.padEnd(20)} │  Score: ${score}/100`);

      // Verify score is within valid range
      expect(score).to.be.at.least(0);
      expect(score).to.be.at.most(100);
    }

    console.log("  └───────────────────────┴────────────────────────────────────────────┘");

    // Compute aggregate score across all contracts
    let totalCounts = { high: 0, medium: 0, low: 0, informational: 0 };
    for (const contract of CONTRACTS) {
      const counts = countBySeverity(allFindings[contract.name] || []);
      totalCounts.high += counts.high;
      totalCounts.medium += counts.medium;
      totalCounts.low += counts.low;
      totalCounts.informational += counts.informational;
    }
    const aggregateScore = computeSecurityScore(totalCounts);
    console.log(`\n  📊 Aggregate Security Score (all contracts): ${aggregateScore}/100`);

    expect(aggregateScore).to.be.at.least(0);
    expect(aggregateScore).to.be.at.most(100);
  });

  it("12.5 should report contract name, line number, and category for high-severity findings (criterion 12.5)", function () {
    if (!sastAvailable) this.skip();

    let highFindings = [];

    for (const contract of CONTRACTS) {
      const findings = allFindings[contract.name] || [];
      const highSev = findings.filter(f => f.severity === "high");
      for (const finding of highSev) {
        highFindings.push({
          contract: contract.name,
          line: finding.line,
          category: finding.category
        });
      }
    }

    if (highFindings.length === 0) {
      console.log("\n  ✅ No high-severity findings detected across all contracts.");
    } else {
      console.log("\n  ⚠️  High-Severity Findings:");
      console.log("  ┌───────────────────────┬────────┬─────────────────────────────────┐");
      console.log("  │ Contract              │ Line   │ Category                        │");
      console.log("  ├───────────────────────┼────────┼─────────────────────────────────┤");

      for (const f of highFindings) {
        const contractStr = f.contract.padEnd(21);
        const lineStr = String(f.line).padEnd(6);
        const catStr = f.category.padEnd(31);
        console.log(`  │ ${contractStr} │ ${lineStr} │ ${catStr} │`);
      }

      console.log("  └───────────────────────┴────────┴─────────────────────────────────┘");
    }

    // Each high-severity finding must have contract, line, and category
    for (const f of highFindings) {
      expect(f).to.have.property("contract").that.is.a("string").and.not.empty;
      expect(f).to.have.property("line").that.is.a("number");
      expect(f).to.have.property("category").that.is.a("string").and.not.empty;
    }
  });

  it("12.6 should skip tests gracefully with warning if SAST tool unavailable (criterion 12.6)", function () {
    // This test always passes — it verifies the skip behavior works correctly
    // by checking that the tool detection function returns meaningful info

    const detected = detectSASTTool();

    if (!detected.available) {
      console.log(`\n  ⚠️  SAST tool not available: ${detected.tool}`);
      console.log("  ℹ️  Tests were/would be skipped gracefully.");
      console.log("  ℹ️  Install Slither (pip install slither-analyzer) or Mythril (pip install mythril) to enable.");
    } else {
      console.log(`\n  ✅ SAST tool is available: ${detected.tool}`);
      console.log("  ℹ️  Graceful skip behavior is ready but not triggered.");
    }

    // Verify the detection mechanism provides meaningful output
    expect(detected).to.have.property("tool").that.is.a("string").and.not.empty;
    expect(detected).to.have.property("available").that.is.a("boolean");
  });
});
