import { defineConfig } from "vite";

// Por defecto el sitio vive en https://ferroweb.github.io/ferro-en-numeros/
// En otro repo (por ejemplo uno de prueba) se define BASE_PATH, y el workflow lo hace solo.
export default defineConfig({
  base: process.env.BASE_PATH || "/ferro-en-numeros/",
  build: { outDir: "dist", sourcemap: false },
});
