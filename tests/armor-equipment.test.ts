import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, maxHealth, setArmorEquipped, wearingArmor } from '../src/model.ts';
import { parseSave, validState } from '../src/storage.ts';
import { startRun } from '../src/maps.ts';

test('开局穿雨衣，穿脱不丢加固进度且存档往返保留状态', () => {
  const state = freshState('legacy');
  assert.equal(wearingArmor(state), true);
  state.armor = 1;
  assert.equal(maxHealth(state), 120);
  assert.equal(setArmorEquipped(state, false), null);
  assert.equal(maxHealth(state), 100);
  const loaded = parseSave(JSON.stringify(state));
  assert.equal(wearingArmor(loaded), false);
  assert.equal(loaded.armor, 1);
  assert.equal(setArmorEquipped(loaded, true), null);
  assert.equal(maxHealth(loaded), 120);
});

test('旧档默认仍穿雨衣，非法穿戴字段被拒绝', () => {
  const old = freshState('legacy');
  delete old.armorEquipped;
  assert.equal(wearingArmor(parseSave(JSON.stringify(old))), true);
  assert.equal(validState({ ...old, armorEquipped: 'false' }), false);
});

test('调查中不能更换护具，起始生命使用真实穿戴状态', () => {
  const state = freshState('legacy');
  state.armor = 1;
  setArmorEquipped(state, false);
  startRun(state);
  assert.equal(state.run?.player.hp, 100);
  assert.ok(setArmorEquipped(state, true));
  assert.equal(wearingArmor(state), false);
});
