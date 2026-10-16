import { defineConfig } from 'vite';
import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let assetBase = '/';
let projectRoot = process.cwd();

export default defineConfig({
  build: { copyPublicDir: false },
  plugins: [{
    name: 'public-asset-base',
    apply: 'build',
    configResolved(config) {
      assetBase = config.base;
      projectRoot = config.root;
    },
    buildStart() {
      // Ship referenced runtime assets, keeping masters and historical art out of Pages.
      const assets = new Set<string>();
      const files = ['index.html', ...globSync('src/**/*.{ts,css,json}', { cwd: projectRoot })];
      for (const file of files) {
        const source = readFileSync(resolve(projectRoot, file), 'utf8');
        for (const match of source.matchAll(/\/assets\/[a-zA-Z0-9_./-]+\.(?:png|webp)/g)) assets.add(match[0]);
      }
      for (const asset of assets) {
        this.emitFile({ type: 'asset', fileName: asset.slice(1), source: readFileSync(resolve(projectRoot, 'public', asset.slice(1))) });
      }
    },
    renderChunk(code) {
      // Vite handles CSS URLs; runtime strings and dungeon JSON need the same base.
      // Keep the dungeon path validator aligned with the relocated JSON URLs.
      const assetPattern = `${assetBase}assets/`.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      return {
        code: code.replace(/(?<![\w/])\/assets\//g, `${assetBase}assets/`)
          .replaceAll('^\\/assets\\/', `^${assetPattern}`),
        map: null,
      };
    },
  }],
});
