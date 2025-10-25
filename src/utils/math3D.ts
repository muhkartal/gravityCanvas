import type { Vector3D } from '../types';

export function magnitude3D(vector: Vector3D): number {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
}

export function normalize3D(vector: Vector3D): Vector3D {
  const mag = magnitude3D(vector);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return {
    x: vector.x / mag,
    y: vector.y / mag,
    z: vector.z / mag
  };
}

export function distance3D(a: Vector3D, b: Vector3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function add3D(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z
  };
}

export function subtract3D(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z
  };
}

export function scale3D(vector: Vector3D, scalar: number): Vector3D {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar
  };
}

export function dot3D(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross3D(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}
