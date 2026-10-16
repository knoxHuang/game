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
