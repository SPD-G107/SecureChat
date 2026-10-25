import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { ENV } from '../config/env.js';
import { AuthTokenPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AuthService {
  /**
   * Registers a new user with Argon2id password hashing and stores their initial public key
   */
  static async register(data: {
    username: string;
    password: string;
    publicKey: string;
    fingerprint: string;
    displayName?: string;
  }) {
    const existing = await UserRepository.findByUsername(data.username);
    if (existing) {
      throw new Error('Username is already taken');
    }

    // Argon2id hashing with memory & time cost parameters
    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
      parallelism: 1,
    });

    const user = await UserRepository.createUser({
      username: data.username,
      passwordHash,
      displayName: data.displayName,
    });

    // Store public identity key (NO private keys)
    await UserRepository.savePublicKey(user.id, data.publicKey, data.fingerprint);

    logger.info(`User registered successfully: ${user.username} (${user.id})`);

    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Authenticates user credentials via Argon2id verification
   */
  static async login(username: string, password: string) {
    const user = await UserRepository.findByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    if (user.status !== 'active') {
      throw new Error('Account has been suspended');
    }

    const isValid = await argon2.verify(user.password_hash, password);
    if (!isValid) {
      logger.warn(`Failed login attempt for username: ${username}`);
      throw new Error('Invalid username or password');
    }

    logger.info(`User authenticated: ${user.username} (${user.id})`);

    const token = this.generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      },
      token,
    };
  }

  static generateToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: (ENV.JWT_EXPIRES_IN || '24h') as any });
  }
}
