import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { query } from '../config/database.js';
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

    // Audit log account creation
    await AuditRepository.logEvent({
      userId: user.id,
      action: 'USER_REGISTERED',
      details: { username: user.username },
    });

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
      await AuditRepository.logEvent({
        action: 'USER_LOGIN_FAILED',
        details: { attemptedUsername: username },
      });
      throw new Error('Invalid username or password');
    }

    if (user.status !== 'active') {
      await AuditRepository.logEvent({
        userId: user.id,
        action: 'SUSPENDED_USER_LOGIN_ATTEMPT',
        details: { username },
      });
      throw new Error('Account has been suspended');
    }

    const isValid = await argon2.verify(user.password_hash, password);

    if (!isValid) {
      logger.warn(`Failed login attempt for username: ${username}`);
      await AuditRepository.logEvent({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        details: { username },
      });
      throw new Error('Invalid username or password');
    }

    logger.info(`User authenticated: ${user.username} (${user.id})`);

    // Audit log successful authentication
    await AuditRepository.logEvent({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      details: { username },
    });

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
    return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: (ENV.JWT_EXPIRES_IN || '7d') as any });
  }

  /**
   * Securely provision or update the administrator account dynamically from private .env.
   * Completely avoids storing or committing administrator credentials to Git repository.
   */
  static async initAdminFromEnv(): Promise<void> {
    const adminUser = ENV.ADMIN_USERNAME?.trim();
    const adminPass = ENV.ADMIN_PASSWORD?.trim();

    if (!adminUser || !adminPass) {
      return;
    }

    try {
      const existing = await UserRepository.findByUsername(adminUser);
      const passwordHash = await argon2.hash(adminPass, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });

      if (!existing) {
        const id = 'u-admin';
        await query(
          'INSERT INTO users (id, username, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, ?, ?)',
          [id, adminUser, passwordHash, 'System Administrator', 'admin', 'active']
        );
        logger.info(`Administrator account @${adminUser} securely initialized from environment`);
      } else if (existing.role === 'admin') {
        // Synchronize password hash securely from private environment
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, existing.id]);
        logger.info(`Administrator account @${adminUser} credentials synchronized from environment`);
      }
    } catch (err: any) {
      logger.warn(`Failed to provision admin account: ${err.message}`);
    }
  }
}
