import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS_BY_ID, dungeon } from '../src/content/registry.ts';
import { WORLD_REGIONS, WORLD_SIZE } from '../src/content/world-map.ts';
import { dungeonAccess, freshState } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { clampVoyageScroll, voyageFocus } from '../src/world-map.ts';

test('拖动首尾与小尺寸视口都限制在底图范围内', () => {
  assert.equal(clampVoyageScroll(-10000, 900, 300), 0);
  assert.equal(clampVoyageScroll(10000, 900, 300), 600);
  assert.equal(clampVoyageScroll(400, 200, 500), 0);
  for (const height of [180, 328, 584]) {
    assert.equal(voyageFocus(0, 0, 1000, height, 1000), 0);
    assert.ok(voyageFocus(WORLD_SIZE.height, 0, 1000, height, 1000) <= 1000 - height);
  }
});

test('定位地点时保留Boss与地名的完整范围，窄屏不裁掉头部', () => {
  for (const height of [242, 372, 628]) {
    const above = Math.min(160, height * .46) + 8, below = 56;
    const scroll = voyageFocus(WORLD_SIZE.height / 2, 0, 1200, height, 1200, above, below);
    const anchor = 600 - scroll;
    assert.ok(anchor - above >= 0, 'Boss上缘应在视口内');
    assert.ok(anchor + below <= height, '地名下缘应在视口内');
    assert.ok(Math.abs((anchor - above) - (height - anchor - below)) < .01, '整体居中');
  }
});

test('四片海域由下向上推进，化身属于未开放的终章海域', () => {
  assert.equal(WORLD_REGIONS.length, 4);
  assert.ok(WORLD_REGIONS.every((r, i) => !i || WORLD_REGIONS[i - 1].y > r.y));
  assert.equal(dungeon('cthulhu_avatar').map.region, 'forbidden');
  assert.equal(WORLD_REGIONS.at(-1)?.charted, false);
});

test('新增Boss的前置报告独立于排序，不因插入顺序跳过或改变解锁', () => {
  const fixture = structuredClone(dungeon('tide_colossus'));
  fixture.id = 'test_side_boss'; fixture.status = 'ready';
  fixture.map.requires = ['tide_colossus']; fixture.map.order = 0;
  Object.assign(DUNGEONS_BY_ID, { [fixture.id]: fixture });
  try {
    const s = freshState('legacy');
    assert.equal(dungeonAccess(s, fixture.id).available, false);
    s.bossReports = ['tide_colossus'];
    assert.equal(dungeonAccess(s, fixture.id).available, true);
    fixture.map.order = 999;
    assert.equal(dungeonAccess(s, fixture.id).available, true);
  } finally { Reflect.deleteProperty(DUNGEONS_BY_ID, fixture.id); }
});

test('现有两份报告不足以直接进入终章，非法启程不修改状态', () => {
  const s = freshState('legacy'), late = dungeon('cthulhu_avatar'), previous = late.status;
  s.shop = 2; s.bossReports = ['tide_colossus', 'many_eyed_priest']; s.selectedBoss = late.id;
  try {
    late.status = 'ready';
    assert.equal(dungeonAccess(s, late.id).available, false);
    assert.ok(dungeonAccess(s, late.id).reasons.some(r => r.includes('深渊')));
    const before = JSON.stringify(s);
    assert.ok(startRun(s)); assert.equal(JSON.stringify(s), before);
  } finally { late.status = previous; }
});
