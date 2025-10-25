export interface User {
  id: string;
  email: string;
  username: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationPreset {
  id: string;
  userId: string;
  name: string;
  description?: string;
  config: {
    particleCount: number;
    showTrails: boolean;
    particle: {
      maxTrailLength: number;
      maxSpeed: number;
      minLifespan: number;
      maxLifespan: number;
    };
    gravityWell: {
      strength: number;
      maxLife: number;
      maxRange: number;
    };
  };
  isPublic: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface CreatePresetRequest {
  name: string;
  description?: string;
  config: SimulationPreset['config'];
  isPublic?: boolean;
}

export interface UpdatePresetRequest {
  name?: string;
  description?: string;
  config?: SimulationPreset['config'];
  isPublic?: boolean;
}

export interface RoomData {
  id: string;
  name: string;
  hostId: string;
  participants: string[];
  maxParticipants: number;
  config: SimulationPreset['config'];
  gravityWells: GravityWellData[];
  createdAt: Date;
}

export interface GravityWellData {
  id: string;
  position: { x: number; y: number };
  strength: number;
  isRepulsive: boolean;
  life: number;
  createdBy: string;
  timestamp: number;
}

export interface SocketUser {
  id: string;
  username: string;
  roomId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}
