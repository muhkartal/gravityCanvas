import type { SimulationConfig, CanvasRect, MouseInteraction, Vector2D } from './types';
import { SimulationEngine } from './core/SimulationEngine';
import { UIController } from './ui/UIController';
import { isValidCanvasContext, isValidPosition } from './utils/validation';

class GravityCanvasApp {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private simulationEngine: SimulationEngine | null = null;
  private uiController: UIController | null = null;
  private animationId: number | null = null;
  private lastFrameTime = 0;

  private readonly defaultConfig: SimulationConfig = {
    particleCount: 200,
    showTrails: true,
    isPaused: false,
    particle: {
      maxTrailLength: 8,
      maxSpeed: 4.0,
      minLifespan: 300,
      maxLifespan: 500,
      size: 3.0,
      use3D: true
    },
    gravityWell: {
      strength: 120,
      maxLife: 600,
      maxRange: 350
    }
  };

  public init(): void {
    try {
      this.setupCanvas();
      this.setupSimulation();
      this.setupUI();
      this.setupEventListeners();
      this.startAnimationLoop();
    } catch (error) {
      this.showErrorMessage('Failed to initialize the application. Please refresh the page.');
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

  }

  private setupCanvas(): void {
    const canvasElement = document.getElementById('canvas');
    if (!canvasElement || !(canvasElement instanceof HTMLCanvasElement)) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasElement;

    this.ctx = this.canvas.getContext('2d');
    if (!isValidCanvasContext(this.ctx)) {
      throw new Error('Could not get 2D rendering context');
    }

    this.resizeCanvas();
    window.addEventListener('resize', () => { this.resizeCanvas(); });
  }

  private setupSimulation(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    const canvasBounds: CanvasRect = {
      width: this.canvas.width,
      height: this.canvas.height
    };

    this.simulationEngine = new SimulationEngine(this.defaultConfig, canvasBounds);
  }

  private setupUI(): void {
    this.uiController = new UIController();
    
    this.uiController.registerCallbacks({
      onClear: () => { this.handleClearAll(); },
      onToggleTrails: () => { this.handleToggleTrails(); },
      onTogglePause: () => { this.handleTogglePause(); }
    });
  }

  private setupEventListeners(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    this.canvas.addEventListener('click', (event) => {
      this.handleMouseInteraction(event, 'left');
    });

    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.handleMouseInteraction(event, 'right');
    });

    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        if (touch) {
          this.handleTouchInteraction(touch, 'left');
        }
      }
    });

    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }

  private handleMouseInteraction(event: MouseEvent, button: 'left' | 'right'): void {
    if (!this.canvas || !this.simulationEngine) {return;}

    try {
      const rect = this.canvas.getBoundingClientRect();
      const position: Vector2D = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };

      const canvasBounds: CanvasRect = {
        width: this.canvas.width,
        height: this.canvas.height
      };

      if (isValidPosition(position, canvasBounds)) {
        const interaction: MouseInteraction = { position, button };
        this.simulationEngine.handleMouseInteraction(interaction);
      }
    } catch (error) {
    }
  }

  private handleTouchInteraction(touch: Touch, button: 'left' | 'right'): void {
    if (!this.canvas || !this.simulationEngine) {return;}

    try {
      const rect = this.canvas.getBoundingClientRect();
      const position: Vector2D = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      const canvasBounds: CanvasRect = {
        width: this.canvas.width,
        height: this.canvas.height
      };

      if (isValidPosition(position, canvasBounds)) {
        const interaction: MouseInteraction = { position, button };
        this.simulationEngine.handleMouseInteraction(interaction);
      }
    } catch (error) {
    }
  }

  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      try {
        const deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame(animate);
      } catch (error) {
        this.animationId = requestAnimationFrame(animate);
      }
    };

    this.animationId = requestAnimationFrame(animate);
  }

  private update(deltaTime: number): void {
    if (!this.simulationEngine || !this.uiController) {return;}

    this.simulationEngine.update(deltaTime);
    
    const metrics = this.simulationEngine.getPerformanceMetrics();
    this.uiController.updateMetrics(metrics);
    
    const config = this.simulationEngine.getConfig();
    this.uiController.updateButtonStates(config.showTrails, config.isPaused);
  }

  private render(): void {
    if (!this.ctx || !this.simulationEngine) {return;}

    this.simulationEngine.render(this.ctx);
  }

  private resizeCanvas(): void {
    if (!this.canvas) {return;}

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    if (this.simulationEngine) {
      const newBounds: CanvasRect = {
        width: this.canvas.width,
        height: this.canvas.height
      };
      this.simulationEngine.updateCanvasBounds(newBounds);
    }
  }

  private handleClearAll(): void {
    this.simulationEngine?.clearGravityWells();
  }

  private handleToggleTrails(): void {
    this.simulationEngine?.toggleTrails();
  }

  private handleTogglePause(): void {
    this.simulationEngine?.togglePause();
  }

  private showErrorMessage(message: string): void {
    this.uiController?.showError(message);
  }
}

let app: GravityCanvasApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new GravityCanvasApp();
    app.init();
  } catch (error) {
  }
});

window.addEventListener('beforeunload', () => {
  app?.destroy();
});

document.addEventListener('visibilitychange', () => {
  if (app && document.hidden) {
  }
});

export { GravityCanvasApp };