import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

function vendorChunk(id: string) {
  if (id.includes("lib/i18n-internal")) return "i18n-internal";
  if (id.includes("lib/i18n-public-packs")) return "i18n-public";
  if (id.includes("node_modules")) return "vendor";
  return undefined;
}

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: true, routesDirectory: "./routes", generatedRouteTree: "./routeTree.gen.ts" }),
    react(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
