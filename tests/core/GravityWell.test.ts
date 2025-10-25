import { describe, it, expect, beforeEach } from 'vitest';
import { GravityWell } from '../../src/core/GravityWell';
import { Particle3D } from '../../src/core/Particle3D';
import { createMockContext } from '../setup';
import type { GravityWellConfig, ParticleConfig, CanvasRect } from '../../src/types';

describe('GravityWell', () => {
  let wellConfig: GravityWellConfig;
  let particleConfig: ParticleConfig;
  let canvasBounds: CanvasRect;

  beforeEach(() => {
    wellConfig = {
      strength: 50,
      maxLife: 300,
      maxRange: 200
    };
    particleConfig = {
      maxTrailLength: 20,
      maxSpeed: 5,
      minLifespan: 200,
      maxLifespan: 300,
      size: 2.0,
      use3D: true
    };
    canvasBounds = { width: 800, height: 600 };
  });

  describe('constructor', () => {
    it('should create gravity well with valid parameters', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);

      expect(well.position.x).toBe(100);
      expect(well.position.y).toBe(200);
      expect(well.strength).toBe(50);
      expect(well.isRepulsive).toBe(false);
      expect(well.life).toBe(0);
    });

    it('should create repulsive gravity well', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 80, true, wellConfig);

      expect(well.isRepulsive).toBe(true);
      expect(well.strength).toBe(80);
    });

    it('should ensure positive strength', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, -50, false, wellConfig);

      expect(well.strength).toBe(50);
    });

    it('should throw error for invalid position', () => {
      const invalidPosition = { x: NaN, y: 200 };
      expect(() => new GravityWell(invalidPosition, 50, false, wellConfig))
        .toThrow('Invalid gravity well position provided');
    });

    it('should throw error for invalid strength', () => {
      const position = { x: 100, y: 200 };
      expect(() => new GravityWell(position, NaN, false, wellConfig))
        .toThrow('Invalid gravity well strength provided');
    });
  });

  describe('update', () => {
    it('should increment life', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);

      expect(well.life).toBe(0);
      well.update();
      expect(well.life).toBe(1);
      well.update();
      expect(well.life).toBe(2);
    });
  });

  describe('applyForceToParticle', () => {
    it('should apply attractive force to nearby particle', () => {
      const wellPosition = { x: 100, y: 100 };
      const well = new GravityWell(wellPosition, 50, false, wellConfig);
      
      const particlePosition = { x: 150, y: 100 };
      const particle = new Particle3D({ ...particlePosition, z: 0 }, particleConfig, canvasBounds);
      
      well.applyForceToParticle(particle);
      
      expect(particle.acceleration.x).toBeLessThan(0);
      expect(particle.acceleration.y).toBe(0);
    });

    it('should apply repulsive force to nearby particle', () => {
      const wellPosition = { x: 100, y: 100 };
      const well = new GravityWell(wellPosition, 50, true, wellConfig);
      
      const particlePosition = { x: 150, y: 100 };
      const particle = new Particle3D({ ...particlePosition, z: 0 }, particleConfig, canvasBounds);
      
      well.applyForceToParticle(particle);
      
      expect(particle.acceleration.x).toBeGreaterThan(0);
      expect(particle.acceleration.y).toBe(0);
    });

    it('should not affect particles outside range', () => {
      const wellPosition = { x: 100, y: 100 };
      const well = new GravityWell(wellPosition, 50, false, wellConfig);
      
      const particlePosition = { x: 400, y: 100 };
      const particle = new Particle3D({ ...particlePosition, z: 0 }, particleConfig, canvasBounds);
      
      well.applyForceToParticle(particle);
      

      expect(particle.acceleration.x).toBe(0);
      expect(particle.acceleration.y).toBe(0);
    });

    it('should handle particle at same position as well', () => {
      const wellPosition = { x: 100, y: 100 };
      const well = new GravityWell(wellPosition, 50, false, wellConfig);
      
      const particlePosition = { x: 100, y: 100 };
      const particle = new Particle3D({ ...particlePosition, z: 0 }, particleConfig, canvasBounds);
      
      expect(() => well.applyForceToParticle(particle)).not.toThrow();
      

      expect(isFinite(particle.acceleration.x)).toBe(true);
      expect(isFinite(particle.acceleration.y)).toBe(true);
    });
  });

  describe('draw', () => {
    it('should draw gravity well without errors', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);
      const ctx = createMockContext();

      expect(() => well.draw(ctx)).not.toThrow();
    });

    it('should draw repulsive well differently', () => {
      const position = { x: 100, y: 200 };
      const attractiveWell = new GravityWell(position, 50, false, wellConfig);
      const repulsiveWell = new GravityWell(position, 50, true, wellConfig);
      const ctx = createMockContext();

      expect(() => attractiveWell.draw(ctx)).not.toThrow();
      expect(() => repulsiveWell.draw(ctx)).not.toThrow();
    });
  });

  describe('isDead', () => {
    it('should return false when young', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);

      expect(well.isDead()).toBe(false);
    });

    it('should return true when old', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);


      for (let i = 0; i <= wellConfig.maxLife; i++) {
        well.update();
      }

      expect(well.isDead()).toBe(true);
    });
  });

  describe('getAlpha', () => {
    it('should return 1 when young', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);

      expect(well.getAlpha()).toBe(1);
    });

    it('should return 0 when at max life', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);


      for (let i = 0; i < wellConfig.maxLife; i++) {
        well.update();
      }

      expect(well.getAlpha()).toBe(0);
    });

    it('should return value between 0 and 1 when middle-aged', () => {
      const position = { x: 100, y: 200 };
      const well = new GravityWell(position, 50, false, wellConfig);


      for (let i = 0; i < wellConfig.maxLife / 2; i++) {
        well.update();
      }

      const alpha = well.getAlpha();
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(1);
      expect(alpha).toBeCloseTo(0.5);
    });
  });
});
