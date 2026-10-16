/** Crop a backdrop to the arena while keeping a single scale on both axes. */
export function arenaArtFrame(sourceWidth:number,sourceHeight:number,width:number,height:number) {
  const scale=Math.max(width/sourceWidth,height/sourceHeight);
  const cropWidth=width/scale,cropHeight=height/scale;
  return {x:(sourceWidth-cropWidth)/2,y:(sourceHeight-cropHeight)/2,width:cropWidth,height:cropHeight,scale};
}
