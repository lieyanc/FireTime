import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Override with FT_BACKEND=http://host:port when the Go server listens elsewhere.
const backend = process.env.FT_BACKEND ?? "http://127.0.0.1:9853"

function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim()
  } catch {
    return "unknown"
  }
}

// The Go binary embeds web/dist with `//go:embed all:dist`, so the directory
// must never be empty. emptyOutDir wipes the committed .gitkeep on every build;
// write it back once the bundle is on disk.
function keepDistPlaceholder(): Plugin {
  let outDir = "dist"
  return {
    name: "firetime:keep-dist-placeholder",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      fs.mkdirSync(outDir, { recursive: true })
      fs.writeFileSync(path.join(outDir, ".gitkeep"), "")
    },
  }
}

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), keepDistPlaceholder()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  define: {
    "import.meta.env.VITE_COMMIT_ID": JSON.stringify(gitCommit()),
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(process.env.GITHUB_RUN_NUMBER ?? "local"),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(new Date().toISOString()),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 3010,
    proxy: {
      "/api": { target: backend },
      "/avatars": { target: backend },
    },
  },
})
