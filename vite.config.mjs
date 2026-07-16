import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/GryLogiczne2/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/")) {
            return "vendor";
          }
          if (id.endsWith("/targetMasks.ts")) {
            return "target-masks";
          }
          if (id.endsWith("/namedGardnerTargets.ts")) {
            return "gardner-targets";
          }
          if (id.endsWith("/verifiedPuzzleSolutions.generated.ts")) {
            return "verified-solutions";
          }
        },
      },
    },
  },
  test: {
    environment: "node",
  },
});
