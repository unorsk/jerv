import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative, so the same build works at unorsk.github.io/jerv/, at the root of
  // a user site, and from a file:// URL -- nothing hardcodes the repo name.
  base: "./",
  plugins: [svelte()],
  build: {
    // Above the 23 KB font, so it is inlined into the stylesheet: the whole app
    // then arrives in two requests instead of three, and there is no window
    // where the checkbox glyphs are missing.
    assetsInlineLimit: 64 * 1024,
  },
});
