export class InputManager {
  // Keyboard state
  private keys = new Map<string, boolean>();
  private keysJustPressed = new Map<string, boolean>();

  // Mouse state
  public mouseX = 0;
  public mouseY = 0;
  public mouseDeltaX = 0;
  public mouseDeltaY = 0;
  public mouseDown = false;

  // Pointer lock
  public isPointerLocked = false;
  private canvas: HTMLElement;

  // Normalized mouse position (-1 to 1)
  public normalizedMouseX = 0;
  public normalizedMouseY = 0;

  constructor(canvas: HTMLElement) {
    this.canvas = canvas;

    // Keyboard listeners
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Mouse listeners
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);

    // Pointer lock
    canvas.addEventListener('click', this.requestPointerLock);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const key = e.code;
    if (!this.keys.get(key)) {
      this.keysJustPressed.set(key, true);
    }
    this.keys.set(key, true);

    // Prevent default for game keys to avoid page scrolling
    if (
      key === 'Space' ||
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight'
    ) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.set(e.code, false);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }

    // Track absolute position for non-locked mode
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    // Normalized coordinates (-1 to 1)
    this.normalizedMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.normalizedMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = true;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private requestPointerLock = (): void => {
    if (!this.isPointerLocked) {
      this.canvas.requestPointerLock();
    }
  };

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.canvas;
  };

  /** Check if a key is currently held down */
  public isKeyDown(code: string): boolean {
    return this.keys.get(code) === true;
  }

  /** Check if a key was just pressed this frame (true only on first frame) */
  public isKeyJustPressed(code: string): boolean {
    return this.keysJustPressed.get(code) === true;
  }

  // Convenience accessors for common game controls
  public get moveLeft(): boolean {
    return this.isKeyDown('KeyA') || this.isKeyDown('ArrowLeft');
  }

  public get moveRight(): boolean {
    return this.isKeyDown('KeyD') || this.isKeyDown('ArrowRight');
  }

  public get moveUp(): boolean {
    return this.isKeyDown('KeyW') || this.isKeyDown('ArrowUp');
  }

  public get moveDown(): boolean {
    return this.isKeyDown('KeyS') || this.isKeyDown('ArrowDown');
  }

  public get shoot(): boolean {
    return this.isKeyDown('Space') || this.mouseDown;
  }

  /** Call at the end of each frame to reset per-frame state */
  public update(): void {
    this.keysJustPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('click', this.requestPointerLock);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }
}
