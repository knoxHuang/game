import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { dungeonSchema, DEFAULT_DUNGEON } from '../src/content/schema.ts';
import type { DungeonDefinition, SpriteDefinition } from '../src/content/schema.ts';
import { imageInfo } from './image-info.ts';
import { worldRegion, worldPoint } from '../src/content/world-map.ts';
import { arenaBounds } from '../src/arena-bounds.ts';

export async function checkContent(directory='src/content/dungeons', publicRoot='public') {
  const errors:string[]=[],warnings:string[]=[],packs:DungeonDefinition[]=[];
  const names=(await readdir(directory)).filter(n=>n.endsWith('.json')).sort();
  for(const name of names) {
    try {const pack=dungeonSchema.parse(JSON.parse(await readFile(join(directory,name),'utf8')));if(basename(name,'.json')!==pack.id)throw new Error('文件名必须等于副本 id');packs.push(pack);}
    catch(error){errors.push(`${name}: ${error instanceof Error?error.message:String(error)}`);}
  }
  const ids=new Set<string>();
  for(const pack of packs) {
    const fail=(message:string)=>errors.push(`${pack.id}: ${message}`);
    const quality=(message:string)=>(pack.status==='ready'?errors:warnings).push(`${pack.id}: ${message}`);
    if(ids.has(pack.id))fail('重复副本 id');ids.add(pack.id);
    if(!worldRegion(pack.map.region))fail('未知世界海域');
    if(new Set(pack.map.requires).size!==pack.map.requires.length)fail('重复的前置报告');
    const paths=new Set<string>();
    async function asset(src:string,kind:'portrait'|'card'|'background'|'tile'|'sprite'|'effect',sprite?:SpriteDefinition) {
      paths.add(src);
      try {
        const path=resolve(publicRoot,'.'+src),data=await readFile(path),info=imageInfo(data);
        if(kind==='portrait'&&(info.width!==128||info.height!==128||data.length>64*1024))quality('头像须为 128×128，且不超过 64 KiB');
        if(kind==='card'&&(info.width!==384||info.height!==576||data.length>384*1024))quality('绘图卡须为 384×576，且不超过 384 KiB');
        if(kind==='background'&&(info.width!==pack.arena.width*32||info.height!==pack.arena.height*32||data.length>768*1024))quality(`战区背景须为 ${pack.arena.width*32}×${pack.arena.height*32}，且不超过 768 KiB`);
        if(kind==='tile'&&(info.width>256||info.height>256||data.length>128*1024))quality('地形单图最多 256×256 / 128 KiB');
        if(kind==='effect'&&(!info.alpha||info.width>256||info.height>256||data.length>128*1024))quality(`${src} 特效需要透明背景，最多 256×256 / 128 KiB`);
        if(sprite?.type==='sheet') {
          const count=info.width/sprite.frameSize*info.height/sprite.frameSize;
          if(info.width%sprite.frameSize||info.height%sprite.frameSize)fail(`${src} 图集尺寸无法整除单帧尺寸`);
          if(Object.values(sprite.frames).flat().some(i=>i>=count))fail(`${src} 引用了不存在的动作帧`);
          if(!info.alpha)fail(`${src} 战斗图集缺少实际透明区域`);
          if(data.length>2*1024*1024)quality(`${src} 图集超过 2 MiB`);
        }
      } catch(error){fail(`${src}: ${error instanceof Error?error.message:String(error)}`);}
    }
    await asset(pack.art.portrait,'portrait');
    for(const src of Object.values(pack.effects))if(src)await asset(src,'effect');
    if(pack.status==='ready')try{await readFile(`art-source/dungeons/${pack.id}/README.md`);}catch{fail('缺少美术源文件说明 art-source/dungeons/<id>/README.md');}
    if(pack.art.card)await asset(pack.art.card,'card');
    for(const tile of [pack.biome.floorArt,pack.biome.wallArt,pack.biome.obstacleArt])if(tile.type==='image')await asset(tile.src,'tile');
    for(const actor of [pack.boss,...Object.values(pack.minions)])if(actor.sprite.type==='sheet')await asset(actor.sprite.src,'sprite',actor.sprite);
    if(pack.arena.background)await asset(pack.arena.background,'background');
    const total=(await Promise.all([...paths].map(src=>readFile(resolve(publicRoot,'.'+src)).then(b=>b.length,()=>0)))).reduce((a,b)=>a+b,0);
    if(total>12*1024*1024)quality('运行时美术总量超过 12 MiB');
    // Verify connectivity on the same integer lattice and obstacle footprint used by navigation.
    const arena=pack.arena,obstacles=arena.obstacles;
    const b=arenaBounds(arena);
    const free=(x:number,y:number)=>x>=b.minX+.22&&x<=b.maxX-.22&&y>=b.minY+.22&&y<=b.maxY-.22&&!obstacles.some(p=>Math.abs(p.x-x)<.73&&Math.abs(p.y-y)<.73);
    const start={x:Math.round(arena.entry.x),y:Math.round(arena.entry.y)},queue=[start],seen=new Set([`${start.x},${start.y}`]);
    for(let i=0;i<queue.length;i++)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=queue[i].x+dx,y=queue[i].y+dy,key=`${x},${y}`;if(!seen.has(key)&&free(x,y)){seen.add(key);queue.push({x,y});}}
    if(arena.objects.some(o=>!seen.has(`${Math.round(o.at.x)},${Math.round(o.at.y)}`)))fail('入口与设施被障碍隔断');
    const freeCells=Array.from({length:arena.height-3},(_,y)=>Array.from({length:arena.width-3},(_,x)=>({x:x+2,y:y+2}))).flat().filter(p=>free(p.x,p.y));
    if(freeCells.some(p=>!seen.has(`${p.x},${p.y}`)))fail('战区被障碍隔断，存在不可达区域');
    if(pack.status==='prototype')warnings.push(`${pack.id}: 原型包，尚未满足完整美术交付标准`);
  }
  if(!ids.has(DEFAULT_DUNGEON))errors.push(`缺少教学与旧存档使用的默认副本 ${DEFAULT_DUNGEON}`);
  const byId = new Map(packs.map(p=>[p.id,p]));
  for(const pack of packs) {
    for(const required of pack.map.requires)if(!ids.has(required))errors.push(`${pack.id}: 未知前置报告 ${required}`);
    const visit=(id:string,path:Set<string>):boolean=>{if(path.has(id))return true;const next=new Set(path);next.add(id);return (byId.get(id)?.map.requires??[]).some(required=>visit(required,next));};
    if(visit(pack.id,new Set()))errors.push(`${pack.id}: 前置报告存在循环`);
  }
  for(let i=0;i<packs.length;i++)for(let j=0;j<i;j++){const a=worldPoint(packs[i].map.x,packs[i].map.y),b=worldPoint(packs[j].map.x,packs[j].map.y);if(Math.hypot(a.x-b.x,a.y-b.y)<180)errors.push(`${packs[i].id}: 海图标记与 ${packs[j].id} 过近`);}
  return {packs,errors,warnings};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const result=await checkContent();
  for(const warning of result.warnings)console.warn('提示:',warning);
  const target=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
  if(target&&!result.packs.some(p=>p.id===target))result.errors.push(`未知副本 ${target}`);
  if(process.argv.includes('--ready'))for(const pack of result.packs.filter(p=>!target||p.id===target))if(pack.status!=='ready')result.errors.push(`${pack.id}: 尚未完成`);
  if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}
  else {
    const file='src/content/catalog.generated.json',catalog=JSON.stringify(result.packs,null,2)+'\n';
    if(await readFile(file,'utf8').catch(()=>null)!==catalog)await writeFile(file,catalog);
    console.log(`副本校验通过：${result.packs.length} 个包。`);
  }
}
