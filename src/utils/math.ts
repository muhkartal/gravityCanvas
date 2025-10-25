import type { Vector2D } from '../types';

export function distance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceSquared(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalize(vector: Vector2D): Vector2D {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) {return { x: 0, y: 0 };}
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude
  };
}

export function magnitude(vector: Vector2D): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}