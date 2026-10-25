# Security Testing & Verification Specification

## 1. Test Objectives & Scope
Tests verify that SecureChat upholds client-side encryption, resists unauthorized access, avoids API/secret leakage, and enforces internal library execution.

## 2. Test Categories

### 2.1 Authentication & Session Testing
- Argon2id password hash generation and verification.
- Tampered session token rejection.
- Session invalidation upon logout.
- Endpoint rate limiting for brute-force prevention.

### 2.2 Encryption & Integrity Testing
- Verification that network traffic contains only ciphertext envelopes (AES-GCM).
- Verification that database `messages` records contain zero plaintext.
- Bit-flip tamper test: Tampered ciphertext must fail authenticated decryption (`OperationError`).
- Nonce uniqueness test: 96-bit CSPRNG IVs must never repeat.
- Key-change warning test: Contact key rotation must trigger UI security warning.

### 2.3 Access Control & RBAC Testing
- Unauthorized conversation access: Attacker cannot read or send messages to foreign conversation ID.
- Admin privilege escalation: Standard user cannot access `/api/v1/admin/*`.

### 2.4 API Leakage & Dependency Testing
- Build artifact audit: Frontend bundle scan for leaked server secrets or environment variables.
- Server response audit: APIs must not expose stack traces, database credentials, or private keys.
- Internal runtime check: Verification that all core dependencies run self-managed within the local environment without calling external hosted APIs.
