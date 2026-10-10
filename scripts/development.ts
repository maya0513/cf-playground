import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { root } from "./process.ts";
export function startDev(args: string[]) {
  if (args.some((value) => value !== "--"))
    throw new Error("個別起動はありません。just devで全題材を起動してください。");
  const child = spawn(
    process.execPath,
    [
      resolve(dirname(import.meta.resolve("cf/package.json").replace("file://", "")), "bin/cf"),
      "dev",
      "--mode",
      "development",
    ],
    {
      cwd: resolve(root, "apps/00-home"),
      stdio: "inherit",
      detached: true,
      env: {
        ...process.env,
        NO_COLOR: undefined,
        FORCE_COLOR: "0",
        CF_SEND_TELEMETRY: "false",
        XDG_CONFIG_HOME: resolve(root, ".cloudflare/cli-config"),
      },
    },
  );
  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
      }
    }
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
  child.once("error", (error) => {
    console.error(error);
    process.exitCode = 1;
    stop();
  });
  child.once("exit", (code) => {
    if (!stopped) {
      process.exitCode = code === 0 ? 0 : 1;
      stop();
    }
  });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  return stop;
}
