import { coverageSchema } from "./coverage-schema.ts";
import { sequential } from "../packages/catalog/sequential.ts";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import coverage from "istanbul-lib-coverage";
import report from "istanbul-lib-report";
import reports from "istanbul-reports";
import { root } from "./process.ts";
export async function verifyCoverage() {
  const map = coverage.createCoverageMap({});
  await sequential(["node", "workers"], async (environment) => {
    map.merge(
      coverageSchema.parse(
        JSON.parse(
          await readFile(resolve(root, "coverage", environment, "coverage-final.json"), "utf8"),
        ),
      ),
    );
  });
  // Inventory is independent of Vitest's selection: a missing file fails the check.
  const sources: string[] = [];
  await sequential(["apps", "packages", "scripts"], async (directory) => {
    for (const entry of await readdir(resolve(root, directory), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (
        entry.isFile() &&
        /\.(tsx?|mjs)$/.test(entry.name) &&
        !entry.name.endsWith(".d.ts") &&
        !entry.parentPath.includes("/node_modules") &&
        !entry.parentPath.includes("/.cloudflare/")
      )
        sources.push(resolve(entry.parentPath, entry.name));
    }
  });
  sources.push(
    resolve(root, "vite.config.ts"),
    resolve(root, "playwright.config.ts"),
    resolve(root, "tests/workers/vitest.config.ts"),
    resolve(root, "tests/node/vitest.config.ts"),
  );
  for (const path of sources)
    if (!map.files().includes(path)) throw new Error(`未計測ファイル: ${path}`);
  await mkdir(resolve(root, "coverage/merged"), { recursive: true });
  const context = report.createContext({ dir: resolve(root, "coverage/merged"), coverageMap: map });
  for (const format of ["html", "lcovonly", "json-summary", "text"] as const)
    reports.create(format).execute(context);
  for (const path of [...map.files(), "TOTAL"]) {
    const summary =
      path === "TOTAL" ? map.getCoverageSummary() : map.fileCoverageFor(path).toSummary();
    for (const metric of ["lines", "statements", "functions", "branches"] as const)
      if (summary[metric].pct !== 100)
        throw new Error(`${path}: ${metric} ${summary[metric].pct}% (required 100%)`);
  }
}
await verifyCoverage();
