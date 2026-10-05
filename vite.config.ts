import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "แบดมินตัน Pairing & Schedule",
        short_name: "แบดมินตัน",
        description: "จัดคู่และตารางแบดมินตันออฟไลน์",
        lang: "th",
        start_url: "/",
        display: "standalone",
        background_color: "#f3f7fc",
        theme_color: "#1266ef",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: { globPatterns: ["**/*.{js,css,html,png,svg,ico}"] },
    }),
  ],
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/simulation/**/*.test.ts"],
    testTimeout: 120000,
  },
});
