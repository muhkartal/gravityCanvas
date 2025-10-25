export interface Vector2D {
  x: number;
  y: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CanvasRect {
  width: number;
  height: number;
}

export interface GravityWellConfig {
  strength: number;
  maxLife: number;
  maxRange: number;
}

export interface ParticleConfig {
  maxTrailLength: number;
  maxSpeed: number;
  minLifespan: number;
  maxLifespan: number;
  size: number;
  use3D: boolean;
}

export interface SimulationConfig {
  particleCount: number;
  showTrails: boolean;
  isPaused: boolean;
  particle: ParticleConfig;
  gravityWell: GravityWellConfig;
}

export interface MouseInteraction {
  position: Vector2D;
  button: 'left' | 'right';
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleCount: number;
  wellCount: number;
  memoryUsage?: number;
  gpuInfo?: string;
}

export type UICallback = () => void;

export interface UICallbacks {
  onClear?: UICallback;
  onToggleTrails?: UICallback;
  onTogglePause?: UICallback;
  onReset?: UICallback;
  onHelp?: UICallback;
}

export type ColorSpace = 'srgb' | 'display-p3' | 'rec2020';

export interface ModernColorConfig {
  space: ColorSpace;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
}

export interface FrameMetrics {
  timestamp: number;
  duration: number;
  particles: number;
  wells: number;
}