import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { attachGestures } from './gestures';

/** A stage stub: records listeners, so a test can fire wheel and pointer events at it. */
function stage() {
  const on = new Map<string, (e: object) => void>();
  const el = {
    style: {} as Record<string, string>,
    addEventListener: (type: string, f: (e: object) => void) => on.set(type, f),
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture() {},
  };
  const fire = (type: string, e: object) => on.get(type)!({ preventDefault() {}, target: {}, ...e });
  return { el: el as unknown as HTMLElement, fire };
}

describe('gestures', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const wheel = { deltaY: -4, deltaMode: 0, ctrlKey: false, clientX: 10, clientY: 10 };
  const setup = () => {
    const { el, fire } = stage(), cam = { stop: vi.fn(), zoomAt: vi.fn(), panBy: vi.fn() }, onEnd = vi.fn();
    return { fire, cam, onEnd, g: attachGestures(el, cam, { onEnd }) };
  };

  it('ends a wheel stream once it pauses', () => {
    const { fire, cam, onEnd } = setup();
    fire('wheel', wheel);
    vi.advanceTimersByTime(100);
    fire('wheel', wheel);
    expect(cam.stop).toHaveBeenCalledTimes(1);
    expect(cam.zoomAt).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('lets a step take over from a scroll: its momentum neither zooms nor ends it (no settle, no jump back)', () => {
    const { fire, cam, onEnd, g } = setup();
    fire('wheel', wheel);
    g.interrupt();
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(40);
      fire('wheel', wheel);
    }
    vi.advanceTimersByTime(500);
    expect(cam.zoomAt).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
    // after the pause, a new scroll is the reader's again
    fire('wheel', wheel);
    expect(cam.stop).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(200);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('lets a step take over from a drag: the rest of it is ignored', () => {
    const { fire, cam, onEnd, g } = setup();
    fire('pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
    fire('pointermove', { pointerId: 1, clientX: 30, clientY: 0 });
    g.interrupt();
    fire('pointermove', { pointerId: 1, clientX: 60, clientY: 0 });
    fire('pointerup', { pointerId: 1, clientX: 60, clientY: 0 });
    expect(cam.panBy).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
