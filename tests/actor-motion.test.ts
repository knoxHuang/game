import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMotion } from '../src/actor-motion.ts';

test('步态跟随实际位移，停止、瞬移和减少动态效果时不踏步',()=>{
 const initial=sampleMotion(undefined,{x:10,y:10},false);
 assert.equal(initial.frame,-1);
 const walking=sampleMotion(initial.sample,{x:10.25,y:10},false);
 assert.equal(walking.moving,true);assert.equal(walking.frame,1);
 assert.equal(sampleMotion(walking.sample,{x:10.25,y:10},false).frame,-1);
 assert.equal(sampleMotion(walking.sample,{x:17,y:10},false).frame,-1);
 assert.equal(sampleMotion(walking.sample,{x:10.5,y:10},true).frame,-1);
});
