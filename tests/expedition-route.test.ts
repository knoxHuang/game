import test from 'node:test';
import assert from 'node:assert/strict';
import { DUNGEONS, dungeon } from '../src/content/registry.ts';
import { dungeonAccess, finishRun, freshState } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { parseSave, validState } from '../src/storage.ts';
import { renderExpeditionPanel } from '../src/expedition-panel.ts';

test('海图按危险从低到高排列，首区无需扩建即可自由出发', () => {
  assert.deepEqual(DUNGEONS.map(d => d.id), ['tide_colossus', 'many_eyed_priest', 'cthulhu_avatar']);
  const s = freshState('legacy');
  assert.equal(dungeonAccess(s, 'tide_colossus').available, true);
  assert.equal(startRun(s), null);
  assert.equal(s.run?.boss, 'tide_colossus');
});

test('后区按前区报告、基地和内容完成状态开放，出发入口不能绕过', () => {
  const s = freshState('legacy'), pack = dungeon('many_eyed_priest'), previousStatus = pack.status;
  const initial = dungeonAccess(s, pack.id);
  assert.equal(initial.available, false);
  assert.equal(initial.reasons.length, 3);
  s.selectedBoss = pack.id;
  const before = JSON.stringify(s);
  assert.ok(startRun(s));
  assert.equal(JSON.stringify(s), before);
  try {
    // Test the gate independently from unfinished art in the real pack.
    pack.status = 'ready';
    assert.equal(dungeonAccess(s, pack.id).available, false);
    s.bossReports = ['tide_colossus'];
    assert.equal(dungeonAccess(s, pack.id).available, false);
    s.shop = 2;
    assert.equal(dungeonAccess(s, pack.id).available, true);
    assert.equal(dungeonAccess(s, 'cthulhu_avatar').available, false);
  } finally { pack.status = previousStatus; }
  assert.equal(dungeonAccess(s, pack.id).available, false, '未完成的内容不能启程');
});

test('击败Boss后退出也按成功记录报告，重复调查和重载不复制', () => {
  const s = freshState('legacy');
  startRun(s); finishRun(s, true);
  assert.deepEqual(s.bossReports, []);
  startRun(s); s.run!.battle!.won = true; finishRun(s, false);
  assert.deepEqual(s.bossReports, ['tide_colossus']);
  for (let i = 0; i < 2; i++) {
    startRun(s); s.run!.battle!.won = true; finishRun(s, true);
  }
  assert.deepEqual(s.bossReports, ['tide_colossus']);
  assert.deepEqual(parseSave(JSON.stringify(s)).bossReports, ['tide_colossus']);
});

test('旧档缺少报告字段可读，未知或重复报告被拒绝，预览不修改存档', () => {
  const s = freshState('legacy'); delete s.bossReports;
  assert.equal(dungeonAccess(parseSave(JSON.stringify(s)), 'tide_colossus').available, true);
  assert.equal(validState({ ...s, bossReports: ['missing'] }), false);
  assert.equal(validState({ ...s, bossReports: ['tide_colossus', 'tide_colossus'] }), false);
  const before = JSON.stringify(s);
  const html = renderExpeditionPanel(s, { preview: 'cthulhu_avatar', icon: () => '' });
  assert.match(html, /航线未开放/);
  assert.equal(JSON.stringify(s), before);
});
