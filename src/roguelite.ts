import type { CareerId, GameState, Run, Vec } from './model.ts';

export const SKILLS = {
  revolver: { name:'黄铜连射', kind:'attack', max:5, detail:'提高伤害与射速；满阶配航海罗盘可觉醒交叉弹幕。', icon:'weapon' },
  sigil: { name:'溺光符弹', kind:'attack', max:5, detail:'扩大爆炸范围；满阶配感应线圈可觉醒连锁爆裂。', icon:'ritual' },
  harpoon: { name:'贯潮鱼叉', kind:'attack', max:5, detail:'提高贯穿与伤害；满阶配镀铜弹匣可觉醒三叉猎潮。', icon:'harpoon' },
  lantern: { name:'守夜提灯', kind:'attack', max:5, detail:'自动灼烧身边敌群；升级提高伤害与照明半径。', icon:'lamp' },
  arc: { name:'黄铜电弧', kind:'attack', max:5, detail:'自动跳跃打击相邻目标；升级增加跳跃数量。', icon:'device' },
  tide: { name:'退潮符阵', kind:'attack', max:5, detail:'在敌群脚下留下持续伤害的符阵。', icon:'ritual' },
  bell: { name:'沉钟回响', kind:'attack', max:5, detail:'周期震荡周围敌人；升级扩大冲击半径。', icon:'seal' },
  magazine: { name:'镀铜弹匣', kind:'support', max:3, detail:'每阶伤害 +12%。贯潮鱼叉觉醒配件。', icon:'weapon' },
  compass: { name:'航海罗盘', kind:'support', max:3, detail:'每阶收集半径 +0.55，移速 +5%。黄铜连射觉醒配件。', icon:'compass' },
  watch: { name:'怀表机芯', kind:'support', max:3, detail:'每阶攻击间隔缩短 8%。', icon:'device' },
  lining: { name:'防潮内衬', kind:'support', max:3, detail:'每阶生命上限 +15，并恢复新增生命。', icon:'armor' },
  coil: { name:'感应线圈', kind:'support', max:3, detail:'每阶范围 +12%。溺光符弹觉醒配件。', icon:'crystal' },
} as const;
export type SkillId = keyof typeof SKILLS;
export type SkillOffer = SkillId | 'heal' | 'salvage' | 'supply' | `awaken:${'revolver'|'sigil'|'harpoon'}`;
export type RogueRun = {
  xp:number; level:number; picks:number; skills:Partial<Record<SkillId,number>>;
  offers:SkillOffer[]; seed:number; rerolls:number; awakenings:SkillId[]; awakeTokens:number;
  cooldowns:Partial<Record<SkillId,number>>; fields:{pos:Vec; life:number; pulse:number; level:number}[];
  gold:number; research:number; equipment:EquipmentId[]; wavePaid:number;
};
export const EQUIPMENT = {
  service_revolver:{name:'制式枪机',slot:'weapon',detail:'全部伤害 +5%',damage:.05,health:0,pickup:0},
  brass_revolver:{name:'精校枪机',slot:'weapon',detail:'全部伤害 +10%',damage:.10,health:0,pickup:0},
  oilskin:{name:'缝补雨衣',slot:'armor',detail:'生命上限 +10',damage:0,health:10,pickup:0},
  diving_coat:{name:'潜水护衣',slot:'armor',detail:'生命上限 +20',damage:0,health:20,pickup:0},
  pocket_compass:{name:'袖珍罗盘',slot:'charm',detail:'收集半径 +0.5',damage:0,health:0,pickup:.5},
  storm_compass:{name:'风暴罗盘',slot:'charm',detail:'伤害 +5%，收集半径 +0.8',damage:.05,health:0,pickup:.8},
} as const;
export type EquipmentId=keyof typeof EQUIPMENT;
export const EQUIPMENT_UPGRADES:Partial<Record<EquipmentId,EquipmentId>>={service_revolver:'brass_revolver',oilskin:'diving_coat',pocket_compass:'storm_compass'};
export type Research = { energy:number; training:{power:number;vitality:number}; inventory:EquipmentId[]; equipped:Partial<Record<'weapon'|'armor'|'charm',EquipmentId>>; careers:CareerId[]; converted?:boolean };
export const freshResearch=():Research=>({energy:0,training:{power:0,vitality:0},inventory:['service_revolver','oilskin'],equipped:{weapon:'service_revolver',armor:'oilskin'},careers:['investigator']});
export const mainSkill=(career:CareerId):SkillId=>career==='occultist'?'sigil':career==='harpooner'?'harpoon':'revolver';
export const freshRogue=(career:CareerId,seed:number):RogueRun=>({xp:0,level:1,picks:0,skills:{[mainSkill(career)]:1},offers:[],seed:Math.max(1,seed>>>0),rerolls:1,awakenings:[],awakeTokens:0,cooldowns:{},fields:[],gold:0,research:0,equipment:[],wavePaid:0});
export const localRequired=(level:number)=>12+4*(level-1);
export const skillLevel=(s:GameState,id:SkillId)=>s.run?.rogue?.skills[id]??0;
export const equipmentStats=(s:GameState)=>Object.values(s.research?.equipped??{}).reduce((a,id)=>{const d=EQUIPMENT[id];return {damage:a.damage+d.damage,health:a.health+d.health,pickup:a.pickup+d.pickup};},{damage:0,health:0,pickup:0});
export const rogueDamage=(s:GameState)=>1+Math.min(.35,(s.research?.training.power??0)*.04+equipmentStats(s).damage)+skillLevel(s,'magazine')*.12;
export const rogueHealth=(s:GameState)=>100+Math.min(40,(s.research?.training.vitality??0)*4+equipmentStats(s).health)+skillLevel(s,'lining')*15;
export const rogueCooldown=(s:GameState)=>1-skillLevel(s,'watch')*.08;
export const rogueArea=(s:GameState)=>1+skillLevel(s,'coil')*.12;
export const pickupRadius=(s:GameState)=>1.1+skillLevel(s,'compass')*.55+equipmentStats(s).pickup;
function random(r:RogueRun){r.seed=(Math.imul(r.seed,1664525)+1013904223)>>>0;return r.seed/4294967296;}
const recipes={revolver:'compass',sigil:'coil',harpoon:'magazine'} as const;
export function eligibleOffers(r:RogueRun):SkillOffer[]{
  const owned=Object.keys(r.skills) as SkillId[];
  const attacks=owned.filter(id=>SKILLS[id].kind==='attack').length,supports=owned.length-attacks;
  const main=owned.find(id=>id in recipes);
  const pool:SkillOffer[]=(Object.keys(SKILLS) as SkillId[]).filter(id=>{
    const level=r.skills[id]??0;
    if(level)return level<SKILLS[id].max;
    if(id in recipes)return false;
    return SKILLS[id].kind==='attack'?attacks<3:supports<3;
  });
  if(main&&main in recipes&&r.skills[main]===5&&r.skills[recipes[main as keyof typeof recipes]]===3&&r.awakeTokens>0&&!r.awakenings.includes(main))pool.unshift(`awaken:${main as keyof typeof recipes}`);
  return pool;
}
export function rollOffers(r:RogueRun):void {
  const pool=eligibleOffers(r),offers:SkillOffer[]=[];
  const awake=pool.find(id=>id.startsWith('awaken:'));
  if(awake){offers.push(awake);pool.splice(pool.indexOf(awake),1);}
  const owned=pool.filter(id=>!id.startsWith('awaken:')&&!!r.skills[id as SkillId]);
  if(!offers.length&&owned.length){const pick=owned[Math.floor(random(r)*owned.length)];offers.push(pick);pool.splice(pool.indexOf(pick),1);}
  // Offer early area coverage before the player commits all three attack slots.
  if(r.picks<3&&!(r.skills.lantern||r.skills.arc||r.skills.tide||r.skills.bell)&&offers.length<3){
    const area=pool.filter(id=>['lantern','arc','tide','bell'].includes(id));
    if(area.length){const pick=area[Math.floor(random(r)*area.length)];offers.push(pick);pool.splice(pool.indexOf(pick),1);}
  }
  while(offers.length<3&&pool.length){const i=Math.floor(random(r)*pool.length);offers.push(pool.splice(i,1)[0]);}
  for(const fallback of ['heal','salvage','supply'] as const)if(offers.length<3)offers.push(fallback);
  r.offers=offers;
}
export function addLocalXp(r:RogueRun,amount:number){r.xp+=amount;if(!r.offers.length&&r.xp>=localRequired(r.level))rollOffers(r);}
export function chooseSkill(s:GameState,offer:string):string|null{
  const r=s.run?.rogue;if(!r||!r.offers.includes(offer as SkillOffer))return '这项选择已失效。';
  if(offer==='heal')s.run!.player.hp=Math.min(rogueHealth(s),s.run!.player.hp+30);
  else if(offer==='supply'){if(s.run!.player.potions<2)s.run!.player.potions++;else s.run!.player.hp=Math.min(rogueHealth(s),s.run!.player.hp+30);}
  else if(offer==='salvage')r.research+=10;
  else if(offer.startsWith('awaken:')){const id=offer.slice(7) as SkillId;r.awakenings.push(id);r.awakeTokens--;}
  else {const id=offer as SkillId;r.skills[id]=(r.skills[id]??0)+1;if(id==='lining'&&s.run!.player.hp>0)s.run!.player.hp+=15;}
  r.xp-=localRequired(r.level);r.level++;r.picks++;r.offers=[];
  if(r.xp>=localRequired(r.level))rollOffers(r);
  return null;
}
export function rerollSkills(s:GameState):string|null{const r=s.run?.rogue;if(!r?.offers.length||!r.rerolls)return '本局重选次数已用完。';r.rerolls--;rollOffers(r);return null;}
export function train(s:GameState,id:string):string|null{
  if(!s.research||s.run||!(id==='power'||id==='vitality'))return '请回调查所训练。';
  const level=s.research.training[id],energy=20+level*15,gold=15+level*10;
  if(level>=5)return '此项训练已满。';
  if(s.research.energy<energy||s.gold<gold)return `需要研究能量 ${energy}、冥币 ${gold}。`;
  s.research.energy-=energy;s.gold-=gold;s.research.training[id]++;return null;
}
export function equip(s:GameState,id:string):string|null{
  if(!s.research||s.run||!(id in EQUIPMENT)||!s.research.inventory.includes(id as EquipmentId))return '当前无法更换这件装备。';
  const item=id as EquipmentId;s.research.equipped[EQUIPMENT[item].slot]=item;return null;
}
export function improveEquipment(s:GameState,id:string):string|null{
  const next=EQUIPMENT_UPGRADES[id as EquipmentId];
  if(!s.research||s.run||!next||!s.research.inventory.includes(id as EquipmentId))return '此装备不能继续强化。';
  if(s.research.inventory.includes(next))return '已经拥有强化版本。';
  if(s.gold<35||s.research.energy<25||s.materials.iron<2)return '需要冥币 35、研究能量 25、零件 2。';
  s.gold-=35;s.research.energy-=25;s.materials.iron-=2;s.research.inventory.push(next);s.research.equipped[EQUIPMENT[next].slot]=next;return null;
}
export function unlockCareer(s:GameState,id:CareerId):string|null{
  const r=s.research;if(!r||s.run)return '请回调查所转职。';
  if(r.careers.includes(id)){s.career=id;return null;}
  if(!s.tutorialDone)return '先提交失联船员案件，完成首次外勤。';
  if(r.careers.length>1){if(s.gold<60||r.energy<50)return '需要冥币 60、研究能量 50。';s.gold-=60;r.energy-=50;}
  r.careers.push(id);s.career=id;return null;
}
export function convertLegacy(s:GameState):string|null{
  if(s.research)return '此档案已经使用新成长规则。';
  if(s.run)return '请先结束当前调查，再转换成长规则。';
  s.research=freshResearch();s.research.converted=true;s.research.energy=s.energy??0;
  s.research.careers=['investigator','occultist','harpooner'];
  if(s.skill){s.gold=Math.min(1e9,s.gold+90);s.materials.crystal=Math.min(1e9,s.materials.crystal+4);s.materials.iron=Math.min(1e9,s.materials.iron+2);}
  if(s.weapon){s.research.inventory.push('brass_revolver');s.research.equipped.weapon='brass_revolver';}
  if(s.armor){s.research.inventory.push('diving_coat');s.research.equipped.armor='diving_coat';}
  return null;
}
export function settleRogue(s:GameState,run:Run){
  if(!s.research||!run.rogue)return;
  const r=run.rogue;s.gold=Math.min(1e9,s.gold+r.gold);s.research.energy=Math.min(1e9,s.research.energy+r.research);
  for(const item of r.equipment)if(!s.research.inventory.includes(item))s.research.inventory.push(item);
}
