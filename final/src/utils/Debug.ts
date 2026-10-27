import GUI from 'lil-gui';

/**
 * Debug manages the development UI (lil-gui).
 * It can be toggled on/off, closed, or completely excluded in production.
 */
export class Debug {
  public readonly active: boolean;
  public readonly gui: GUI | null = null;

  constructor(active: boolean) {
    this.active = active;

    if (this.active) {
      this.gui = new GUI({
        title: 'Ocean World Debug',
        width: 320,
        closeFolders: true,
      });

      // Hide by default unless #debug hash is explicitly present
      if (!window.location.hash.includes('debug')) {
        this.gui.show(false);
      }

      // Keyboard shortcut: Press 'H' to toggle GUI visibility
      window.addEventListener('keydown', (event) => {
        if (event.key.toLowerCase() === 'h' && this.gui) {
          this.gui.show(this.gui._hidden);
        }
      });
    }
  }

  public addFolder(title: string): GUI | null {
    if (!this.gui) return null;
    return this.gui.addFolder(title);
  }

  public destroy(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
