import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { UserRepository } from '../repositories/user.repository.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);
      res.status(201).json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        const firstMsg = err.errors?.[0]?.message || 'Validation Error';
        res.status(400).json({ error: firstMsg, details: err.errors });
        return;
      }
      res.status(400).json({ error: err.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated.username, validated.password);
      res.status(200).json(result);
    } catch (err: any) {
      if (err.name === 'ZodError') {
        res.status(400).json({ error: 'Validation Error', details: err.errors });
        return;
      }
      res.status(401).json({ error: err.message || 'Authentication failed' });
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({ message: 'Successfully logged out' });
  }

  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = await UserRepository.findById(req.user!.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(200).json({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch user session' });
    }
  }
}
