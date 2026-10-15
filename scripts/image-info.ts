import { inflateSync } from 'node:zlib';

export function imageInfo(data: Buffer): { width: number; height: number; alpha: boolean } {
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    const width=data.readUInt32BE(16),height=data.readUInt32BE(20),depth=data[24],color=data[25];
    let alpha=false;
    if(depth===8 && (color===6||color===4)) {
      const channels=color===6?4:2, stride=width*channels, parts:Buffer[]=[];
      for(let at=8;at+12<=data.length;) {const size=data.readUInt32BE(at);if(data.toString('ascii',at+4,at+8)==='IDAT')parts.push(data.subarray(at+8,at+8+size));at+=12+size;}
      const raw=inflateSync(Buffer.concat(parts),{maxOutputLength:64*1024*1024});
      let previous=Buffer.alloc(stride), at=0;
      for(let y=0;y<height&&!alpha;y++) {
        const filter=raw[at++],row=Buffer.alloc(stride);
        for(let x=0;x<stride;x++) {
          const left=x>=channels?row[x-channels]:0,up=previous[x],ul=x>=channels?previous[x-channels]:0;
          const p=left+up-ul,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-ul);
          const predict=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?pa<=pb&&pa<=pc?left:pb<=pc?up:ul:NaN;
          if(!Number.isFinite(predict))throw new Error('未知 PNG 行过滤器');
          row[x]=(raw[at++]+predict)&255;
          if(x%channels===channels-1&&row[x]<255)alpha=true;
        }
        previous=row;
      }
    }
    return {width,height,alpha};
  }
  if(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP') {
    const kind=data.toString('ascii',12,16);
    if(kind==='VP8X')return {width:1+data.readUIntLE(24,3),height:1+data.readUIntLE(27,3),alpha:!!(data[20]&16)};
    if(kind==='VP8L'){const bits=data.readUInt32LE(21);return {width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1,alpha:!!(bits&0x10000000)};}
    if(kind==='VP8 ')return {width:data.readUInt16LE(26)&0x3fff,height:data.readUInt16LE(28)&0x3fff,alpha:false};
  }
  throw new Error('需要可读取的 PNG 或 WebP');
}
