export class InputManager {
  public forward = false;
  public backward = false;
  public left = false;
  public right = false;
  public sprint = false;
  public jump = false;

  // Single-fire triggers
  public interactPressed = false;
  public kickPressed = false;

  // Mouse orbit
  public mouseDeltaX = 0;
  public mouseDeltaY = 0;
  public zoomDelta = 0;
  public isDragging = false;
  public isPointerLocked = false;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Mouse Controls
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });

    // Pointer lock on canvas click for modern 3D game camera control
    this.canvas.addEventListener('click', async () => {
      if (document.pointerLockElement !== this.canvas) {
        try {
          await this.canvas.requestPointerLock();
        } catch {
          // Pointer lock rejected or restricted; drag fallback continues
        }
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = true;
        break;
      case 'Space':
        this.jump = true;
        break;
      case 'KeyE':
        if (!e.repeat) {
          this.interactPressed = true;
        }
        break;
      case 'KeyF':
        if (!e.repeat) {
          this.kickPressed = true;
        }
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.sprint = false;
        break;
      case 'Space':
        this.jump = false;
        break;
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this.isDragging = true;
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isPointerLocked || this.isDragging) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.zoomDelta += e.deltaY * 0.01;
  };

  public consumeInteract(): boolean {
    const wasPressed = this.interactPressed;
    this.interactPressed = false;
    return wasPressed;
  }

  public consumeKick(): boolean {
    const wasPressed = this.kickPressed;
    this.kickPressed = false;
    return wasPressed;
  }

  public resetDeltas(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.zoomDelta = 0;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}

