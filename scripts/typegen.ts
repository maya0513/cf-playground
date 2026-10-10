import { resolve } from "node:path";
import { command, root } from "./process.ts";
await command(["exec", "cf", "workers", "types"], resolve(root, "apps/00-home"));
