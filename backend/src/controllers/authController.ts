import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { LoginRequest, RegisterRequest, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const authService = new AuthService();

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password }: RegisterRequest = req.body;

    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        error: 'Email, username, and password are required'
      } as ApiResponse);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse);
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 30 characters'
      } as ApiResponse);
      return;
    }

    const passwordValidation = await authService.validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Password validation failed',
        data: { errors: passwordValidation.errors }
      } as ApiResponse);
      return;
    }

    const result = await authService.register({ email, username, password });
    
    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens
      },
      message: 'User registered successfully'
    } as ApiResponse);
  } catch (error) {

    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        } as ApiResponse);
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    } as ApiResponse);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      } as ApiResponse);
      return;
    }

    const result = await authService.login({ email, password });
    
    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        tokens: result.tokens
      },
      message: 'Login successful'
    } as ApiResponse);
  } catch (error) {

    
    if (error instanceof Error && error.message === 'Invalid credentials') {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse);
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    } as ApiResponse);
  }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required'
      } as ApiResponse);
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);
    
    res.status(200).json({
      success: true,
      data: { tokens },
      message: 'Token refreshed successfully'
    } as ApiResponse);
  } catch (error) {

    
    res.status(401).json({
      success: false,
      error: 'Invalid refresh token'
    } as ApiResponse);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (refreshToken) {
      await authService.logout(userId, refreshToken);
    }
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    } as ApiResponse);
  } catch (error) {

    
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    } as ApiResponse);
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    const user = await authService.findUserById(userId);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { user },
      message: 'Profile retrieved successfully'
    } as ApiResponse);
  } catch (error) {

    
    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving profile'
    } as ApiResponse);
  }
};

export const validateToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
    message: 'Token is valid'
  } as ApiResponse);
};
