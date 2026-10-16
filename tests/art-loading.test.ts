import test from 'node:test';
import assert from 'node:assert/strict';
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { preloadArt, queueDungeonArt } from '../src/art-loading.ts';
import { DUNGEONS, assetKey } from '../src/content/registry.ts';

function loader(cached = new Set<string>()) {
  const requests: { key: string; src: string }[] = [];
  return {
    requests,
    textures: { exists: (key: string) => cached.has(key) },
    load: {
      image: (key: string, src: string) => requests.push({ key, src }),
      spritesheet: (key: string, src: string) => requests.push({ key, src }),
    },
  };
}

test('启动覆盖全部实际引用的图片，海图和战区背景不会在进入后才请求', () => {
  const scene = loader(), keys = preloadArt(scene);
  const root = fileURLToPath(new URL('../', import.meta.url));
  const referenced = new Set<string>();
  for (const file of ['index.html', ...globSync('src/**/*.{ts,css,json}', { cwd: root })]) {
    for (const match of readFileSync(resolve(root, file), 'utf8').matchAll(/\/assets\/[a-zA-Z0-9_./-]+\.(?:png|webp)/g)) referenced.add(match[0]);
  }
  assert.deepEqual(new Set(scene.requests.map(request => request.src)), referenced);
  assert.equal(new Set(scene.requests.map(request => request.key)).size, keys.length);
  assert.ok(keys.includes(assetKey('tide_colossus', 'background')));
});

test('启动资源就绪后，进入任一现有副本不再补载战斗图片', () => {
  const keys = preloadArt(loader());
  const scene = loader(new Set(keys));
  for (const pack of DUNGEONS) queueDungeonArt(scene, pack.id);
  assert.equal(scene.requests.length, 0);
});

test('全失败可用新地址重试，部分成功时保留成功资源与完整进度总数', () => {
  const first = loader(), all = preloadArt(first);
  const cached = new Set(['lobby-cutaway', 'item-atlas']);
  const retry = loader(cached), keys = preloadArt(retry, 'attempt-2');
  assert.deepEqual(keys, all);
  assert.equal(retry.requests.length, first.requests.length - cached.size);
  assert.ok(retry.requests.every(request => !cached.has(request.key) && request.src.endsWith('?retry=attempt-2')));
});
