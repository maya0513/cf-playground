import { defineConfig } from "vite-plus";
import { preact } from "@preact/preset-vite";
import { cloudflare } from "@cloudflare/vite-plugin";
export function homeViteConfig() {
  return defineConfig({
    plugins: [
      preact(),
      cloudflare({
        viteEnvironment: { name: "ssr" },
        persistState: { path: ".cloudflare/state" },
        inspectorPort: false,
        remoteBindings: false,
      }),
    ],
    server: { host: "127.0.0.1", port: 4100, strictPort: true, fs: { allow: ["../.."] } },
    build: { target: "esnext", rollupOptions: { input: "shell.html" } },
  });
}
