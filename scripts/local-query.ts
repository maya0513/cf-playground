import { randomUUID } from "node:crypto";
import { z } from "zod";
const resultSchema = z.array(z.object({ success: z.literal(true) })).nonempty();
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { root } from "./process.ts";
import { stripVTControlCharacters } from "node:util";
// cf beta.12 keeps Miniflare alive after a successful local D1 query.
// Wait for its complete JSON result, validate it, then stop only our child group.
export async function localQuery(sql: string, cwd: string, database: string) {
  const registry = resolve(cwd, ".cloudflare/query-registry", randomUUID());
  try {
    await new Promise<void>((accept, reject) => {
      const bin = resolve(
        dirname(import.meta.resolve("cf/package.json").replace("file://", "")),
        "bin/cf",
      );
      const child = spawn(
        process.execPath,
        [
          bin,
          "d1",
          "raw",
          database,
          "--local",
          "--persist-to",
          resolve(cwd, ".cloudflare/state"),
          "--sql",
          sql,
          "--mode",
          "development",
        ],
        {
          cwd,
          detached: true,
          stdio: ["ignore", "pipe", "inherit"],
          env: {
            ...process.env,
            NO_COLOR: undefined,
            FORCE_COLOR: "0",
            CF_SEND_TELEMETRY: "false",
            // Killed beta CLI runtimes must not leave a discoverable proxy for the next query.
            CLOUDFLARE_REGISTRY_PATH: registry,
            XDG_CONFIG_HOME: resolve(root, ".cloudflare/cli-config"),
          },
        },
      );
      let output = "";
      let verified = false;
      function stop() {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      }
      const timer = setTimeout(() => {
        stop();
        reject(new Error("ローカルD1初期化がタイムアウトしました。"));
      }, 30000);
      child.stdout.on("data", (chunk) => {
        output += String(chunk);
        let result: unknown;
        try {
          result = JSON.parse(stripVTControlCharacters(output));
        } catch {
          return;
        }
        if (resultSchema.safeParse(result).success) {
          verified = true;
          stop();
        }
      });
      child.once("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once("close", () => {
        clearTimeout(timer);
        if (verified) accept();
        else reject(new Error("ローカルD1初期化の成功を確認できません。"));
      });
    });
  } finally {
    await rm(registry, { recursive: true, force: true });
  }
}
