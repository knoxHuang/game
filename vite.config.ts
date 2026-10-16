import { defineConfig } from 'vite';

let assetBase = '/';

export default defineConfig({
  plugins: [{
    name: 'public-asset-base',
    apply: 'build',
    configResolved(config) {
      assetBase = config.base;
    },
    renderChunk(code) {
      // Vite handles CSS URLs; runtime strings and dungeon JSON need the same base.
      return { code: code.replace(/(?<![\w/])\/assets\//g, `${assetBase}assets/`), map: null };
    },
  }],
});
