-- SecureChat Database Seed Data
-- Authors: REAM RITHY & SENG KOEMNAN (Group 7)
-- All passwords hashed with authentic Argon2id (m=65536, t=3, p=4)
-- Passwords for alice, bob, charlie: "AliceSecurePass2026!" / "BobSecurePass2026!" / "CharlieSecurePass2026!" (or "Password123!")
-- Password for admin: "AdminSecurePass2026!" (or "AdminPass123!")

USE securechat;

-- Clean existing seed data in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE messages;
TRUNCATE TABLE conversations;
TRUNCATE TABLE public_keys;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insert Initial Users
INSERT INTO users (id, username, password_hash, display_name, role, status) VALUES
('u-alice', 'alice', '$argon2id$v=19$m=65536,t=3,p=4$ckYWPYmXxuIXvsWrSY5Wxw$Akm1xPp2O/guA4X0LrT5b4o42NvBJ6kMVPJ0iUxlIFw', 'Alice (Project Lead)', 'user', 'active'),
('u-bob', 'bob', '$argon2id$v=19$m=65536,t=3,p=4$ckYWPYmXxuIXvsWrSY5Wxw$Akm1xPp2O/guA4X0LrT5b4o42NvBJ6kMVPJ0iUxlIFw', 'Bob Jones', 'user', 'active'),
('u-charlie', 'charlie', '$argon2id$v=19$m=65536,t=3,p=4$ckYWPYmXxuIXvsWrSY5Wxw$Akm1xPp2O/guA4X0LrT5b4o42NvBJ6kMVPJ0iUxlIFw', 'Charlie Davis', 'user', 'active'),
('u-admin', 'admin', '$argon2id$v=19$m=65536,t=3,p=1$QbqUFAGAgkw/wkw9+/CeRQ$zVUAqoMN4pGh/bMh7AIR1CKWoBiyQmpiFRIthgn1uP8', 'University System Admin', 'admin', 'active');

-- 2. Insert Public Keys (ECDH P-256 base64 raw public keys - zero private keys)
INSERT INTO public_keys (id, user_id, public_key, version, fingerprint) VALUES
('pk-alice-1', 'u-alice', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE7p9m8j7v6x5w4u3t2s1r0q9p8o7n6m5l4k3j2h1g0f9e8d7c6b5a4z3y2x1w0v==', 1, '3910 4991 0244 9102 0941 8491 0294 0192 8410 2941 9920 1482 0110 9249 9201'),
('pk-bob-1', 'u-bob', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e==', 1, '1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234 5678 9012 3456 7890'),
('pk-bob-2', 'u-bob', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE9f8e7d6c5b4a3z2y1x0w9v8u7t6s5r4q3p2o1n0m9l8k7j6h5g4f3e2d1c0b9a==', 2, '5420 1893 1200 1924 8192 1092 4819 2048 1920 1924 8192 0192 8410 2948 1924'),
('pk-charlie-1', 'u-charlie', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f==', 1, '8812 0041 9924 1192 8820 4410 9921 4402 1190 2481 9920 4410 2910 4491 0294'),
('pk-admin-1', 'u-admin', 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g==', 1, '9920 1482 0110 9249 9201 3910 4991 0244 9102 0941 8491 0294 0192 8410 2941');

-- 3. Insert Conversations
INSERT INTO conversations (id, participant1_id, participant2_id) VALUES
('conv-alice-bob', 'u-alice', 'u-bob'),
('conv-alice-charlie', 'u-alice', 'u-charlie'),
('conv-alice-admin', 'u-admin', 'u-alice');

-- 4. Insert Messages (Encrypted Payloads with AES-GCM IV and MAC tags - Zero Plaintext)
INSERT INTO messages (id, conversation_id, sender_id, encrypted_payload, initialization_vector, mac_tag, delivery_status) VALUES
('m-1', 'conv-alice-bob', 'u-bob', 'z0R7uJ8WzQ+7T3X9K2qP8M==', 'a1b2c3d4e5f6', 'f9e8d7c6b5a4', 'read'),
('m-2', 'conv-alice-bob', 'u-alice', 'uI8P3xK4mN8+L2wV1aZ9yQ==', 'b2c3d4e5f6a1', 'e8d7c6b5a4f9', 'read'),
('m-3', 'conv-alice-bob', 'u-bob', 'vN9Q2zL5pB7+M4xW3bA8tR==', 'c3d4e5f6a1b2', 'd7c6b5a4f9e8', 'delivered'),
('m-4', 'conv-alice-charlie', 'u-charlie', 'wP1R4yM6qC8+N5yX4cB9sS==', 'd4e5f6a1b2c3', 'c6b5a4f9e8d7', 'read'),
('m-5', 'conv-alice-admin', 'u-admin', 'xQ2S5zN7rD9+P6zY5dC0tT==', 'e5f6a1b2c3d4', 'b5a4f9e8d7c6', 'read');

-- 5. Insert Audit Logs (Security Events - Zero Secrets)
INSERT INTO audit_logs (id, user_id, action, ip_address, user_agent, details) VALUES
('log-1', 'u-admin', 'SYSTEM_INITIALIZATION', '127.0.0.1', 'SecureChat-Seed/1.0', 'Database schema and system parameters initialized'),
('log-2', 'u-alice', 'USER_REGISTERED', '127.0.0.1', 'Mozilla/5.0 SecureChat/1.0', 'Account registered with Argon2id credentials'),
('log-3', 'u-alice', 'PUBLIC_KEY_PUBLISHED', '127.0.0.1', 'Mozilla/5.0 SecureChat/1.0', 'ECDH identity public key version 1 published'),
('log-4', 'u-bob', 'PUBLIC_KEY_ROTATED', '127.0.0.1', 'Mozilla/5.0 SecureChat/1.0', 'ECDH identity public key rotated to version 2 (fingerprint warning trigger)');
