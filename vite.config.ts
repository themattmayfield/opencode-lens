import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui-lib/hooks": path.resolve(__dirname, "./src/ui-lib/src/hooks"),
      "@ui-lib/styles": path.resolve(__dirname, "./src/ui-lib/src/styles"),
      "@ui-lib": path.resolve(__dirname, "./src/ui-lib/src/components"),
    },
  },
  plugins: [
    tailwindcss(),
    solidPlugin(),
    iconsSpritesheet({
      withTypes: true,
      inputDir: "src/assets/file-icons",
      outputDir: "src/ui-app/file-icons",
      formatter: "biome",
    }),
  ],
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  build: {
    target: "esnext",
  },
})
