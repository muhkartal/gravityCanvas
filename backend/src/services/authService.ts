import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { setSession, deleteSession } from '../config/redis';
import { User, AuthTokens, LoginRequest, RegisterRequest, JwtPayload } from '../types';

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

  async register(userData: RegisterRequest): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    const { email, username, password } = userData;

    const existingUser = await this.findUserByEmailOrUsername(email, username);
    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const result = await query(
      `INSERT INTO users (id, email, username, password_hash) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, username, created_at, updated_at`,
      [userId, email.toLowerCase(), username, hashedPassword]
    );

    const user = result.rows[0] as Omit<User, 'password'>;
    const tokens = await this.generateTokens(user);

    await this.storeRefreshToken(userId, tokens.refreshToken);

    return { user, tokens };
  }

  async login(credentials: LoginRequest): Promise<{ user: Omit<User, 'password'>; tokens: AuthTokens }> {
    const { email, password } = credentials;

    const result = await query(
      'SELECT id, email, username, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0] as User & { password_hash: string };
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    const tokens = await this.generateTokens(userWithoutPassword);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: userWithoutPassword, tokens };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as JwtPayload & { type: string };
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      const result = await query(
        'SELECT id, email, username FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0] as Omit<User, 'password'>;
      const tokens = await this.generateTokens(user);
      
      await this.storeRefreshToken(user.id, tokens.refreshToken);
      
      return tokens;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await deleteSession(`refresh_token:${userId}`);
    
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as JwtPayload;
      await deleteSession(`session:${decoded.userId}`);
    } catch (error) {

    }
  }

  async findUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const result = await query(
      'SELECT id, email, username, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] as Omit<User, 'password'> : null;
  }

  private async findUserByEmailOrUsername(email: string, username: string): Promise<User | null> {
    const result = await query(
      'SELECT id, email, username FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    return result.rows.length > 0 ? result.rows[0] as User : null;
  }

  private async generateTokens(user: Omit<User, 'password'>): Promise<AuthTokens> {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.JWT_EXPIRES_IN,
      issuer: 'gravity-canvas-api',
      audience: 'gravity-canvas-app'
    });

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_REFRESH_EXPIRES_IN,
        issuer: 'gravity-canvas-api',
        audience: 'gravity-canvas-app'
      }
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const ttl = 30 * 24 * 60 * 60;
    await setSession(`refresh_token:${userId}`, { token: refreshToken }, ttl);
  }

  async validatePassword(password: string): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
