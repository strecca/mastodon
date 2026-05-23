import { readdir } from 'node:fs/promises';
import path from 'node:path';

import formatjs from '@formatjs/unplugin/vite';
import { optimizeLodashImports } from '@optimize-lodash/rollup-plugin';
import babel from '@rolldown/plugin-babel';
import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import postcssPresetEnv from 'postcss-preset-env';
import Compress from 'rollup-plugin-gzip';
import { visualizer } from 'rollup-plugin-visualizer';
import {
  PluginOption,
  defineConfig,
  UserConfigFnPromise,
  UserConfig,
} from 'vite';
import manifestSRI from 'vite-plugin-manifest-sri';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';

import { MastodonAssetsManifest } from './config/vite/plugin-assets-manifest';
import { MastodonEmojiCompressed } from './config/vite/plugin-emoji-compressed';
import { GlitchThemes as MastodonThemes } from './config/vite/plugin-glitch-themes';
import { MastodonNameLookup } from './config/vite/plugin-name-lookup';
import { MastodonServiceWorkerLocales } from './config/vite/plugin-sw-locales';

const jsRoot = path.resolve(__dirname, 'app/javascript');

const cssAliasClasses: ReadonlyArray<string> = ['components', 'features'];

export const config: UserConfigFnPromise = async ({ mode, command }) => {
  const isProdBuild = mode === 'production' && command === 'build';

  let outDirName = 'packs-dev';
  if (mode === 'test') {
    outDirName = 'packs-test';
  } else if (mode === 'production') {
    outDirName = 'packs';
  }
  const outDir = path.resolve('public', outDirName);

  return {
    root: jsRoot,
    base: `/${outDirName}/`,
    envDir: __dirname,
    resolve: {
      tsconfigPaths: true,
      alias: {
        '~/': `${jsRoot}/`,
        '@/': `${jsRoot}/`,
      },
    },
    css: {
      modules: {
        generateScopedName(name, filename) {
          let prefix = '';

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

          const baseName = path.basename(
            filename,
            `.module${path.extname(filename)}`,
          );
          if (baseName !== 'styles' && baseName !== 'style') {
            prefix = `${prefix}_${baseName}`;
          }

          return `_${prefix}__${name}`;
        },
      },
      postcss: {
        plugins: [
          postcssPresetEnv({
            features: {
              'logical-properties-and-values': false,
            },
          }),
        ],
      },
    },
    server: {
      headers: {
        'Service-Worker-Allowed': '/',
      },
      hmr: {
        protocol: 'ws',
      },
      port: 3036,
    },
    build: {
      commonjsOptions: { transformMixedEsModules: true },
      chunkSizeWarningLimit: 1 * 1024 * 1024,
      sourcemap: true,
      emptyOutDir: mode !== 'production',
      manifest: true,
      outDir,
      assetsDir: 'assets',
      assetsInlineLimit: (filePath) =>
        /\.woff2?$/.exec(filePath) ? false : undefined,
      rolldownOptions: {
        input: await findEntrypoints(),
        output: {
          chunkFileNames({ facadeModuleId, name }) {
            if (!facadeModuleId) return '[name]-[hash].js';
            if (/mastodon\/locales\/[a-zA-Z\-]+\.json/.exec(facadeModuleId)) {
              return 'intl/[name]-[hash].js';
            }
            if (/node_modules\/@formatjs\//.exec(facadeModuleId)) {
              const newName = /node_modules\/@formatjs\/([^/]+)\//.exec(facadeModuleId);
              if (newName?.[1]) return `intl/[name]-${newName[1]}-[hash].js`;
            }
            if (name === 'index') {
              const parts = facadeModuleId.split('/');
              const parent = parts.at(-2);
              if (parent) return `${parent}-[name]-[hash].js`;
            }
            return '[name]-[hash].js';
          },
        },
      },
    },
    experimental: {
      renderBuiltUrl: () => undefined,
    },
    worker: {
      format: 'es',
    },
    plugins: [
      react(),
      babel({
        plugins: ['transform-react-remove-prop-types'],
      }),
      formatjs(),
      MastodonThemes(),
      MastodonAssetsManifest(),
      MastodonServiceWorkerLocales(),
      MastodonEmojiCompressed(),
      legacy({
        renderLegacyChunks: false,
        modernPolyfills: true,
      }),
      isProdBuild && (Compress() as PluginOption),

      // Disabled in development because manifest.json is too large (15k+ lines)
      command === 'build' && mode === 'production' &&
        manifestSRI({
          manifestPaths: ['.vite/manifest.json'],
        }),

      VitePWA({
        srcDir: path.resolve(jsRoot, 'mastodon/service_worker'),
        strategies: 'injectManifest',
        manifest: false,
        injectRegister: false,
        injectManifest: {
          injectionPoint: undefined,
          buildPlugins: {
            vite: [
              MastodonServiceWorkerLocales(),
              MastodonEmojiCompressed(),
            ],
          },
        },
        workbox: {
          // @ts-expect-error codeSplitting exists in workbox-build ≥7 but is absent from the bundled GenerateSWOptions types
          codeSplitting: false,
        },
        outDir: path.resolve(__dirname, 'public/packs'),
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),

      svgr(),
      optimizeLodashImports() as PluginOption,
      !!process.env.ANALYZE_BUNDLE_SIZE &&
        (visualizer({
          template: process.env.CI ? 'raw-data' : 'treemap',
        }) as PluginOption),
      MastodonNameLookup(),
    ],
  } satisfies UserConfig;
};

async function findEntrypoints() {
  const entrypoints: Record<string, string> = {};

  // JS entrypoints
  const jsEntrypointsDir = path.resolve(jsRoot, 'entrypoints');
  const jsEntrypoints = await readdir(jsEntrypointsDir, { withFileTypes: true });
  const jsExtTest = /\.[jt]sx?$/;
  for (const file of jsEntrypoints) {
    if (file.isFile() && jsExtTest.test(file.name)) {
      entrypoints[file.name.replace(jsExtTest, '')] = path.resolve(
        jsEntrypointsDir,
        file.name,
      );
    }
  }

  // SCSS entrypoints
  const scssEntrypointsDir = path.resolve(jsRoot, 'styles/entrypoints');
  const scssEntrypoints = await readdir(scssEntrypointsDir, { withFileTypes: true });
  const scssExtTest = /\.s?css$/;
  for (const file of scssEntrypoints) {
    if (file.isFile() && scssExtTest.test(file.name)) {
      entrypoints[file.name.replace(scssExtTest, '')] = path.resolve(
        scssEntrypointsDir,
        file.name,
      );
    }
  }

  return entrypoints;
}

export default defineConfig(config);