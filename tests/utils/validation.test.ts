import { describe, it, expect } from 'vitest';
import {
  isValidNumber,
  isValidPosition,
  isValidVector2D,
  sanitizeNumber,
  isValidCanvasContext
} from '../../src/utils/validation';
import { createMockContext } from '../setup';

describe('Validation Utils', () => {
  describe('isValidNumber', () => {
    it('should validate finite numbers', () => {
      expect(isValidNumber(5)).toBe(true);
      expect(isValidNumber(0)).toBe(true);
      expect(isValidNumber(-5.5)).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidNumber(NaN)).toBe(false);
      expect(isValidNumber(Infinity)).toBe(false);
      expect(isValidNumber(-Infinity)).toBe(false);
      expect(isValidNumber('5')).toBe(false);
      expect(isValidNumber(null)).toBe(false);
      expect(isValidNumber(undefined)).toBe(false);
    });
  });

  describe('isValidPosition', () => {
    const bounds = { width: 800, height: 600 };

    it('should validate positions within bounds', () => {
      expect(isValidPosition({ x: 400, y: 300 }, bounds)).toBe(true);
      expect(isValidPosition({ x: 0, y: 0 }, bounds)).toBe(true);
      expect(isValidPosition({ x: 800, y: 600 }, bounds)).toBe(true);
    });

    it('should reject positions outside bounds', () => {
      expect(isValidPosition({ x: -1, y: 300 }, bounds)).toBe(false);
      expect(isValidPosition({ x: 400, y: -1 }, bounds)).toBe(false);
      expect(isValidPosition({ x: 801, y: 300 }, bounds)).toBe(false);
      expect(isValidPosition({ x: 400, y: 601 }, bounds)).toBe(false);
    });

    it('should reject invalid coordinates', () => {
      expect(isValidPosition({ x: NaN, y: 300 }, bounds)).toBe(false);
      expect(isValidPosition({ x: 400, y: Infinity }, bounds)).toBe(false);
    });
  });

  describe('isValidVector2D', () => {
    it('should validate proper Vector2D objects', () => {
      expect(isValidVector2D({ x: 5, y: 10 })).toBe(true);
      expect(isValidVector2D({ x: 0, y: 0 })).toBe(true);
      expect(isValidVector2D({ x: -5.5, y: 3.14 })).toBe(true);
    });

    it('should reject invalid Vector2D objects', () => {
      expect(isValidVector2D(null)).toBe(false);
      expect(isValidVector2D(undefined)).toBe(false);
      expect(isValidVector2D({})).toBe(false);
      expect(isValidVector2D({ x: 5 })).toBe(false);
      expect(isValidVector2D({ y: 5 })).toBe(false);
      expect(isValidVector2D({ x: NaN, y: 5 })).toBe(false);
      expect(isValidVector2D({ x: 5, y: 'invalid' })).toBe(false);
    });
  });

  describe('sanitizeNumber', () => {
    it('should return valid numbers within bounds', () => {
      expect(sanitizeNumber(5, 0, 10, 1)).toBe(5);
      expect(sanitizeNumber(0, 0, 10, 1)).toBe(0);
      expect(sanitizeNumber(10, 0, 10, 1)).toBe(10);
    });

    it('should clamp numbers outside bounds', () => {
      expect(sanitizeNumber(-5, 0, 10, 1)).toBe(0);
      expect(sanitizeNumber(15, 0, 10, 1)).toBe(10);
    });

    it('should return default for invalid values', () => {
      expect(sanitizeNumber(NaN, 0, 10, 5)).toBe(5);
      expect(sanitizeNumber('invalid', 0, 10, 5)).toBe(5);
      expect(sanitizeNumber(null, 0, 10, 5)).toBe(5);
      expect(sanitizeNumber(undefined, 0, 10, 5)).toBe(5);
    });
  });

  describe('isValidCanvasContext', () => {
    it('should validate canvas context', () => {
      const ctx = createMockContext();
      expect(isValidCanvasContext(ctx)).toBe(true);
    });

    it('should reject invalid contexts', () => {
      expect(isValidCanvasContext(null)).toBe(false);
      expect(isValidCanvasContext(undefined)).toBe(false);
      expect(isValidCanvasContext({})).toBe(false);
      expect(isValidCanvasContext('context')).toBe(false);
    });
  });
});
