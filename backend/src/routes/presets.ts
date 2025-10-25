import { Router } from 'express';
import {
  createPreset,
  getUserPresets,
  getPublicPresets,
  getPresetById,
  updatePreset,
  deletePreset,
  likePreset,
  searchPresets
} from '../controllers/presetController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { 
  validatePresetCreation, 
  validatePresetUpdate, 
  validatePagination, 
  validateUUID 
} from '../middleware/validation';

const router = Router();

router.post('/', authenticateToken, validatePresetCreation, createPreset);
router.get('/user', authenticateToken, validatePagination, getUserPresets);
router.get('/public', validatePagination, getPublicPresets);
router.get('/search', optionalAuth, validatePagination, searchPresets);
router.get('/:id', optionalAuth, validateUUID('id'), getPresetById);
router.put('/:id', authenticateToken, validateUUID('id'), validatePresetUpdate, updatePreset);
router.delete('/:id', authenticateToken, validateUUID('id'), deletePreset);
router.post('/:id/like', authenticateToken, validateUUID('id'), likePreset);

export default router;
