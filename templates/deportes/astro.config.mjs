import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  cacheDir: "./.astro",
  vite: {
    cacheDir: "./.vite",
    plugins: [tailwindcss()],
  },
});
