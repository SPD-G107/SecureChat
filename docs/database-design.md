# Database Design Specification

## 1. Overview
SecureChat uses MySQL (InnoDB) with parameterized queries via `mysql2`. The schema separates account credentials, public keys, conversation links, encrypted messages, and security audit logs.

## 2. Tables & Fields

### 2.1 Users (`users`)
- `id` (VARCHAR(36), PK): UUID.
- `username` (VARCHAR(50), Unique): Handle.
- `password_hash` (VARCHAR(255)): Salted Argon2id hash.
- `display_name` (VARCHAR(100)): Optional user title.
- `role` (ENUM('user', 'admin')): Role-based access control.
- `status` (ENUM('active', 'suspended')): Account status.
- `created_at`, `updated_at`: Timestamps.

### 2.2 PublicKeys (`public_keys`)
- `id` (VARCHAR(36), PK): UUID.
- `user_id` (VARCHAR(36), FK): References `users(id)`.
- `public_key` (TEXT): Base64-encoded ECDH P-256 public key.
- `version` (INT): Incremented on key change.
- `fingerprint` (VARCHAR(128)): SHA-256 fingerprint for verification.
- *Strict Rule: No private keys are ever stored on the server.*

### 2.3 Conversations (`conversations`)
- `id` (VARCHAR(36), PK): UUID.
- `participant1_id`, `participant2_id` (VARCHAR(36), FKs).
- `created_at`, `updated_at`: Timestamps.

### 2.4 Messages (`messages`)
- `id` (VARCHAR(36), PK): UUID.
- `conversation_id`, `sender_id` (FKs).
- `encrypted_payload` (LONGTEXT): AES-256-GCM ciphertext.
- `initialization_vector` (VARCHAR(128)): 96-bit IV.
- `mac_tag` (VARCHAR(128)): 128-bit authentication tag.
- `ephemeral_public_key` (TEXT): Sender's ephemeral ECDH key.
- `delivery_status` (ENUM('sent', 'delivered', 'read')).

### 2.5 AuditLogs (`audit_logs`)
- `id` (VARCHAR(36), PK): UUID.
- `user_id` (VARCHAR(36), FK, Nullable).
- `action` (VARCHAR(100)): Event action identifier.
- `ip_address`, `user_agent`, `details`: Sanitized metadata (zero passwords, keys, or plaintext).
