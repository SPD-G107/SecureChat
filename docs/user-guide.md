# SecureChat User Guide & Demonstration Manual

## 1. Introduction
SecureChat provides private, authenticated text communication between users. This guide explains how to operate the application, establish encrypted sessions, and verify contact identities.

---

## 2. Walkthrough & Demonstration

### 2.1 User Registration & Login (Phase 2)
1. Open the application at `http://localhost:3000`.
2. Click **Create Secure Account**.
3. Choose a unique username and enter a strong passphrase.
4. The client browser generates an **ECDH P-256 identity keypair** on your device. The private key never leaves your browser storage.
5. The backend verifies credentials using **Argon2id password hashing** and issues a secure session token.

### 2.2 Finding Contacts & Starting a Chat (Phase 3)
1. In the chat sidebar (`/chat`), enter a contact's username in the search bar.
2. Click the `+` icon to initiate a direct one-to-one conversation.
3. The server sets up the conversation relation without reading or tampering with contents.

### 2.3 Sending End-to-End Encrypted Messages (Phase 4)
1. Type a message in the input field and press send.
2. The browser automatically derives a shared secret with the recipient's public key using **ECDH + HKDF-SHA256**.
3. The message is encrypted using **AES-256-GCM** with a unique 96-bit initialization vector.
4. The backend blindly routes the ciphertext envelope to the recipient's active socket room.
5. The recipient's browser decrypts the payload in real time.

### 2.4 Verifying Public Keys & Safety Numbers (Phase 4 / 5)
1. Navigate to **Verify Keys** (`/verify-key`).
2. Search for your contact's username.
3. Compare the 64-character SHA-256 fingerprint displayed on screen with your contact through an out-of-band channel (e.g., in person or phone call).
4. If a contact ever changes their device or regenerates their keys, an automated **Key-Change Warning** is displayed in the chat header to alert you of potential interception risks.

### 2.5 Administrator Dashboard (Phase 5)
1. Sign in with an account having the `admin` role.
2. Click the **Admin** link in the navigation bar (`/admin`).
3. View registered accounts, monitor message confidentiality stats, and activate or suspend users as needed.
