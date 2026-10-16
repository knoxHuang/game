import { WORLD_REGIONS, WORLD_SIZE } from './content/world-map.ts';

export const clampVoyageScroll = (top: number, scrollHeight: number, viewportHeight: number) => Math.max(0, Math.min(Math.max(0, scrollHeight - viewportHeight), top));

export function voyageFocus(worldY: number, sheetTop: number, sheetHeight: number, viewportHeight: number, scrollHeight: number, above = 0, below = 0) {
  // Center the whole encounter, including the creature above its map anchor.
  const anchor = (viewportHeight + above - below) / 2;
  const desired = sheetTop + worldY / WORLD_SIZE.height * sheetHeight - anchor;
  return clampVoyageScroll(desired, scrollHeight, viewportHeight);
}

// Touch and wheel use native scrolling; desktop dragging shares its bounded scroll offset.
export class WorldMap {
  private focused = '';
  private position: number | null = null;
  private selected = '';
  private release = () => {};
  detach() { this.release(); this.release = () => {}; }
  attach(root: HTMLElement) {
    const viewport = root.querySelector<HTMLElement>('.world-viewport'), sheet = root.querySelector<HTMLElement>('.world-plane');
    if (!viewport || !sheet) return;
    const key = viewport.dataset.focusKey ?? '', needsFocus = this.focused !== key;
    this.focused = key;
    const selected = viewport.dataset.selected ?? '';
    root.querySelector('.world-chart')?.classList.toggle('is-revealing', !!selected && selected !== this.selected);
    this.selected = selected;
    let layoutScroll: number | null = null;
    const remember = (updateRegion = false) => {
      this.position = (viewport.scrollTop + viewport.clientHeight / 2 - sheet.offsetTop) / sheet.offsetHeight;
      if (!updateRegion) return;
      const middle = (viewport.scrollTop + Math.min(viewport.clientHeight / 2, 120) - sheet.offsetTop) / sheet.offsetHeight * 100;
      const region = WORLD_REGIONS.reduce((best, r) => Math.abs(r.y - middle) < Math.abs(best.y - middle) ? r : best);
      const title = root.querySelector<HTMLElement>('[data-visible-region]');
      if (title) title.textContent = `${region.chapter === '终章' ? '终章海域' : `第${region.chapter}海域`} · ${region.name}`;
      for (const button of root.querySelectorAll<HTMLElement>('.world-tools [data-value]')) button.setAttribute('aria-pressed', String(button.dataset.value === region.id));
    };
    let firstLayout = true;
    let layoutWidth = 0, layoutHeight = 0;
    const layout = () => {
      const bossHeight = Math.max(52, Math.min(160, viewport.clientHeight * .46));
      sheet.style.setProperty('--boss-height', `${bossHeight}px`);
      sheet.style.setProperty('--boss-size', `${bossHeight * 1.2}px`);
      const encounter = sheet.querySelector<HTMLElement>('.world-site.is-selected');
      const above = encounter && !encounter.classList.contains('is-mysterious') ? bossHeight + 8 : 0;
      if (firstLayout && needsFocus) viewport.scrollTop = voyageFocus(Number(viewport.dataset.focusY), sheet.offsetTop, sheet.offsetHeight, viewport.clientHeight, viewport.scrollHeight, above, 56);
      else if (this.position !== null) viewport.scrollTop = sheet.offsetTop + this.position * sheet.offsetHeight - viewport.clientHeight / 2;
      layoutScroll = viewport.scrollTop;
      layoutWidth = viewport.clientWidth; layoutHeight = viewport.clientHeight;
      firstLayout = false; remember();
    };
    layout();
    const keyboard = (event: KeyboardEvent) => {
      if (event.target !== viewport) return;
      const amount = event.key === 'ArrowUp' ? -65 : event.key === 'ArrowDown' ? 65 : event.key === 'PageUp' ? -viewport.clientHeight * .8 : event.key === 'PageDown' ? viewport.clientHeight * .8 : 0;
      if (amount || event.key === 'Home' || event.key === 'End') { event.preventDefault(); viewport.scrollTop = event.key === 'Home' ? 0 : event.key === 'End' ? viewport.scrollHeight : viewport.scrollTop + amount; }
    };
    let drag: { pointer: number; y: number; top: number } | null = null, moved = false;
    const down = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { pointer: event.pointerId, y: event.clientY, top: viewport.scrollTop }; moved = false;
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      // A release outside the browser may never deliver pointerup to this page.
      if ((event.buttons & 1) === 0) { finish(); return; }
      const delta = drag.y - event.clientY;
      if (!moved && Math.abs(delta) < 6) return;
      moved = true; event.preventDefault();
      if (!viewport.hasPointerCapture(event.pointerId)) viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('is-dragging');
      viewport.scrollTop = clampVoyageScroll(drag.top + delta, viewport.scrollHeight, viewport.clientHeight);
    };
    const finish = () => {
      const previous = drag;
      drag = null; viewport.classList.remove('is-dragging');
      // Clear state before releasing: lostpointercapture can also call finish.
      if (previous && viewport.hasPointerCapture(previous.pointer)) viewport.releasePointerCapture(previous.pointer);
      if (previous) remember();
    };
    const endPointer = (event: PointerEvent) => { if (drag?.pointer === event.pointerId) finish(); };
    const leaveWindow = (event: PointerEvent) => { if (event.relatedTarget === null) endPointer(event); };
    const click = (event: MouseEvent) => { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); moved = false; } };
    viewport.addEventListener('pointerdown', down); viewport.addEventListener('pointermove', move);
    viewport.addEventListener('lostpointercapture', endPointer); viewport.addEventListener('click', click, true);
    window.addEventListener('pointerup', endPointer, true); window.addEventListener('pointercancel', endPointer, true);
    window.addEventListener('pointerout', leaveWindow);
    window.addEventListener('blur', finish);
    const scrolled = () => {
      // Resizing can clamp scrollTop before ResizeObserver restores the map position.
      if (viewport.clientWidth !== layoutWidth || viewport.clientHeight !== layoutHeight) return;
      if (layoutScroll !== null && Math.abs(viewport.scrollTop - layoutScroll) < 1) { remember(); return; }
      layoutScroll = null; remember(true);
    };
    viewport.addEventListener('scroll', scrolled, { passive: true }); viewport.addEventListener('keydown', keyboard);
    const observer = new ResizeObserver(layout); observer.observe(viewport);
    this.release = () => { finish(); viewport.removeEventListener('pointerdown', down); viewport.removeEventListener('pointermove', move); viewport.removeEventListener('lostpointercapture', endPointer); viewport.removeEventListener('click', click, true); window.removeEventListener('pointerup', endPointer, true); window.removeEventListener('pointercancel', endPointer, true); window.removeEventListener('pointerout', leaveWindow); window.removeEventListener('blur', finish); observer.disconnect(); viewport.removeEventListener('scroll', scrolled); viewport.removeEventListener('keydown', keyboard); };
  }
}
