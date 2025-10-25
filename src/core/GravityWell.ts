import type { Vector2D, Vector3D, GravityWellConfig } from '../types';
import { distance } from '../utils/math';
import { distance3D } from '../utils/math3D';
import { isValidVector2D, isValidVector3D, isValidNumber } from '../utils/validation';
import type { Particle3D } from './Particle3D';

export class GravityWell {
  public position: Vector2D;
  public strength: number;
  public isRepulsive: boolean;
  public life: number;
  
  private readonly config: GravityWellConfig;

  constructor(
    position: Vector2D,
    strength: number,
    isRepulsive: boolean,
    config: GravityWellConfig
  ) {
    if (!isValidVector2D(position)) {
      throw new Error('Invalid gravity well position provided');
    }
    
    if (!isValidNumber(strength)) {
      throw new Error('Invalid gravity well strength provided');
    }

    this.position = { ...position };
    this.strength = Math.abs(strength);
    this.isRepulsive = isRepulsive;
    this.life = 0;
    this.config = { ...config };
  }

  public update(): void {
    this.life++;
  }

  public applyForceToParticle(particle: Particle3D): void {
    try {
      const wellPos3D: Vector3D = { x: this.position.x, y: this.position.y, z: 0 };
      
      const dx = wellPos3D.x - particle.position.x;
      const dy = wellPos3D.y - particle.position.y;
      const dz = wellPos3D.z - particle.position.z;
      const dist = distance3D(wellPos3D, particle.position);
      
      if (dist > 2 && dist < this.config.maxRange) {
        const force = this.calculateForce(dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        
        const forceMultiplier = this.isRepulsive ? -0.1 : 0.06;
        particle.applyForce({ 
          x: fx * forceMultiplier, 
          y: fy * forceMultiplier,
          z: fz * forceMultiplier
        });
      }
    } catch (error) {
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    try {
      const alpha = Math.max(0, 1 - this.life / this.config.maxLife);
      
      if (alpha < 0.1) {return;}
      
      const radius = 18 + Math.sin(this.life * 0.08) * 4;
      
      const color = this.isRepulsive ? 'rgba(255, 120, 120,' : 'rgba(120, 180, 255,';
      
      ctx.strokeStyle = `${color} ${(alpha * 0.8).toString()})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = `${color} ${alpha.toString()})`;
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, 2, 0, Math.PI * 2);
      ctx.fill();
    } catch (error) {
    }
  }

  public isDead(): boolean {
    return this.life > this.config.maxLife;
  }

  public getAlpha(): number {
    return Math.max(0, 1 - this.life / this.config.maxLife);
  }

  private calculateForce(dist: number): number {
    const minDistance = 5;
    const effectiveDistance = Math.max(dist, minDistance);
    
    const baseForce = this.strength * 100;
    const distanceSquared = effectiveDistance * effectiveDistance;
    
    return baseForce / (distanceSquared + 100);
  }
}