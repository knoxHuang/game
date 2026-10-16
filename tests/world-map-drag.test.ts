import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldMap } from '../src/world-map.ts';

// Exercise the actual DOM listeners without introducing a browser dependency.
class MapElement extends EventTarget {
  dataset = { focusKey: 'coast', focusY: '1500', selected: 'coast' };
  scrollTop = 0;
  scrollHeight = 1200;
  clientHeight = 300;
  clientWidth = 360;
  offsetTop = 0;
  offsetHeight = 1200;
  captured: number | null = null;
  classes = new Set<string>();
  classList = {
    add: (name: string) => this.classes.add(name),
    remove: (name: string) => this.classes.delete(name),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, active: boolean) => active ? this.classes.add(name) : this.classes.delete(name),
  };
  style = { setProperty: () => {} };
  querySelector() { return null; }
  querySelectorAll() { return []; }
  hasPointerCapture(id: number) { return this.captured === id; }
  setPointerCapture(id: number) { this.captured = id; }
  releasePointerCapture(id: number) {
    this.captured = null;
    pointer(this, 'lostpointercapture', { pointerId: id });
  }
}
function pointer(target: EventTarget, type: string, fields: Record<string, unknown> = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1, clientY: 200, relatedTarget: {}, ...fields });
  target.dispatchEvent(event);
  return event;
}

test('海图拖动在窗口外释放、捕获丢失、失焦或无按键返回后终止', () => {
  const fakeWindow = new EventTarget(), viewport = new MapElement(), sheet = new MapElement();
  const chart = new MapElement();
  const restoreWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const restoreObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
  Object.defineProperty(globalThis, 'ResizeObserver', { configurable: true, value: class { observe() {} disconnect() {} } });
  const map = new WorldMap();
  const root = { querySelector: (selector: string) => selector === '.world-viewport' ? viewport : selector === '.world-plane' ? sheet : selector === '.world-chart' ? chart : null, querySelectorAll: () => [] };
  try {
    map.attach(root as unknown as HTMLElement);
    const start = () => {
      viewport.scrollTop = 300;
      pointer(viewport, 'pointerdown');
      const before = viewport.scrollTop;
      pointer(viewport, 'pointermove', { clientY: 170 });
      assert.equal(viewport.scrollTop, before + 30);
      assert.equal(viewport.classes.has('is-dragging'), true);
    };
    const stopped = () => {
      assert.equal(viewport.classes.has('is-dragging'), false);
      assert.equal(viewport.captured, null);
      const before = viewport.scrollTop;
      pointer(viewport, 'pointermove', { buttons: 0, clientY: 100 });
      assert.equal(viewport.scrollTop, before, '未按键移动不能继续滚图');
    };
    start(); pointer(fakeWindow, 'pointerup'); stopped();
    start(); pointer(viewport, 'lostpointercapture'); stopped();
    start(); fakeWindow.dispatchEvent(new Event('blur')); stopped();
    start(); pointer(fakeWindow, 'pointerout', { relatedTarget: null }); stopped();
    start(); pointer(viewport, 'pointermove', { buttons: 0, clientY: 100 }); stopped();
    start(); pointer(fakeWindow, 'pointercancel'); stopped();
    start(); pointer(fakeWindow, 'pointerup', { pointerId: 2 });
    assert.equal(viewport.classes.has('is-dragging'), true, '其他指针不应终止当前拖动');
    pointer(fakeWindow, 'pointerup'); stopped();
    const dragClick = new Event('click', { cancelable: true });
    viewport.dispatchEvent(dragClick);
    assert.equal(dragClick.defaultPrevented, true, '拖动后不误选地点');
    pointer(viewport, 'pointerdown'); pointer(fakeWindow, 'pointerup');
    const normalClick = new Event('click', { cancelable: true });
    viewport.dispatchEvent(normalClick);
    assert.equal(normalClick.defaultPrevented, false, '新一次点击仍能选择地点');
    start(); map.detach(); stopped();
    pointer(viewport, 'pointerdown'); pointer(viewport, 'pointermove', { clientY: 100 });
    assert.equal(viewport.classes.has('is-dragging'), false, '卸载后不再响应指针');
  } finally {
    map.detach();
    if (restoreWindow) Object.defineProperty(globalThis, 'window', restoreWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (restoreObserver) Object.defineProperty(globalThis, 'ResizeObserver', restoreObserver); else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
});
