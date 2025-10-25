import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { setCache, getCache, deleteCache } from '../config/redis';
import { SimulationPreset, CreatePresetRequest, UpdatePresetRequest, PaginatedResponse } from '../types';

export class PresetService {
  async createPreset(userId: string, presetData: CreatePresetRequest): Promise<SimulationPreset> {
    const { name, description, config, isPublic = false } = presetData;
    const presetId = uuidv4();

    const result = await query(
      `INSERT INTO simulation_presets (id, user_id, name, description, config, is_public) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [presetId, userId, name, description, JSON.stringify(config), isPublic]
    );

    const preset = this.mapDbRowToPreset(result.rows[0]);
    
    await deleteCache(`user_presets:${userId}`);
    if (isPublic) {
      await deleteCache('public_presets');
    }

    return preset;
  }

  async getUserPresets(userId: string, page = 1, limit = 20): Promise<PaginatedResponse<SimulationPreset>> {
    const offset = (page - 1) * limit;
    const cacheKey = `user_presets:${userId}:${page}:${limit}`;
    
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const countResult = await query(
      'SELECT COUNT(*) FROM simulation_presets WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT sp.*, u.username as creator_username 
       FROM simulation_presets sp 
       JOIN users u ON sp.user_id = u.id 
       WHERE sp.user_id = $1 
       ORDER BY sp.created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const presets = result.rows.map(row => this.mapDbRowToPreset(row));
    
    const response = {
      items: presets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    await setCache(cacheKey, response, 300);
    return response;
  }

  async getPublicPresets(page = 1, limit = 20, sortBy: 'recent' | 'popular' = 'recent'): Promise<PaginatedResponse<SimulationPreset>> {
    const offset = (page - 1) * limit;
    const cacheKey = `public_presets:${sortBy}:${page}:${limit}`;
    
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const countResult = await query(
      'SELECT COUNT(*) FROM simulation_presets WHERE is_public = true',
      []
    );
    const total = parseInt(countResult.rows[0].count);

    const orderBy = sortBy === 'popular' ? 'sp.likes DESC, sp.created_at DESC' : 'sp.created_at DESC';
    
    const result = await query(
      `SELECT sp.*, u.username as creator_username 
       FROM simulation_presets sp 
       JOIN users u ON sp.user_id = u.id 
       WHERE sp.is_public = true 
       ORDER BY ${orderBy}
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const presets = result.rows.map(row => this.mapDbRowToPreset(row));
    
    const response = {
      items: presets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };

    await setCache(cacheKey, response, 600);
    return response;
  }

  async getPresetById(presetId: string, userId?: string): Promise<SimulationPreset | null> {
    const cacheKey = `preset:${presetId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await query(
      `SELECT sp.*, u.username as creator_username 
       FROM simulation_presets sp 
       JOIN users u ON sp.user_id = u.id 
       WHERE sp.id = $1`,
      [presetId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const preset = this.mapDbRowToPreset(result.rows[0]);
    
    if (!preset.isPublic && preset.userId !== userId) {
      return null;
    }

    await setCache(cacheKey, preset, 3600);
    return preset;
  }

  async updatePreset(presetId: string, userId: string, updateData: UpdatePresetRequest): Promise<SimulationPreset | null> {
    const existingPreset = await this.getPresetById(presetId, userId);
    if (!existingPreset || existingPreset.userId !== userId) {
      return null;
    }

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (updateData.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(updateData.name);
    }

    if (updateData.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(updateData.description);
    }

    if (updateData.config !== undefined) {
      updateFields.push(`config = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updateData.config));
    }

    if (updateData.isPublic !== undefined) {
      updateFields.push(`is_public = $${paramIndex++}`);
      updateValues.push(updateData.isPublic);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date());

    updateValues.push(presetId);

    const result = await query(
      `UPDATE simulation_presets 
       SET ${updateFields.join(', ')} 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return null;
    }

    const updatedPreset = this.mapDbRowToPreset(result.rows[0]);
    
    await deleteCache(`preset:${presetId}`);
    await deleteCache(`user_presets:${userId}`);
    if (existingPreset.isPublic || updatedPreset.isPublic) {
      await deleteCache('public_presets');
    }

    return updatedPreset;
  }

  async deletePreset(presetId: string, userId: string): Promise<boolean> {
    const preset = await this.getPresetById(presetId, userId);
    if (!preset || preset.userId !== userId) {
      return false;
    }

    const result = await query(
      'DELETE FROM simulation_presets WHERE id = $1 AND user_id = $2',
      [presetId, userId]
    );

    if (result.rowCount === 0) {
      return false;
    }

    await deleteCache(`preset:${presetId}`);
    await deleteCache(`user_presets:${userId}`);
    if (preset.isPublic) {
      await deleteCache('public_presets');
    }

    return true;
  }

  async likePreset(presetId: string, userId: string): Promise<{ success: boolean; likes: number }> {
    const preset = await this.getPresetById(presetId);
    if (!preset || !preset.isPublic) {
      throw new Error('Preset not found or not public');
    }

    const likeKey = `like:${presetId}:${userId}`;
    const existingLike = await getCache(likeKey);
    
    if (existingLike) {
      throw new Error('Already liked this preset');
    }

    const result = await query(
      'UPDATE simulation_presets SET likes = likes + 1 WHERE id = $1 RETURNING likes',
      [presetId]
    );

    const likes = result.rows[0].likes;
    
    await setCache(likeKey, true, 86400 * 30);
    await deleteCache(`preset:${presetId}`);
    await deleteCache('public_presets');

    return { success: true, likes };
  }

  async searchPresets(
    query: string, 
    page = 1, 
    limit = 20, 
    userId?: string
  ): Promise<PaginatedResponse<SimulationPreset>> {
    const offset = (page - 1) * limit;
    const searchQuery = `%${query.toLowerCase()}%`;

    const whereClause = userId 
      ? '(sp.is_public = true OR sp.user_id = $3) AND (LOWER(sp.name) LIKE $1 OR LOWER(sp.description) LIKE $1)'
      : 'sp.is_public = true AND (LOWER(sp.name) LIKE $1 OR LOWER(sp.description) LIKE $1)';

    const countParams = userId ? [searchQuery, userId] : [searchQuery];
    const searchParams = userId ? [searchQuery, limit, offset, userId] : [searchQuery, limit, offset];

    const countResult = await query(
      `SELECT COUNT(*) FROM simulation_presets sp WHERE ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT sp.*, u.username as creator_username 
       FROM simulation_presets sp 
       JOIN users u ON sp.user_id = u.id 
       WHERE ${whereClause}
       ORDER BY sp.created_at DESC 
       LIMIT $2 OFFSET $3`,
      searchParams
    );

    const presets = result.rows.map(row => this.mapDbRowToPreset(row));

    return {
      items: presets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  private mapDbRowToPreset(row: any): SimulationPreset {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      isPublic: row.is_public,
      likes: row.likes || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
