import { defineConfig } from "vite";

export default defineConfig({
  base: "/blogs/",
  build: {
    rollupOptions: {
      input: ["index.html", "feed.html"],
    },
  },
});
