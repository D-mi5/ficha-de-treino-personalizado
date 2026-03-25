import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const PORT = 3200;
const HOST = "127.0.0.1";
const baseURL = `http://${HOST}:${PORT}`;
const healthUrl = `${baseURL}/api/health`;
const workspaceRoot = process.cwd();
const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  NODE_ENV: "test",
  CORS_ORIGIN: baseURL,
};

function spawnProcess(command, args, options = {}) {
  if (process.platform === "win32") {
    const commandLine = [command, ...args].join(" ");
    return spawn(commandLine, {
      cwd: workspaceRoot,
      stdio: "inherit",
      shell: true,
      ...options,
    });
  }

  return spawn(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

async function waitForHealthcheck(timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Aguarda o servidor terminar de subir.
    }

    await delay(500);
  }

  throw new Error(`Servidor de teste não ficou pronto em ${timeoutMs}ms.`);
}

function waitForExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.exitCode !== null || serverProcess.killed) {
    return;
  }

  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(serverProcess.pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
    });

    await new Promise((resolve) => {
      killer.once("exit", () => resolve());
      killer.once("error", () => resolve());
    });

    return;
  }

  serverProcess.kill("SIGTERM");
  const result = await Promise.race([
    waitForExit(serverProcess),
    delay(5000).then(() => null),
  ]);

  if (!result) {
    serverProcess.kill("SIGKILL");
    await waitForExit(serverProcess);
  }
}

async function main() {
  const serverProcess = spawnProcess("npx", ["tsx", "backend/src/server.ts"], {
    env: serverEnv,
  });

  const abort = async () => {
    await stopServer(serverProcess);
  };

  process.on("SIGINT", () => {
    void abort().finally(() => process.exit(130));
  });

  process.on("SIGTERM", () => {
    void abort().finally(() => process.exit(143));
  });

  try {
    await waitForHealthcheck(120000);

    const runner = spawnProcess("npx", ["playwright", "test"], {
      env: process.env,
    });

    const runnerResult = await waitForExit(runner);
    await stopServer(serverProcess);

    if (runnerResult.signal) {
      process.kill(process.pid, runnerResult.signal);
      return;
    }

    const exitCode = runnerResult.code ?? 1;
    if (exitCode === 0) {
      console.log("\n✓ E2E tests completed successfully.");
    } else {
      console.error("\n✗ E2E tests failed.");
    }

    process.exit(exitCode);
  } catch (error) {
    console.error("\n✗ E2E runner error:", error instanceof Error ? error.message : String(error));
    await stopServer(serverProcess);
    process.exit(1);
  }
}

void main();
