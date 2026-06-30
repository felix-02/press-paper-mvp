import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The Statement of Work requires the prototype to run offline simply by opening
// it in a browser. Chrome refuses to load external ES-module scripts over
// file://, so we inline the whole app (JS + CSS + fonts) into a single
// self-contained index.html via vite-plugin-singlefile. That same file also
// deploys cleanly to any static host (Vercel), so one artifact serves both.
//
// base: "./" keeps every path relative as a belt-and-braces measure.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 4000,
  },
});
