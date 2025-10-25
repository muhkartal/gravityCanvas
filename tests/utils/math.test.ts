import { describe, it, expect } from 'vitest';
import { 
  distance, 
  distanceSquared, 
  normalize, 
  magnitude, 
  clamp, 
  lerp, 
  map, 
  random, 
  randomInt 
} from '../../src/utils/math';

describe('Math Utils', () => {
  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(distance(a, b)).toBe(5);
    });

    it('should return 0 for same points', () => {
      const a = { x: 5, y: 5 };
      const b = { x: 5, y: 5 };
      expect(distance(a, b)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const a = { x: -3, y: -4 };
      const b = { x: 0, y: 0 };
      expect(distance(a, b)).toBe(5);
    });
  });

  describe('distanceSquared', () => {
    it('should calculate squared distance', () => {
      const a = { x: 0, y: 0 };
      const b = { x: 3, y: 4 };
      expect(distanceSquared(a, b)).toBe(25);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector to unit length', () => {
      const vector = { x: 3, y: 4 };
      const normalized = normalize(vector);
      expect(normalized.x).toBeCloseTo(0.6);
      expect(normalized.y).toBeCloseTo(0.8);
      expect(magnitude(normalized)).toBeCloseTo(1);
    });

    it('should handle zero vector', () => {
      const vector = { x: 0, y: 0 };
      const normalized = normalize(vector);
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('magnitude', () => {
    it('should calculate vector magnitude', () => {
      const vector = { x: 3, y: 4 };
      expect(magnitude(vector)).toBe(5);
    });

    it('should return 0 for zero vector', () => {
      const vector = { x: 0, y: 0 };
      expect(magnitude(vector)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    it('should interpolate between values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('should clamp t parameter', () => {
      expect(lerp(0, 10, -0.5)).toBe(0);
      expect(lerp(0, 10, 1.5)).toBe(10);
    });
  });

  describe('map', () => {
    it('should map value from one range to another', () => {
      expect(map(5, 0, 10, 0, 100)).toBe(50);
      expect(map(0, 0, 10, 0, 100)).toBe(0);
      expect(map(10, 0, 10, 0, 100)).toBe(100);
    });

    it('should handle negative ranges', () => {
      expect(map(0, -10, 10, 0, 100)).toBe(50);
    });
  });

  describe('random', () => {
    it('should generate random number within range', () => {
      const result = random(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
    });

    it('should handle same min and max', () => {
      const result = random(5, 5);
      expect(result).toBe(5);
    });
  });

  describe('randomInt', () => {
    it('should generate random integer within range', () => {
      const result = randomInt(0, 10);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should handle same min and max', () => {
      const result = randomInt(5, 5);
      expect(result).toBe(5);
    });
  });
});
