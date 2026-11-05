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
    ipAddress?: string;
    userAgent?: string;
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
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
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
   * Authenticates user credentials via Argon2id verification with resilient administrator recovery
   */
  static async login(username: string, password: string, ipAddress?: string, userAgent?: string) {
    const cleanUsername = username?.trim() || '';
    let user = await UserRepository.findByUsername(cleanUsername);

    // Resilient Admin Lookup:
    // If user attempts to log in as 'admin', 'adminSecureChat', or configured ENV.ADMIN_USERNAME,
    // match the administrator account by role if not found directly by exact username.
    const isAdminAttempt =
      cleanUsername.toLowerCase() === 'admin' ||
      cleanUsername.toLowerCase() === 'adminsecurechat' ||
      cleanUsername.toLowerCase() === (ENV.ADMIN_USERNAME || 'adminSecureChat').toLowerCase();

    if (!user && isAdminAttempt) {
      const adminRows = (await query('SELECT * FROM users WHERE role = "admin" LIMIT 1')) as any[];
      if (adminRows.length > 0) {
        user = adminRows[0];
      }
    }

    // Auto-provision admin if database has no admin account yet and ENV.ADMIN_PASSWORD is configured
    if (!user && isAdminAttempt && ENV.ADMIN_PASSWORD) {
      const validAdminPass = password === ENV.ADMIN_PASSWORD;

      if (validAdminPass) {
        const passwordHash = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1,
        });
        const id = 'u-admin';
        await query(
          'INSERT INTO users (id, username, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, "admin", "active")',
          [id, cleanUsername, passwordHash, 'System Administrator']
        );
        user = await UserRepository.findByUsername(cleanUsername);
      }
    }

    if (!user) {
      await AuditRepository.logEvent({
        action: 'USER_LOGIN_FAILED',
        ipAddress,
        userAgent,
        details: { attemptedUsername: cleanUsername },
      });
      throw new Error('Invalid username or password');
    }

    if (user.status !== 'active') {
      await AuditRepository.logEvent({
        userId: user.id,
        action: 'SUSPENDED_USER_LOGIN_ATTEMPT',
        ipAddress,
        userAgent,
        details: { username: user.username },
      });
      throw new Error('Account has been suspended');
    }

    let isValid = false;
    try {
      isValid = await argon2.verify(user.password_hash, password);
    } catch {
      isValid = false;
    }

    // Self-healing password sync for administrator only if ENV.ADMIN_PASSWORD is explicitly configured in private .env
    if (!isValid && user.role === 'admin' && ENV.ADMIN_PASSWORD) {
      const matchesConfigured = password === ENV.ADMIN_PASSWORD;

      if (matchesConfigured) {
        isValid = true;
        const newHash = await argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 3,
          parallelism: 1,
        });
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);
        logger.info(`Administrator credentials self-healed and synchronized for @${user.username}`);
      }
    }

    if (!isValid) {
      logger.warn(`Failed login attempt for username: ${cleanUsername}`);
      await AuditRepository.logEvent({
        userId: user.id,
        action: 'USER_LOGIN_FAILED',
        ipAddress,
        userAgent,
        details: { username: user.username },
      });
      throw new Error('Invalid username or password');
    }

    logger.info(`User authenticated: ${user.username} (${user.id})`);

    // Audit log successful authentication
    await AuditRepository.logEvent({
      userId: user.id,
      action: 'USER_LOGIN_SUCCESS',
      ipAddress,
      userAgent,
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
      const passwordHash = await argon2.hash(adminPass, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1,
      });

      // 1. Check if the exact admin username already exists
      const existingUser = await UserRepository.findByUsername(adminUser);
      if (existingUser) {
        await query(
          'UPDATE users SET password_hash = ?, role = "admin", status = "active" WHERE id = ?',
          [passwordHash, existingUser.id]
        );
        logger.info(`Administrator account @${adminUser} synchronized from environment`);
        return;
      }

      // 2. If username changed, check if an existing admin record (by role or id 'u-admin') exists to update in-place
      const adminRows = (await query(
        'SELECT id, username FROM users WHERE role = "admin" OR id = "u-admin" LIMIT 1'
      )) as any[];

      if (adminRows.length > 0) {
        const adminRecord = adminRows[0];
        await query(
          'UPDATE users SET username = ?, password_hash = ?, role = "admin", status = "active" WHERE id = ?',
          [adminUser, passwordHash, adminRecord.id]
        );
        logger.info(
          `Administrator account renamed from @${adminRecord.username} to @${adminUser} and credentials synchronized from environment`
        );
        return;
      }

      // 3. Otherwise create fresh admin user
      const id = 'u-admin';
      await query(
        'INSERT INTO users (id, username, password_hash, display_name, role, status) VALUES (?, ?, ?, ?, "admin", "active")',
        [id, adminUser, passwordHash, 'System Administrator']
      );
      logger.info(`Administrator account @${adminUser} securely initialized from environment`);
    } catch (err: any) {
      logger.warn(`Failed to provision admin account: ${err.message}`);
    }
  }
}
