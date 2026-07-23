const { spawn } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MAX_BEATMAPS = 100;
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 120000;
const RESULT_CACHE_LIMIT = 12;
const ALLOWED_MODS = new Set(["EZ", "HT", "HR", "DT", "HD", "FL"]);

const RULESET_WORKERS = Object.freeze({
  current: {
    directory: "",
    period: "2026/07/11 ~",
    difficultyVersion: 20260706,
    sourceCommit: "e643ee36788f31ac2c2d07a3e19cd6fb563f2258",
  },
  livePP2510: {
    directory: "livePP2510",
    period: "2025/10/08 ~",
    difficultyVersion: 20251020,
    sourceCommit: "5af9bb784be1f058b22d83b0a93d484e588dc982",
  },
  livePP2503: {
    directory: "livePP2503",
    period: "2025/03/08 ~",
    difficultyVersion: 20241007,
    sourceCommit: "66b8b527e3e5b57a6529941f49a18ee8193c1a07",
  },
  livePP2410After: {
    directory: "livePP2410",
    period: "2024/11/05 ~",
    difficultyVersion: 20241007,
    sourceCommit: "795477372f5185209ba53274047ba917269e135a",
  },
  livePP2410Before: {
    directory: "livePP2410",
    period: "2024/10/30 ~",
    difficultyVersion: 20241007,
    sourceCommit: "795477372f5185209ba53274047ba917269e135a",
  },
  livePP2208: {
    directory: "livePP2208",
    period: "2022/09/28 ~",
    difficultyVersion: 20220902,
    sourceCommit: "7655b9f4a4685f23dceb590324938225f126fcfe",
  },
  livePP2021: {
    directory: "livePP",
    period: "2021/01/16 ~",
    difficultyVersion: "legacy",
    sourceCommit: "65d693e8bd156063815e1cfc0c0cf0bc365aef3d",
  },
  livePP2020: {
    directory: "livePP",
    period: "2020/09/16 ~",
    difficultyVersion: "legacy",
    sourceCommit: "65d693e8bd156063815e1cfc0c0cf0bc365aef3d",
  },
});

let activeProcess = null;

function createSrCalculatorService({ app, root }) {
  const resultCache = new Map();

  function getCachedResult(key) {
    const result = resultCache.get(key);
    if (!result) return null;
    resultCache.delete(key);
    resultCache.set(key, result);
    return result;
  }

  function cacheResult(key, result) {
    if (!result || result.error) return;
    resultCache.delete(key);
    resultCache.set(key, result);

    while (resultCache.size > RESULT_CACHE_LIMIT) {
      resultCache.delete(resultCache.keys().next().value);
    }
  }

  function createCacheKey(rulesetId, request) {
    return `${rulesetId}:${crypto.createHash("sha256").update(request).digest("base64")}`;
  }

  function getExecutablePath(rulesetId = "current") {
    const worker = RULESET_WORKERS[rulesetId];
    if (!worker) return null;
    const base = app.isPackaged
      ? path.join(process.resourcesPath, "sr-calculator")
      : path.join(root, "electron", "resources", "sr-calculator");
    return path.join(base, worker.directory, "ModdingHelper.SrCalculator.exe");
  }

  async function calculate(payload) {
    const rulesetId = String(payload && payload.rulesetId || "current");
    const worker = RULESET_WORKERS[rulesetId];
    if (!worker) return { error: "The selected SR ruleset is not supported." };
    const beatmaps = Array.isArray(payload && payload.beatmaps) ? payload.beatmaps : [];
    const mods = [...new Set(
      (Array.isArray(payload && payload.mods) ? payload.mods : [])
        .map(mod => String(mod || "").trim().toUpperCase())
        .filter(Boolean)
    )];

    if (mods.some(mod => !ALLOWED_MODS.has(mod))) {
      return { error: "The selected mod combination contains an unsupported mod." };
    }
    if ((mods.includes("EZ") && mods.includes("HR")) ||
        (mods.includes("HT") && mods.includes("DT"))) {
      return { error: "The selected mods are incompatible." };
    }

    if (!beatmaps.length) {
      return { error: "No beatmaps were supplied." };
    }
    if (beatmaps.length > MAX_BEATMAPS) {
      return { error: `A maximum of ${MAX_BEATMAPS} difficulties can be calculated at once.` };
    }

    const request = JSON.stringify({
      mods,
      beatmaps: beatmaps.map(item => ({
        fileName: String(item && item.fileName || ""),
        difficultyName: String(item && item.difficultyName || ""),
        content: String(item && item.content || ""),
      })),
    });

    if (Buffer.byteLength(request, "utf8") > MAX_INPUT_BYTES) {
      return { error: "The beatmap data is too large to calculate." };
    }

    const cacheKey = createCacheKey(rulesetId, request);
    const cachedResult = getCachedResult(cacheKey);
    if (cachedResult) return cachedResult;

    const executablePath = getExecutablePath(rulesetId);
    if (!fs.existsSync(executablePath)) {
      return { error: `The SR calculator for ${worker.period} is not installed. Run npm.cmd run build:sr.` };
    }

    if (activeProcess && !activeProcess.killed) {
      activeProcess.kill();
    }

    return new Promise(resolve => {
      const child = spawn(executablePath, [], {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
      activeProcess = child;

      let stdout = "";
      let stderr = "";
      let settled = false;

      const finish = result => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (activeProcess === child) activeProcess = null;
        resolve(result);
      };

      const timer = setTimeout(() => {
        child.kill();
        finish({ error: "SR calculation timed out." });
      }, TIMEOUT_MS);

      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");

      child.stdout.on("data", chunk => {
        stdout += chunk;
        if (Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) {
          child.kill();
          finish({ error: "The SR calculator returned too much data." });
        }
      });

      child.stderr.on("data", chunk => {
        stderr += chunk;
        if (stderr.length > 8192) stderr = stderr.slice(-8192);
      });

      child.on("error", error => finish({ error: error.message }));
      child.on("close", () => {
        try {
          const result = JSON.parse(stdout);
          if (result && typeof result === "object") {
            if (!result.error) {
              result.calculator = {
                ...(result.calculator || {}),
                name: "osu!lazer",
                ruleset: "taiko",
                difficultyVersion: worker.difficultyVersion,
                sourceCommit: worker.sourceCommit,
                period: worker.period,
              };
            }
            cacheResult(cacheKey, result);
            finish(result);
            return;
          }
        } catch (_) {}

        finish({
          error: stderr.trim() || "The SR calculator returned an invalid response.",
        });
      });

      child.stdin.on("error", () => {});
      child.stdin.end(request);
    });
  }

  function cancel() {
    if (activeProcess && !activeProcess.killed) activeProcess.kill();
    activeProcess = null;
  }

  function dispose() {
    cancel();
    resultCache.clear();
  }

  return { calculate, cancel, dispose, getExecutablePath };
}

module.exports = { createSrCalculatorService };
