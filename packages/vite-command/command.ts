import process from "node:process";
// cf beta invokes `vite`; Vite Plus requires the explicit dev subcommand.
if (!process.argv[2] || process.argv[2].startsWith("-")) process.argv.splice(2, 0, "dev");
await import("vite-plus/bin");
