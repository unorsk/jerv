import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative, so the same build works at unorsk.github.io/jerv/, at the root of
  // a user site, and from a file:// URL -- nothing hardcodes the repo name.
  base: "./",
  plugins: [svelte()],
  // The font is the unsubset Nerd Font, so it stays a file of its own rather
  // than base64 in the stylesheet: inlining it would cost a third again in
  // size, block the first paint on all of it, and make the stylesheet
  // uncacheable separately from the app.
});
