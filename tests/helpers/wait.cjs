// Bound both a whole condition wait and each asynchronous renderer/IPC probe.
async function withTimeout(operation, timeoutMs, describe) {
  let timer;
  try {
    return await Promise.race([
      // Install event listeners synchronously, before the caller triggers reload.
      Promise.resolve(operation()),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const description = typeof describe === 'function' ? describe() : describe;
          reject(new Error(`Timed out: ${description}`));
        }, timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function waitFor(predicate, description, { timeoutMs = 20000, intervalMs = 100 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error(`Timed out: ${description}`);
    if (await withTimeout(predicate, remaining, description)) return;
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))));
  }
}

module.exports = { withTimeout, waitFor };
