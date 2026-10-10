import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { command, root } from "./process.ts";

const identifier = z.string().regex(/^[a-f0-9]{32}$/i);
const productionKey = z
  .string()
  .trim()
  .min(1)
  .regex(/^(?![123]x0+AA$).+$/s);
const settings = z.object({
  CLOUDFLARE_ACCOUNT_ID: identifier,
  CLOUDFLARE_API_TOKEN: z.string().trim().min(1),
  CF_DB_ID: z.uuid(),
  CF_NOTICE_NAMESPACE_ID: identifier,
  CF_HISTORY_NAMESPACE_ID: identifier,
  CF_TURNSTILE_SITEKEY: productionKey,
  CF_TURNSTILE_SECRET: productionKey,
  CF_ACCESS_ISSUER: z.url({ protocol: /^https$/ }),
  CF_ACCESS_AUDIENCE: z.string().trim().min(1),
});

export async function deploy() {
  const result = settings.safeParse(process.env);
  if (!result.success)
    // 値をエラーへ含めない。特にAPI tokenとTurnstile secretはログに出さない。
    throw new Error(
      `デプロイ設定が不正です: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  const cwd = resolve(root, "apps/00-home");
  const publicEnvironment = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: undefined,
    CF_TURNSTILE_SECRET: undefined,
  };
  // Vite Taskの再起動はBuild Outputを消すため、同じTask内で最後まで実行する。
  await command(["exec", "node", "scripts/build.ts"], root, publicEnvironment);
  await command(
    [
      "exec",
      "cf",
      "deploy",
      "--prebuilt",
      "--mode",
      "production",
      "--dry-run",
      "--provision=false",
    ],
    cwd,
    publicEnvironment,
  );
  const directory = await mkdtemp(join(tmpdir(), "cf-playground-secrets-"));
  try {
    const path = join(directory, "secrets.json");
    await writeFile(path, JSON.stringify({ SECRET: result.data.CF_TURNSTILE_SECRET }), {
      mode: 0o600,
    });
    await command(
      [
        "exec",
        "cf",
        "deploy",
        "--prebuilt",
        "--mode",
        "production",
        "--provision=false",
        "--secrets-file",
        path,
      ],
      cwd,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
