import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

function vendorChunk(id: string) {
  if (!id.includes("node_modules")) return undefined;
  if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) return "vendor-react";
  if (id.includes("@tanstack")) return "vendor-tanstack";
  if (id.includes("@supabase")) return "vendor-supabase";
  if (id.includes("@radix-ui")) return "vendor-radix";
  if (id.includes("lucide-react")) return "vendor-icons";
  if (id.includes("recharts") || id.includes("d3-") || id.includes("victory-vendor")) return "vendor-charts";
  if (id.includes("date-fns")) return "vendor-date";
  if (id.includes("qrcode")) return "vendor-qrcode";
  return "vendor-misc";
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
    chunkSizeWarningLimit: 450,
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
      },
    },
  },
});
