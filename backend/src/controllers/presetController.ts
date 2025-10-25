import { Request, Response } from 'express';
import { PresetService } from '../services/presetService';
import { CreatePresetRequest, UpdatePresetRequest, ApiResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const presetService = new PresetService();

export const createPreset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    const { name, description, config, isPublic }: CreatePresetRequest = req.body;

    if (!name || !config) {
      res.status(400).json({
        success: false,
        error: 'Name and config are required'
      } as ApiResponse);
      return;
    }

    if (name.length < 3 || name.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Name must be between 3 and 100 characters'
      } as ApiResponse);
      return;
    }

    if (description && description.length > 500) {
      res.status(400).json({
        success: false,
        error: 'Description must be less than 500 characters'
      } as ApiResponse);
      return;
    }

    if (!isValidConfig(config)) {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration format'
      } as ApiResponse);
      return;
    }

    const preset = await presetService.createPreset(userId, {
      name,
      description,
      config,
      isPublic
    });

    res.status(201).json({
      success: true,
      data: { preset },
      message: 'Preset created successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while creating preset'
    } as ApiResponse);
  }
};

export const getUserPresets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const presets = await presetService.getUserPresets(userId, page, limit);

    res.status(200).json({
      success: true,
      data: presets,
      message: 'User presets retrieved successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving presets'
    } as ApiResponse);
  }
};

export const getPublicPresets = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const sortBy = (req.query.sortBy as 'recent' | 'popular') || 'recent';

    const presets = await presetService.getPublicPresets(page, limit, sortBy);

    res.status(200).json({
      success: true,
      data: presets,
      message: 'Public presets retrieved successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving public presets'
    } as ApiResponse);
  }
};

export const getPresetById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Preset ID is required'
      } as ApiResponse);
      return;
    }

    const preset = await presetService.getPresetById(id, userId);

    if (!preset) {
      res.status(404).json({
        success: false,
        error: 'Preset not found'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { preset },
      message: 'Preset retrieved successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while retrieving preset'
    } as ApiResponse);
  }
};

export const updatePreset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Preset ID is required'
      } as ApiResponse);
      return;
    }

    const updateData: UpdatePresetRequest = req.body;

    if (updateData.name && (updateData.name.length < 3 || updateData.name.length > 100)) {
      res.status(400).json({
        success: false,
        error: 'Name must be between 3 and 100 characters'
      } as ApiResponse);
      return;
    }

    if (updateData.description && updateData.description.length > 500) {
      res.status(400).json({
        success: false,
        error: 'Description must be less than 500 characters'
      } as ApiResponse);
      return;
    }

    if (updateData.config && !isValidConfig(updateData.config)) {
      res.status(400).json({
        success: false,
        error: 'Invalid configuration format'
      } as ApiResponse);
      return;
    }

    const preset = await presetService.updatePreset(id, userId, updateData);

    if (!preset) {
      res.status(404).json({
        success: false,
        error: 'Preset not found or not authorized'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      data: { preset },
      message: 'Preset updated successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while updating preset'
    } as ApiResponse);
  }
};

export const deletePreset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Preset ID is required'
      } as ApiResponse);
      return;
    }

    const deleted = await presetService.deletePreset(id, userId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Preset not found or not authorized'
      } as ApiResponse);
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Preset deleted successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting preset'
    } as ApiResponse);
  }
};

export const likePreset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
      return;
    }

    if (!id) {
      res.status(400).json({
        success: false,
        error: 'Preset ID is required'
      } as ApiResponse);
      return;
    }

    const result = await presetService.likePreset(id, userId);

    res.status(200).json({
      success: true,
      data: { likes: result.likes },
      message: 'Preset liked successfully'
    } as ApiResponse);
  } catch (error) {

    
    if (error instanceof Error) {
      if (error.message.includes('Already liked') || error.message.includes('not found')) {
        res.status(400).json({
          success: false,
          error: error.message
        } as ApiResponse);
        return;
      }
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error while liking preset'
    } as ApiResponse);
  }
};

export const searchPresets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const userId = req.user?.userId;

    if (!query || query.trim().length < 2) {
      res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      } as ApiResponse);
      return;
    }

    const presets = await presetService.searchPresets(query.trim(), page, limit, userId);

    res.status(200).json({
      success: true,
      data: presets,
      message: 'Search completed successfully'
    } as ApiResponse);
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Internal server error while searching presets'
    } as ApiResponse);
  }
};

const isValidConfig = (config: any): boolean => {
  try {
    return (
      typeof config === 'object' &&
      config !== null &&
      typeof config.particleCount === 'number' &&
      config.particleCount > 0 &&
      config.particleCount <= 10000 &&
      typeof config.showTrails === 'boolean' &&
      typeof config.particle === 'object' &&
      typeof config.particle.maxTrailLength === 'number' &&
      typeof config.particle.maxSpeed === 'number' &&
      typeof config.particle.minLifespan === 'number' &&
      typeof config.particle.maxLifespan === 'number' &&
      typeof config.gravityWell === 'object' &&
      typeof config.gravityWell.strength === 'number' &&
      typeof config.gravityWell.maxLife === 'number' &&
      typeof config.gravityWell.maxRange === 'number'
    );
  } catch {
    return false;
  }
};
