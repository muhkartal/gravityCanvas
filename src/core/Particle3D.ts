import type { Vector3D, ParticleConfig, CanvasRect } from '../types';
import { magnitude3D } from '../utils/math3D';
import { isValidNumber, isValidVector3D } from '../utils/validation';

export class Particle3D {
  public position: Vector3D;
  public velocity: Vector3D;
  public acceleration: Vector3D;
  public trail: Vector3D[];
  public life: number;
  
  private readonly config: ParticleConfig;
  private readonly canvasBounds: CanvasRect;

  constructor(
    position: Vector3D,
    config: ParticleConfig,
    canvasBounds: CanvasRect
  ) {
    if (!isValidVector3D(position)) {
      throw new Error('Invalid particle position provided');
    }
    
    if (!isValidNumber(canvasBounds.width) || !isValidNumber(canvasBounds.height)) {
      throw new Error('Invalid canvas bounds provided');
    }

    this.position = { ...position };
    this.velocity = {
      x: (Math.random() - 0.5) * 1.5,
      y: (Math.random() - 0.5) * 1.5,
      z: (Math.random() - 0.5) * 1.5
    };
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.trail = [];
    this.life = Math.random() * (config.maxLifespan - config.minLifespan) + config.minLifespan;
    this.config = { ...config };
    this.canvasBounds = { ...canvasBounds };
  }

  public update(): void {
    try {
      this.velocity.x += this.acceleration.x;
      this.velocity.y += this.acceleration.y;
      this.velocity.z += this.acceleration.z;
      
      const speed = magnitude3D(this.velocity);
      if (speed > this.config.maxSpeed) {
        const scale = this.config.maxSpeed / speed;
        this.velocity.x *= scale;
        this.velocity.y *= scale;
        this.velocity.z *= scale;
      }
      
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.position.z += this.velocity.z;
      
      this.acceleration.x = 0;
      this.acceleration.y = 0;
      this.acceleration.z = 0;
      
      const lastPoint = this.trail[this.trail.length - 1];
      const distanceFromLast = lastPoint ? 
        Math.sqrt((this.position.x - lastPoint.x) ** 2 + (this.position.y - lastPoint.y) ** 2 + (this.position.z - lastPoint.z) ** 2) : 
        Infinity;
      
      if (!lastPoint || distanceFromLast > 2.0) {
        this.trail.push({ ...this.position });
        
        if (this.trail.length > this.config.maxTrailLength) {
          this.trail.shift();
        }
      }
      
      this.wrapAroundEdges();
      
      this.life += 1;
    } catch (error) {
      this.resetToSafeState();
    }
  }

  public applyForce(force: Vector3D): void {
    if (!isValidVector3D(force)) {
      return;
    }

    this.acceleration.x += force.x;
    this.acceleration.y += force.y;
    this.acceleration.z += force.z;
  }

  public draw(ctx: CanvasRenderingContext2D, showTrails: boolean): void {
    try {
      const speed = magnitude3D(this.velocity);
      const hue = (speed * 60 + this.life * 0.3) % 360;
      
      if (showTrails && this.trail.length > 1) {
        this.drawTrail3D(ctx, hue);
      }
      
      this.drawParticle3D(ctx, hue);
    } catch (error) {
    }
  }

  public getSpeed(): number {
    return magnitude3D(this.velocity);
  }

  private resetToSafeState(): void {
    this.position = {
      x: Math.random() * this.canvasBounds.width,
      y: Math.random() * this.canvasBounds.height,
      z: (Math.random() - 0.5) * 200
    };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.trail = [];
  }

  private wrapAroundEdges(): void {
    let wrapped = false;
    
    if (this.position.x < 0) {
      this.position.x = this.canvasBounds.width;
      wrapped = true;
    } else if (this.position.x > this.canvasBounds.width) {
      this.position.x = 0;
      wrapped = true;
    }
    
    if (this.position.y < 0) {
      this.position.y = this.canvasBounds.height;
      wrapped = true;
    } else if (this.position.y > this.canvasBounds.height) {
      this.position.y = 0;
      wrapped = true;
    }
    
    if (this.position.z < -100) {
      this.position.z = 100;
      wrapped = true;
    } else if (this.position.z > 100) {
      this.position.z = -100;
      wrapped = true;
    }
    
    if (wrapped) {
      this.trail = [];
    }
  }

  private drawTrail3D(ctx: CanvasRenderingContext2D, hue: number): void {
    if (this.trail.length < 2) {return;}

    const speed = magnitude3D(this.velocity);
    
    ctx.beginPath();
    const firstPoint = this.trail[0];
    if (!firstPoint) {return;}
    
    const first2D = this.project3DTo2D(firstPoint);
    ctx.moveTo(first2D.x, first2D.y);
    
    for (let i = 1; i < this.trail.length; i++) {
      const current = this.trail[i];
      if (!current) continue;
      
      const current2D = this.project3DTo2D(current);
      ctx.lineTo(current2D.x, current2D.y);
    }
    
    const alpha = Math.min(0.8, 0.4 + speed * 0.1);
    const width = Math.max(1.5, 2.0 + speed * 0.2);
    
    ctx.strokeStyle = `hsla(${Math.floor(hue).toString()}, 85%, 65%, ${alpha.toString()})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  private drawParticle3D(ctx: CanvasRenderingContext2D, hue: number): void {
    const speed = magnitude3D(this.velocity);
    
    const pos2D = this.project3DTo2D(this.position);
    
    const depthScale = Math.max(0.3, 1.0 - (this.position.z + 100) / 200);
    const size = (this.config.size + Math.min(2, speed * 0.5)) * depthScale;
    
    ctx.fillStyle = `hsl(${Math.floor(hue).toString()}, 85%, 75%)`;
    
    ctx.beginPath();
    ctx.arc(pos2D.x, pos2D.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  private project3DTo2D(pos3D: Vector3D): Vector2D {
    const focalLength = 300;
    const z = pos3D.z + 100;
    
    return {
      x: (pos3D.x - this.canvasBounds.width / 2) * (focalLength / z) + this.canvasBounds.width / 2,
      y: (pos3D.y - this.canvasBounds.height / 2) * (focalLength / z) + this.canvasBounds.height / 2
    };
  }
}
