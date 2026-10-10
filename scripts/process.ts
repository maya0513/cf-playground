import { spawn } from "node:child_process";
import { resolve } from "node:path";
export const root = resolve(import.meta.dirname, "..");
export function command(args: string[], cwd = root, environment = process.env) {
  return new Promise<void>((accept, reject) => {
    const child = spawn("pnpm", args, {
      cwd,
      stdio: "inherit",
      env: {
        ...environment,
        NO_COLOR: undefined,
        FORCE_COLOR: "0",
        CF_SEND_TELEMETRY: "false",
        XDG_CONFIG_HOME: resolve(root, ".cloudflare/cli-config"),
      },
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) accept();
      else reject(new Error(`pnpm ${args.join(" ")} failed (${code})`));
    });
  });
}
