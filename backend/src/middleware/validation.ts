import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required().max(255),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

export const validatePresetCreation = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500).optional(),
    isPublic: Joi.boolean().optional(),
    config: Joi.object({
      particleCount: Joi.number().integer().min(1).max(10000).required(),
      showTrails: Joi.boolean().required(),
      particle: Joi.object({
        maxTrailLength: Joi.number().integer().min(1).max(100).required(),
        maxSpeed: Joi.number().min(0.1).max(50).required(),
        minLifespan: Joi.number().integer().min(1).max(1000).required(),
        maxLifespan: Joi.number().integer().min(1).max(2000).required()
      }).required(),
      gravityWell: Joi.object({
        strength: Joi.number().min(1).max(1000).required(),
        maxLife: Joi.number().integer().min(1).max(2000).required(),
        maxRange: Joi.number().min(10).max(1000).required()
      }).required()
    }).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

export const validatePresetUpdate = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).optional(),
    description: Joi.string().max(500).optional(),
    isPublic: Joi.boolean().optional(),
    config: Joi.object({
      particleCount: Joi.number().integer().min(1).max(10000).optional(),
      showTrails: Joi.boolean().optional(),
      particle: Joi.object({
        maxTrailLength: Joi.number().integer().min(1).max(100).optional(),
        maxSpeed: Joi.number().min(0.1).max(50).optional(),
        minLifespan: Joi.number().integer().min(1).max(1000).optional(),
        maxLifespan: Joi.number().integer().min(1).max(2000).optional()
      }).optional(),
      gravityWell: Joi.object({
        strength: Joi.number().min(1).max(1000).optional(),
        maxLife: Joi.number().integer().min(1).max(2000).optional(),
        maxRange: Joi.number().min(10).max(1000).optional()
      }).optional()
    }).optional()
  }).min(1);

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).max(1000).optional(),
    limit: Joi.number().integer().min(1).max(50).optional(),
    sortBy: Joi.string().valid('recent', 'popular').optional(),
    q: Joi.string().min(2).max(100).optional()
  });

  const { error } = schema.validate(req.query);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
      [paramName]: Joi.string().guid({ version: 'uuidv4' }).required()
    });

    const { error } = schema.validate({ [paramName]: req.params[paramName] });
    if (error) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName} format`
      });
    }

    next();
  };
};
