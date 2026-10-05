import { execSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";

import formatjs from "@formatjs/unplugin/vite";
import { optimizeLodashImports } from "@optimize-lodash/rollup-plugin";
import babel from "@rolldown/plugin-babel";
import legacy from "@vitejs/plugin-legacy";
import react from "@vitejs/plugin-react";
import browserslist from "browserslist";
import postcssPresetEnv from "postcss-preset-env";
import Compress from "rollup-plugin-gzip";
import { visualizer } from "rollup-plugin-visualizer";
import { PluginOption, defineConfig, UserConfigFnPromise, UserConfig } from "vite";
import manifestSRI from "vite-plugin-manifest-sri";
import svgr from "vite-plugin-svgr";

import { MastodonAssetsManifest } from "./config/vite/plugin-assets-manifest";
import { GlitchThemes as MastodonThemes } from "./config/vite/plugin-glitch-themes";
import { MastodonNameLookup } from "./config/vite/plugin-name-lookup";
import { MastodonServiceWorkerChunkPaths } from "./config/vite/plugin-sw-chunk-paths";
import { MastodonServiceWorkerLocales } from "./config/vite/plugin-sw-locales";

const jsRoot = path.resolve(__dirname, "app/javascript");

const cssAliasClasses: ReadonlyArray<string> = ["components", "features"];

// Stamped into both the app bundle and the service worker (sw.js) so every
// deploy produces a byte-different sw.js. Without this, sw.js only changed when
// service-worker code itself changed, so ordinary deploys never reached devices
// that already had the app open (see ServiceWorkerUpdateNotice / app_update.ts).
function resolveBuildId(): string {
  if (process.env.BUILD_ID) {
    return process.env.BUILD_ID;
  }

  try {
    return execSync("git rev-parse --short=12 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

export const config: UserConfigFnPromise = async ({ mode, command }) => {
  const isProdBuild = mode === "production" && command === "build";
  const buildId = resolveBuildId();

  let outDirName = "packs-dev";
  if (mode === "test" || mode === "production") {
    outDirName = "packs";
  }
  const outDir = path.resolve("public", outDirName);

  return {
    root: jsRoot,
    base: `/${outDirName}/`,
    envDir: __dirname,
    define: {
      __BUILD_ID__: JSON.stringify(buildId),
    },
    resolve: {
      tsconfigPaths: true,
      alias: {
        "~/": `${jsRoot}/`,
        "@/": `${jsRoot}/`,
      },
    },
    css: {
      modules: {
        generateScopedName(name, filename) {
          let prefix = "";

          const [parentDirName, dirName] = path
            .dirname(filename)
            .split(path.sep)
            .slice(-2)
            .map((dir) => dir.toLowerCase());

          if (parentDirName) {
            if (cssAliasClasses.includes(parentDirName)) {
              prefix = parentDirName.slice(0, 4);
            } else {
              prefix = parentDirName;
            }
          }

          if (dirName) {
            prefix = `${prefix}_${dirName}`;
          }

          const baseName = path.basename(filename, `.module${path.extname(filename)}`);
          if (baseName !== "styles" && baseName !== "style") {
            prefix = `${prefix}_${baseName}`;
          }

          return `_${prefix}__${name}`;
        },
      },
      postcss: {
        plugins: [
          postcssPresetEnv({
            features: {
              "logical-properties-and-values": false,
            },
          }),
        ],
      },
    },
    server: {
      headers: {
        "Service-Worker-Allowed": "/",
      },
      hmr: {
        protocol: "ws",
      },
      port: 3036,
    },
    build: {
      commonjsOptions: { transformMixedEsModules: true },
      chunkSizeWarningLimit: 1 * 1024 * 1024,
      sourcemap: true,
      emptyOutDir: mode !== "production",
      manifest: true,
      outDir,
      assetsDir: "assets",
      assetsInlineLimit: (filePath) => (/\.woff2?$/.exec(filePath) ? false : undefined),
      rolldownOptions: {
        input: await findEntrypoints(),
        output: {
          // Found 2026-10-03: with no manualChunks at all, Rolldown's default
          // algorithm gives every module shared across more than one lazy-
          // loaded route its own separate chunk -- in practice this meant
          // hundreds of individual ~300-700 byte files, one per icon SVG and
          // one per small shared hook/utility, for a single page view. Byte
          // count was already fine (compression fixed that separately), but
          // on a real high-latency mobile connection each of those small
          // files still pays a full round-trip, and that is what was
          // actually causing "still blank after minutes" on a weak signal --
          // confirmed by throttled-network testing, not assumed. Consolidate
          // the two biggest sources of this fragmentation (every icon SVG,
          // and the long tail of node_modules deps) into two coherent
          // bundles instead. Locales keep their existing per-language
          // chunking untouched -- that split is deliberate, so only the
          // locale actually in use downloads.
          manualChunks(id) {
            if (id.includes("/material-icons/")) {
              return "icons";
            }
            // React/ReactDOM/scheduler get their own chunk, separate from the
            // long tail of other node_modules deps below. This does NOT
            // shrink a first-time visitor's total download -- measured
            // 2026-10-03, same total bytes either way, just split across two
            // files. The real benefit is on a return visit after a later
            // deploy: react rarely changes version, so this chunk's hash
            // usually stays stable across ordinary feature deploys, letting
            // the browser skip re-downloading it (~43KB gzipped) while still
            // fetching whatever in "vendor" actually changed.
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-core";
            }
            // The service worker's web_push_notifications.js genuinely needs
            // intl-messageformat + lodash (to format push text in the
            // recipient's locale) -- its only real node_modules dependency.
            // Giving these their own chunk, separate from the catch-all
            // "vendor" bucket below, means sw.js never has to import the
            // whole ~1MB vendor chunk (React, Redux, etc. -- all irrelevant
            // to a background worker) just to reach this one small need.
            // Found 2026-10-04 while tracing why installing an updated
            // service worker could force a vendor re-download.
            if (
              id.includes("node_modules/intl-messageformat") ||
              id.includes("node_modules/lodash")
            ) {
              return "lodash-intl";
            }
            if (id.includes("node_modules") && !id.includes("node_modules/@formatjs")) {
              return "vendor";
            }
            return undefined;
          },
          chunkFileNames({ facadeModuleId, name }) {
            if (!facadeModuleId) return "[name]-[hash].js";
            if (/mastodon\/locales\/[a-zA-Z\-]+\.json/.exec(facadeModuleId)) {
              return "intl/[name]-[hash].js";
            }
            if (/node_modules\/@formatjs\//.exec(facadeModuleId)) {
              const newName = /node_modules\/@formatjs\/([^/]+)\//.exec(facadeModuleId);
              if (newName?.[1]) return `intl/[name]-${newName[1]}-[hash].js`;
            }
            if (name === "index") {
              const parts = facadeModuleId.split("/");
              const parent = parts.at(-2);
              if (parent) return `${parent}-[name]-[hash].js`;
            }
            return "[name]-[hash].js";
          },
          entryFileNames({ name }) {
            // If this is the service worker, don't add the hash to the name.
            if (name === "sw") {
              return "[name].js";
            }
            // Otherwise, use the same value as chunkFileNames.
            return "[name]-[hash].js";
          },
        },
      },
    },
    experimental: {
      renderBuiltUrl: () => undefined,
    },
    worker: {
      format: "es",
    },
    plugins: [
      react(),
      babel({
        plugins: ["transform-react-remove-prop-types"],
      }),
      formatjs(),
      MastodonThemes(),
      MastodonAssetsManifest(),
      MastodonServiceWorkerLocales(),
      MastodonServiceWorkerChunkPaths(),
      legacy({
        renderLegacyChunks: false,
        modernPolyfills: true,
        modernTargets: browserslist.loadConfig({ path: process.cwd() }),
      }),
      isProdBuild && (Compress() as PluginOption),

      // Disabled in development because manifest.json is too large (15k+ lines)
      command === "build" &&
        mode === "production" &&
        manifestSRI({
          manifestPaths: [".vite/manifest.json"],
        }),
      svgr(),
      optimizeLodashImports() as PluginOption,
      !!process.env.ANALYZE_BUNDLE_SIZE &&
        (visualizer({
          template: process.env.CI ? "raw-data" : "treemap",
        }) as PluginOption),
      MastodonNameLookup(),
    ],
  } satisfies UserConfig;
};

async function findEntrypoints() {
  const entrypoints: Record<string, string> = {
    // Every other entrypoint here already builds from the glitch-flavoured
    // source (see the loop below), but this one line was hardcoded to the
    // vanilla file -- found 2026-09-18 while adding SKIP_WAITING handling
    // to flavours/glitch/service_worker/sw.ts for the update-ready prompt:
    // it was silently building and shipping the unmodified vanilla worker
    // instead the whole time.
    sw: path.resolve(jsRoot, "flavours/glitch/service_worker/sw.ts"),
  };

  // JS entrypoints
  const jsEntrypointsDir = path.resolve(jsRoot, "entrypoints");
  const jsEntrypoints = await readdir(jsEntrypointsDir, { withFileTypes: true });
  const jsExtTest = /\.[jt]sx?$/;
  for (const file of jsEntrypoints) {
    if (file.isFile() && jsExtTest.test(file.name)) {
      entrypoints[file.name.replace(jsExtTest, "")] = path.resolve(jsEntrypointsDir, file.name);
    }
  }

  // SCSS entrypoints
  const scssEntrypointsDir = path.resolve(jsRoot, "styles/entrypoints");
  const scssEntrypoints = await readdir(scssEntrypointsDir, { withFileTypes: true });
  const scssExtTest = /\.s?css$/;
  for (const file of scssEntrypoints) {
    if (file.isFile() && scssExtTest.test(file.name)) {
      entrypoints[file.name.replace(scssExtTest, "")] = path.resolve(scssEntrypointsDir, file.name);
    }
  }

  return entrypoints;
}

export default defineConfig(config);
