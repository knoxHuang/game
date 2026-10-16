// Own each pointer for its full gesture, independently of where it moves.
export function bindBattleControls({area,stick,actions,isBlocked,dispatch,onLockedSkill}: {
  area:HTMLElement; stick:HTMLElement; actions:HTMLElement;
  isBlocked:()=>boolean;
  dispatch:(name:string,value?:string)=>void;
  onLockedSkill:()=>void;
}):()=>void {
  const knob=stick.querySelector<HTMLElement>('.stick-knob')!;
  let stickId:number|null=null,originX=0,originY=0;
  const hideStick=()=>{stick.classList.remove('is-active');knob.style.transform='translate(0,0)';dispatch('move','0,0');};
  const update=(event:PointerEvent)=>{
    let dx=(event.clientX-originX)/48,dy=(event.clientY-originY)/48;
    const magnitude=Math.hypot(dx,dy);
    if(magnitude>1){dx/=magnitude;dy/=magnitude;}
    if(magnitude<.12){dx=0;dy=0;}
    knob.style.transform=`translate(${dx*26}px,${dy*26}px)`;
    dispatch('move',`${dx.toFixed(3)},${dy.toFixed(3)}`);
  };
  area.addEventListener('pointerdown',event=>{
    if(stickId!==null||event.button!==0||isBlocked())return;
    event.preventDefault();stickId=event.pointerId;originX=event.clientX;originY=event.clientY;
    const rect=area.getBoundingClientRect();
    stick.style.left=`${originX-rect.left}px`;stick.style.top=`${originY-rect.top}px`;
    stick.classList.add('is-active');area.setPointerCapture(event.pointerId);update(event);
  });
  area.addEventListener('pointermove',event=>{if(event.pointerId===stickId)update(event);});
  const stopStick=(event:PointerEvent)=>{if(event.pointerId!==stickId)return;stickId=null;hideStick();};
  area.addEventListener('pointerup',stopStick);area.addEventListener('pointercancel',stopStick);area.addEventListener('lostpointercapture',stopStick);
  let actionPointer:number|null=null,held='',potionTarget:HTMLElement|null=null;
  const applyTarget=(element:Element|null)=>{
    const target=element?.closest<HTMLElement>('[data-touch]');
    const next=target?.hasAttribute('disabled')||target?.dataset.touch==='potion'?'':target?.dataset.touch??'';
    const pulse=(kind:string)=>dispatch(`pulse:${kind}`);
    if(next===held)return;
    if(held==='interact')dispatch('hold-interact','0');
    if(next==='interact'){held=next;dispatch('hold-interact','1');dispatch('pulse:interact');}
    else if(next==='dodge'||next==='skill'){
      if(next==='skill'&&target?.classList.contains('is-locked')){onLockedSkill();held='';return;}
      held=next;pulse(next);
    }
    else held='';
  };
  actions.addEventListener('pointerdown',event=>{
    const target=(event.target as Element).closest<HTMLElement>('[data-touch]');if(!target||target.hasAttribute('disabled')||actionPointer!==null||isBlocked())return;
    event.preventDefault();actionPointer=event.pointerId;actions.setPointerCapture(event.pointerId);
    if(target.dataset.touch==='potion'){potionTarget=target;held='potion';return;}
    applyTarget(target);
  });
  actions.addEventListener('pointermove',event=>{if(event.pointerId===actionPointer&&!potionTarget)applyTarget(document.elementFromPoint(event.clientX,event.clientY));});
  const stopAction=(event:PointerEvent)=>{
    if(event.pointerId!==actionPointer)return;actionPointer=null;
    if(potionTarget&&event.type==='pointerup'&&!isBlocked()&&!potionTarget.hasAttribute('disabled')){
      const rect=potionTarget.getBoundingClientRect();
      if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom)dispatch('pulse:potion');
    }
    potionTarget=null;if(held==='interact')dispatch('hold-interact','0');held='';
  };
  actions.addEventListener('pointerup',stopAction);actions.addEventListener('pointercancel',stopAction);actions.addEventListener('lostpointercapture',stopAction);
  actions.addEventListener('click',event=>{
    const target=(event.target as Element).closest<HTMLElement>('[data-touch="potion"]');
    if(event.detail===0&&target?.dataset.touch==='potion'&&!target.hasAttribute('disabled')&&!isBlocked())dispatch('pulse:potion');
  });
  actions.addEventListener('keydown',event=>{
    const target=(event.target as Element).closest<HTMLElement>('[data-touch="potion"]');
    // Keep native button activation without also triggering the global Enter interaction.
    if(target?.dataset.touch==='potion'&&(event.key==='Enter'||event.key===' '))event.stopPropagation();
  });
  return ()=>{
    if(stickId!==null){const id=stickId;stickId=null;hideStick();if(area.hasPointerCapture(id))area.releasePointerCapture(id);}
    if(actionPointer!==null){const id=actionPointer;actionPointer=null;potionTarget=null;if(held==='interact')dispatch('hold-interact','0');held='';if(actions.hasPointerCapture(id))actions.releasePointerCapture(id);}
  };
}
