import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager } from './InputManager';

describe('InputManager', () => {
  let input: InputManager;
  let canvas: HTMLDivElement;

  beforeEach(() => {
    canvas = document.createElement('div');
    // Mock requestPointerLock
    canvas.requestPointerLock = vi.fn();
    input = new InputManager(canvas);
  });

  afterEach(() => {
    input.dispose();
  });

  describe('keyboard input', () => {
    it('tracks key down state', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(input.isKeyDown('KeyW')).toBe(true);
    });

    it('tracks key up state', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
      expect(input.isKeyDown('KeyW')).toBe(false);
    });

    it('detects just-pressed keys (only true on first frame)', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(input.isKeyJustPressed('Space')).toBe(true);

      input.update(); // End of frame clears justPressed
      expect(input.isKeyJustPressed('Space')).toBe(false);
    });

    it('does not fire justPressed for held keys', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      input.update();
      // Fire another keydown without keyup (held key)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(input.isKeyJustPressed('KeyA')).toBe(false);
    });
  });

  describe('movement accessors', () => {
    it('moveLeft responds to KeyA', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      expect(input.moveLeft).toBe(true);
    });

    it('moveLeft responds to ArrowLeft', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
      expect(input.moveLeft).toBe(true);
    });

    it('moveRight responds to KeyD', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
      expect(input.moveRight).toBe(true);
    });

    it('moveUp responds to KeyW', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(input.moveUp).toBe(true);
    });

    it('moveDown responds to KeyS', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS' }));
      expect(input.moveDown).toBe(true);
    });

    it('shoot responds to Space', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      expect(input.shoot).toBe(true);
    });
  });

  describe('mouse input', () => {
    it('tracks mouse position', () => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
      expect(input.mouseX).toBe(400);
      expect(input.mouseY).toBe(300);
    });

    it('tracks mouse button down/up', () => {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
      expect(input.mouseDown).toBe(true);
      expect(input.shoot).toBe(true); // shoot uses mouseDown

      window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
      expect(input.mouseDown).toBe(false);
    });

    it('ignores non-left mouse buttons', () => {
      window.dispatchEvent(new MouseEvent('mousedown', { button: 2 }));
      expect(input.mouseDown).toBe(false);
    });
  });

  describe('per-frame reset', () => {
    it('clears justPressed and mouse deltas on update', () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
      input.update();
      expect(input.isKeyJustPressed('KeyA')).toBe(false);
      expect(input.mouseDeltaX).toBe(0);
      expect(input.mouseDeltaY).toBe(0);
    });
  });

  describe('dispose', () => {
    it('removes event listeners', () => {
      input.dispose();
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      expect(input.isKeyDown('KeyW')).toBe(false);
    });
  });
});
