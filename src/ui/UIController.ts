import type { PerformanceMetrics } from '../types';

export class UIController {
  private elements: {
    particleCount: HTMLElement | null;
    wellCount: HTMLElement | null;
    fpsCounter: HTMLElement | null;
    clearBtn: HTMLButtonElement | null;
    toggleTrails: HTMLButtonElement | null;
    togglePause: HTMLButtonElement | null;
  };

  private callbacks: {
    onClear?: () => void;
    onToggleTrails?: () => void;
    onTogglePause?: () => void;
  };

  constructor() {
    this.elements = {
      particleCount: document.getElementById('particleCount'),
      wellCount: document.getElementById('wellCount'),
      fpsCounter: document.getElementById('fpsCounter'),
      clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,
      toggleTrails: document.getElementById('toggleTrails') as HTMLButtonElement,
      togglePause: document.getElementById('togglePause') as HTMLButtonElement
    };

    this.callbacks = {};
    this.initializeEventListeners();
  }

  public registerCallbacks(callbacks: {
    onClear?: () => void;
    onToggleTrails?: () => void;
    onTogglePause?: () => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public updateMetrics(metrics: PerformanceMetrics): void {
    try {
      if (this.elements.particleCount) {
        this.elements.particleCount.textContent = metrics.particleCount.toString();
      }
      
      if (this.elements.wellCount) {
        this.elements.wellCount.textContent = metrics.wellCount.toString();
      }
      
      if (this.elements.fpsCounter) {
        this.elements.fpsCounter.textContent = metrics.fps.toString();
      }
    } catch (error) {
    }
  }

  public updateButtonStates(showTrails: boolean, isPaused: boolean): void {
    try {
      if (this.elements.toggleTrails) {
        this.elements.toggleTrails.textContent = showTrails ? 'Hide Trails' : 'Show Trails';
        this.elements.toggleTrails.setAttribute('aria-pressed', showTrails.toString());
      }
      
      if (this.elements.togglePause) {
        this.elements.togglePause.textContent = isPaused ? 'Resume' : 'Pause';
        this.elements.togglePause.setAttribute('aria-pressed', isPaused.toString());
      }
    } catch (error) {
    }
  }

  public showError(message: string): void {
  }

  private initializeEventListeners(): void {
    if (this.elements.clearBtn) {
      this.elements.clearBtn.addEventListener('click', () => {
        this.callbacks.onClear?.();
      });
    }

    if (this.elements.toggleTrails) {
      this.elements.toggleTrails.addEventListener('click', () => {
        this.callbacks.onToggleTrails?.();
      });
    }

    if (this.elements.togglePause) {
      this.elements.togglePause.addEventListener('click', () => {
        this.callbacks.onTogglePause?.();
      });
    }

    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });
  }

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault();
        this.callbacks.onTogglePause?.();
        break;
      case 'KeyC':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.callbacks.onClear?.();
        } else {
          event.preventDefault();
          this.callbacks.onClear?.();
        }
        break;
      case 'KeyT':
        event.preventDefault();
        this.callbacks.onToggleTrails?.();
        break;
      case 'KeyR':
        event.preventDefault();
        this.callbacks.onClear?.();
        break;
    }
  }
}