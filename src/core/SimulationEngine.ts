import type { 
  SimulationConfig, 
  CanvasRect, 
  PerformanceMetrics,
  MouseInteraction 
} from '../types';
import { Particle3D } from './Particle3D';
import { GravityWell } from './GravityWell';
import { isValidCanvasContext } from '../utils/validation';

export class SimulationEngine {
  private particles: Particle3D[] = [];
  private gravityWells: GravityWell[] = [];
  private config: SimulationConfig;
  private canvasBounds: CanvasRect;
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 60;

  constructor(config: SimulationConfig, canvasBounds: CanvasRect) {
    this.config = { ...config };
    this.canvasBounds = { ...canvasBounds };
    this.initializeParticles();
  }

  public initializeParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.config.particleCount; i++) {
      try {
        const particle = new Particle3D(
          {
            x: Math.random() * this.canvasBounds.width,
            y: Math.random() * this.canvasBounds.height,
            z: (Math.random() - 0.5) * 200
          },
          this.config.particle,
          this.canvasBounds
        );
        this.particles.push(particle);
      } catch (error) {
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.config.isPaused) {return;}

    try {
      this.updatePerformanceMetrics(deltaTime);
      this.updateGravityWells();
      this.updateParticles();
    } catch (error) {
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!isValidCanvasContext(ctx)) {
      return;
    }

    try {
      this.clearCanvas(ctx);
      this.renderGravityWells(ctx);
      this.renderParticles(ctx);
    } catch (error) {
    }
  }

  public handleMouseInteraction(interaction: MouseInteraction): void {
    try {
      const strength = interaction.button === 'right' ? 80 : 50;
      const isRepulsive = interaction.button === 'right';
      
      const gravityWell = new GravityWell(
        interaction.position,
        strength,
        isRepulsive,
        this.config.gravityWell
      );
      
      this.gravityWells.push(gravityWell);
    } catch (error) {
    }
  }

  public clearGravityWells(): void {
    this.gravityWells = [];
  }

  public toggleTrails(): void {
    this.config.showTrails = !this.config.showTrails;
  }

  public togglePause(): void {
    this.config.isPaused = !this.config.isPaused;
  }

  public updateCanvasBounds(newBounds: CanvasRect): void {
    this.canvasBounds = { ...newBounds };
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return {
      fps: this.currentFps,
      frameTime: this.lastFrameTime,
      particleCount: this.particles.length,
      wellCount: this.gravityWells.length
    };
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.particleCount && newConfig.particleCount !== this.particles.length) {
      this.initializeParticles();
    }
  }

  private updatePerformanceMetrics(deltaTime: number): void {
    this.lastFrameTime = deltaTime;
    this.frameCount++;
    
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  private updateGravityWells(): void {
    for (let i = this.gravityWells.length - 1; i >= 0; i--) {
      const well = this.gravityWells[i];
      if (well) {
        well.update();
        
        if (well.isDead()) {
          this.gravityWells.splice(i, 1);
        }
      }
    }
  }

  private updateParticles(): void {
    for (const particle of this.particles) {
      for (const well of this.gravityWells) {
        well.applyForceToParticle(particle);
      }
      
      particle.update();
    }
  }

  private clearCanvas(ctx: CanvasRenderingContext2D): void {
    if (this.config.showTrails) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, this.canvasBounds.width, this.canvasBounds.height);
    } else {
      ctx.clearRect(0, 0, this.canvasBounds.width, this.canvasBounds.height);
      ctx.fillStyle = 'rgb(0, 0, 0)';
      ctx.fillRect(0, 0, this.canvasBounds.width, this.canvasBounds.height);
    }
  }

  private renderGravityWells(ctx: CanvasRenderingContext2D): void {
    for (const well of this.gravityWells) {
      well.draw(ctx);
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.imageSmoothingEnabled = false;
    
    for (const particle of this.particles) {
      particle.draw(ctx, this.config.showTrails);
    }
  }
}