# Security Testing & Verification Specification

> **Group 7 QA & DevOps Lead:** HENG MINOU (`hengminou12345-del`)  
> **Project:** SecureChat University Capstone

## 1. Test Objectives & Scope
Tests verify that SecureChat upholds client-side encryption, resists unauthorized access, avoids API/secret leakage, and enforces internal library execution.

## 2. Test Categories & Verification Matrix

### 2.1 Authentication & Session Testing
- **Argon2id password hashing**: Passwords hashed with $m=65536, t=3, p=4$. Plaintext is never stored.
- **Session Token Integrity**: Tampered JWT signatures are rejected with HTTP 401 Unauthorized.
- **Session Invalidation**: Calling `/api/v1/auth/logout` invalidates local session and logs audit event.
- **Brute-Force Rate Limiting**: Consecutive failed login attempts trigger HTTP 429 Too Many Requests.

### 2.2 Encryption & Integrity Testing (QA Automated)
- **Zero Server-Side Plaintext**: Network packet inspection verifies that all message bodies are base64 AES-256-GCM ciphertexts.
- **Database Sanitization Audit**: SQL query on `messages` verifies `encrypted_payload`, `initialization_vector`, and `mac_tag` are populated while plaintext is null/absent.
- **Ciphertext Tamper Detection (Bit-flip Test)**: Modifying a single bit of ciphertext triggers Web Crypto `OperationError` during authentication tag validation.
- **CSPRNG Nonce Uniqueness**: 96-bit initialization vectors are generated with `crypto.getRandomValues()` and never repeated across messages.
- **Key-Change Proactive Warning**: When Bob rotates from Key v1 to Key v2, Alice's UI flags an alert preventing silent Man-in-the-Middle (MITM) attacks.

### 2.3 Access Control & RBAC Testing
- **Cross-Conversation Isolation**: User A cannot read or post messages into Conversation B without membership.
- **Admin Privilege Restriction**: Non-admin users requesting `/api/v1/admin/*` receive HTTP 403 Forbidden.

### 2.4 API Leakage & Dependency Isolation
- **Build Artifact Scan**: Production JavaScript bundles are audited for leaked private keys, API secrets, or `.env` parameters.
- **Internal Execution Verification**: No external cloud APIs (e.g. Firebase, Pusher, Twilio, hosted auth) are utilized. Socket.IO and Web Crypto execute self-managed within the local environment.

## 3. Automated Test Execution Commands
```bash
# Run security tamper and authenticated decryption suite
npm run test:security

# Run Docker container health check and isolation audit
docker-compose ps
docker-compose exec mysql mysqladmin ping -h localhost
```

