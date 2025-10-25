import type { Vector2D, Vector3D, CanvasRect } from '../types';

export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

export function isValidPosition(position: Vector2D, bounds: CanvasRect): boolean {
  return (
    isValidNumber(position.x) &&
    isValidNumber(position.y) &&
    position.x >= 0 &&
    position.x <= bounds.width &&
    position.y >= 0 &&
    position.y <= bounds.height
  );
}

export function isValidVector2D(vector: unknown): vector is Vector2D {
  return (
    typeof vector === 'object' &&
    vector !== null &&
    'x' in vector &&
    'y' in vector &&
    isValidNumber((vector as Vector2D).x) &&
    isValidNumber((vector as Vector2D).y)
  );
}

export function isValidVector3D(vector: unknown): vector is Vector3D {
  return (
    typeof vector === 'object' &&
    vector !== null &&
    'x' in vector &&
    'y' in vector &&
    'z' in vector &&
    isValidNumber((vector as Vector3D).x) &&
    isValidNumber((vector as Vector3D).y) &&
    isValidNumber((vector as Vector3D).z)
  );
}

export function sanitizeNumber(value: unknown, min: number, max: number, defaultValue: number): number {
  if (!isValidNumber(value)) {
    return defaultValue;
  }
  return Math.min(Math.max(value, min), max);
}

export function isValidCanvasContext(ctx: unknown): ctx is CanvasRenderingContext2D {
  if (typeof CanvasRenderingContext2D === 'undefined') {
    return ctx !== null && typeof ctx === 'object' && 'fillRect' in (ctx);
  }
  return ctx instanceof CanvasRenderingContext2D;
}