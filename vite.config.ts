import path from "path";
import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BUILD_TIME = Date.now();

function versionJsonPlugin() {
  return {
    name: "version-json",
    buildStart() {
      fs.writeFileSync(
        path.resolve(__dirname, "public/version.json"),
        JSON.stringify({ buildTime: BUILD_TIME })
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), versionJsonPlugin()],
  define: {
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  base: "/",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3001",
        ws: true,
      },
    },
  },
});
