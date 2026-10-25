# SecureChat System Architecture

## 1. System Overview

SecureChat is a full-stack, end-to-end encrypted (E2EE) private messaging web application. It is designed to satisfy the core requirement:

> **"Prevent API leakage from server. A server must run every library internally."**

The system does not depend on external third-party hosted APIs (such as Firebase, Auth0, or cloud-managed messaging platforms). All server-side components run self-managed within the application environment using locally installed libraries.

```
+-----------------------------------------------------------------------------------------------+
|                                        Client Tier                                            |
|                                                                                               |
|   User A (Browser / Next.js)                          User B (Browser / Next.js)              |
|   +-------------------------------------+             +-------------------------------------+ |
|   | - Web Crypto API (Client-side E2EE) |             | - Web Crypto API (Client-side E2EE) | |
|   | - Session & Key Management          |             | - Session & Key Management          | |
|   | - Socket.IO Client (WSS)            |             | - Socket.IO Client (WSS)            | |
|   +------------------+------------------+             +------------------+------------------+ |
+----------------------|---------------------------------------------------|--------------------+
                       |                                                   |
                       | HTTPS / WSS (TLS 1.3)                             | HTTPS / WSS (TLS 1.3)
                       v                                                   v
+-----------------------------------------------------------------------------------------------+
|                                        Server Tier                                            |
|                                                                                               |
|   SecureChat Node.js + Express + Socket.IO Application Server                                 |
|   +-----------------------------------------------------------------------------------------+ |
|   | - Authentication & Session Service (Argon2id password hashing, JWT / HttpOnly cookies)  | |
|   | - Access Control & Authorization Middleware (RBAC for Users & Administrators)          | |
|   | - Blind Message Relay (Routes encrypted payloads without server-side decryption)        | |
|   | - Public Key Directory Service (Stores and serves public keys & safety fingerprints)    | |
|   | - Audit Logger (Records security events without sensitive data)                         | |
|   +-----------------------------------------------------------------------------------------+ |
+----------------------------------------------+------------------------------------------------+
                                               |
                                               | MySQL Connection Pool (mysql2)
                                               v
+-----------------------------------------------------------------------------------------------+
|                                       Database Tier                                           |
|                                                                                               |
|   MySQL Relational Database Server                                                            |
|   +-----------------------------------------------------------------------------------------+ |
|   | - Users (Usernames, Argon2id password hashes, roles, status)                            | |
|   | - PublicKeys (User public identity keys, versions, fingerprints - NO private keys)      | |
|   | - Conversations (One-to-one participant relations)                                      | |
|   | - Messages (Encrypted payloads, nonces/IVs, MAC tags, delivery timestamps)              | |
|   | - AuditLogs (Administrative events, login attempts - zero plaintext/secrets)            | |
|   +-----------------------------------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------------+
```

---

## 2. Component Architecture

### 2.1 Frontend Tier (Next.js & Web Crypto)
- **Framework**: Next.js App Router with TypeScript and Tailwind CSS.
- **Client-Side Cryptography**: Uses the W3C Web Crypto API directly within the browser runtime. Plaintext messages are encrypted before transmission and decrypted only on the recipient's device.
- **Zero-Secret Bundling**: The frontend contains no API keys, database credentials, or server-side secrets.

### 2.2 Backend Tier (Node.js & Express & Socket.IO)
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js for REST API endpoints and Socket.IO for duplex real-time messaging.
- **Password Security**: Argon2id password hashing via the locally installed `argon2` native library.
- **Blind Message Routing**: The server functions as an envelope router. It validates permissions and relays ciphertexts, nonces, and authentication tags without possessing the private keys necessary for decryption.
- **Secret Protection**: All server credentials and database connection details reside strictly in environment variables on the host system.

### 2.3 Database Tier (MySQL 8.0)
- **Engine**: MySQL with InnoDB transactional engine.
- **Driver**: `mysql2/promise` with parameterized queries to prevent SQL injection.
- **Data Confidentiality**: Only ciphertext, initialization vectors, and authentication tags are stored in the `Messages` table. Private keys are never transmitted to or stored in the database.
