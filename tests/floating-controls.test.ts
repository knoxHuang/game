import test from 'node:test';
import assert from 'node:assert/strict';
import { freshState, usePotion, maxHealth } from '../src/model.ts';
import { startRun } from '../src/maps.ts';
import { parseSave } from '../src/storage.ts';
import { bindBattleControls } from '../src/battle-controls.ts';

class ControlElement extends EventTarget {
  dataset: Record<string,string> = {};
  disabled=false;
  hasAttribute(name:string){return name==='disabled'&&this.disabled;}
  style = { transform:'',left:'',top:'' };
  classes = new Set<string>();
  classList = { add:(name:string)=>this.classes.add(name),remove:(name:string)=>this.classes.delete(name),contains:(name:string)=>this.classes.has(name) };
  captured:number|null=null;
  nodes = new Map<string,ControlElement>();
  querySelector(selector:string){return this.nodes.get(selector)??null;}
  closest(){return this.dataset.touch?this:null;}
  getBoundingClientRect(){return {left:20,top:10,right:380,bottom:650,width:360,height:640};}
  setPointerCapture(id:number){this.captured=id;}
  hasPointerCapture(id:number){return this.captured===id;}
  releasePointerCapture(){this.captured=null;}
}
function pointer(element:ControlElement,type:string,id:number,x:number,y:number){
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{pointerId:id,clientX:x,clientY:y,button:0});element.dispatchEvent(event);
}
function fixture(onDispatch?:(name:string,value?:string)=>void){
  const area=new ControlElement(),stick=new ControlElement(),knob=new ControlElement(),actions=new ControlElement(),dodge=new ControlElement();
  dodge.dataset.touch='dodge';
  stick.nodes.set('.stick-knob',knob);
  const messages:Array<[string,string|undefined]>=[];let paused=false;
  const release=bindBattleControls({area,stick,actions,isBlocked:()=>paused,dispatch:(name,value)=>{messages.push([name,value]);onDispatch?.(name,value);},onLockedSkill:()=>{}});
  const move=()=>messages.filter(([name])=>name==='move').at(-1)?.[1]?.split(',').map(Number);
  return {area,stick,knob,actions,dodge,messages,move,pause:()=>{paused=true;release();}};
}

test('浮动摇杆从实际按下点计算方向，出圈仍持续满速，松手停止',()=>{
  const f=fixture();pointer(f.area,'pointerdown',1,170,270);
  assert.deepEqual(f.move(),[0,0]);assert.equal(f.stick.style.left,'150px');assert.equal(f.stick.style.top,'260px');
  pointer(f.area,'pointermove',1,173,271);assert.deepEqual(f.move(),[0,0],'中心死区不误移动');
  pointer(f.area,'pointermove',1,600,270);assert.deepEqual(f.move(),[1,0],'超出圆圈和屏幕仍移动');assert.equal(f.area.captured,1);
  pointer(f.area,'pointermove',1,170,-100);assert.deepEqual(f.move(),[0,-1]);
  pointer(f.area,'pointerup',1,170,-100);assert.deepEqual(f.move(),[0,0]);assert.equal(f.stick.classes.has('is-active'),false);
});

test('第二触点的闪避与释放不影响移动，移动触点不会串成动作',()=>{
  const f=fixture();pointer(f.area,'pointerdown',1,80,250);pointer(f.area,'pointermove',1,200,250);
  pointer(f.area,'pointerdown',2,220,300);pointer(f.area,'pointerup',2,220,300);assert.deepEqual(f.move(),[1,0]);
  // Preserve the button target when routing its pointer event through the action cluster.
  const event=new Event('pointerdown',{cancelable:true});Object.assign(event,{pointerId:2});
  f.dodge.dispatchEvent(event);
  Object.defineProperty(event,'target',{value:f.dodge});f.actions.dispatchEvent(event);
  assert.equal(f.messages.filter(([name])=>name==='pulse:dodge').length,1);
  pointer(f.actions,'pointerup',2,300,550);assert.deepEqual(f.move(),[1,0]);
  pointer(f.area,'pointermove',1,300,550);assert.equal(f.messages.filter(([name])=>name==='pulse:dodge').length,1);
  pointer(f.area,'pointerup',1,300,550);assert.deepEqual(f.move(),[0,0]);
});

test('边缘按下不产生位移；取消、丢失捕获或暂停后不残留移动',()=>{
  for(const ending of ['pointercancel','lostpointercapture','pause']){
    const f=fixture();pointer(f.area,'pointerdown',1,22,12);assert.deepEqual(f.move(),[0,0]);
    pointer(f.area,'pointermove',1,90,80);const diagonal=f.move()!;assert.ok(Math.abs(Math.hypot(...diagonal)-1)<.002);
    if(ending==='pause')f.pause();else pointer(f.area,ending,1,90,80);
    assert.deepEqual(f.move(),[0,0]);assert.equal(f.stick.classes.has('is-active'),false);
    const count=f.messages.length;pointer(f.area,'pointermove',1,200,200);assert.equal(f.messages.length,count);
    if(ending==='pause'){pointer(f.area,'pointerdown',3,180,280);assert.equal(f.stick.classes.has('is-active'),false);assert.equal(f.area.captured,null);}
  }
});


test('先松开移动手指时，另一个交互触点继续保持；暂停阻止新动作',()=>{
  const f=fixture(),interact=new ControlElement();interact.dataset.touch='interact';
  pointer(f.area,'pointerdown',1,80,250);pointer(f.area,'pointermove',1,200,250);
  const event=new Event('pointerdown',{cancelable:true});Object.assign(event,{pointerId:2});Object.defineProperty(event,'target',{value:interact});f.actions.dispatchEvent(event);
  assert.equal(f.messages.filter(([name])=>name==='hold-interact').at(-1)?.[1],'1');
  pointer(f.area,'pointerup',1,200,250);assert.deepEqual(f.move(),[0,0]);assert.equal(f.actions.captured,2);
  assert.equal(f.messages.filter(([name])=>name==='hold-interact').at(-1)?.[1],'1');
  pointer(f.actions,'pointerup',2,200,250);assert.equal(f.messages.filter(([name])=>name==='hold-interact').at(-1)?.[1],'0');
  f.pause();const count=f.messages.length;
  const blocked=new Event('pointerdown',{cancelable:true});Object.assign(blocked,{pointerId:3});Object.defineProperty(blocked,'target',{value:f.dodge});f.actions.dispatchEvent(blocked);assert.equal(f.messages.length,count);
});


test('移动时急救只在按钮内松手使用一次，拖出、取消和跨按钮滑动不消耗',()=>{
  const state=freshState();startRun(state);state.run!.player.hp=35;
  const f=fixture(name=>{if(name==='pulse:potion')assert.equal(usePotion(state),null);});
  const potion=new ControlElement();potion.dataset.touch='potion';
  const down=(target:ControlElement)=>{const event=new Event('pointerdown',{cancelable:true});Object.assign(event,{pointerId:2});Object.defineProperty(event,'target',{value:target});f.actions.dispatchEvent(event);};
  pointer(f.area,'pointerdown',1,80,250);pointer(f.area,'pointermove',1,200,250);
  down(potion);assert.equal(state.run!.player.potions,1,'按下尚未消耗');pointer(f.actions,'pointerup',2,40,40);
  assert.equal(state.run!.player.hp,75);assert.equal(state.run!.player.potions,0);assert.equal(state.run!.potionsUsed,1);assert.deepEqual(f.move(),[1,0]);
  pointer(f.actions,'pointerup',2,40,40);assert.equal(state.run!.potionsUsed,1);
  state.run!.player.potions=1;
  for(const ending of ['pointercancel','lostpointercapture']){down(potion);pointer(f.actions,ending,2,40,40);assert.equal(state.run!.player.potions,1);}
  down(potion);pointer(f.actions,'pointerup',2,500,700);assert.equal(state.run!.player.potions,1);
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{elementFromPoint:()=>potion}});
  try{down(f.dodge);pointer(f.actions,'pointermove',2,40,40);pointer(f.actions,'pointerup',2,40,40);assert.equal(state.run!.player.potions,1);}finally{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
  const loaded=parseSave(JSON.stringify(state));assert.equal(loaded.run!.player.hp,75);assert.equal(loaded.run!.potionsUsed,1);
});

test('急救在满血或耗尽时不消耗，治疗不超过生命上限',()=>{
  const state=freshState();startRun(state);const player=state.run!.player;
  assert.equal(usePotion(state),'生命已满。');assert.equal(player.potions,1);assert.equal(state.run!.potionsUsed,0);
  player.hp=maxHealth(state)-5;assert.equal(usePotion(state),null);assert.equal(player.hp,maxHealth(state));assert.equal(player.potions,0);
  player.hp=10;assert.equal(usePotion(state),'补给已用完。');assert.equal(player.hp,10);assert.equal(state.run!.potionsUsed,1);
});

test('键盘急救只响应无指针点击，禁用时不触发，也不重复响应触摸点击',()=>{
  const f=fixture(),potion=new ControlElement();potion.dataset.touch='potion';
  const click=(detail:number)=>{const event=new Event('click');Object.assign(event,{detail});Object.defineProperty(event,'target',{value:potion});f.actions.dispatchEvent(event);};
  click(1);assert.equal(f.messages.length,0);
  potion.disabled=true;click(0);assert.equal(f.messages.length,0);
  potion.disabled=false;click(0);assert.deepEqual(f.messages,[['pulse:potion',undefined]]);
  f.pause();click(0);assert.equal(f.messages.length,1);
});
