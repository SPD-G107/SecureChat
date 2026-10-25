# SecureChat API Design Specification

## 1. REST API Overview

Base URL: `/api/v1`

All protected endpoints require an `Authorization: Bearer <token>` header or a secure HttpOnly session cookie.

---

## 2. Endpoints

### 2.1 Authentication (`/auth`)

#### `POST /api/v1/auth/register`
- **Description**: Registers a new user account with initial public key.
- **Request Body**:
  ```json
  {
    "username": "alice",
    "password": "StrongPassword123!",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...",
    "keyVersion": 1,
    "fingerprint": "a94a8fe5ccb19ba61c4c0873d391e987982fbbd3"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "user": {
      "id": "c1f7a2d8-4b9e-4e67-891a-7b3c2d1e0f4a",
      "username": "alice",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### `POST /api/v1/auth/login`
- **Description**: Authenticates user credentials verified against stored Argon2id hashes.
- **Request Body**:
  ```json
  {
    "username": "alice",
    "password": "StrongPassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "user": {
      "id": "c1f7a2d8-4b9e-4e67-891a-7b3c2d1e0f4a",
      "username": "alice",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### `POST /api/v1/auth/logout`
- **Description**: Invalidates active session token and clears cookies.
- **Response `200 OK`**:
  ```json
  { "message": "Successfully logged out" }
  ```

---

### 2.2 Contacts & Users (`/users`)

#### `GET /api/v1/users/search?q={query}`
- **Description**: Search for registered users to start private chats. Minimum data exposed.
- **Response `200 OK`**:
  ```json
  {
    "users": [
      {
        "id": "d2f8b3e9-5c0f-5f78-902b-8c4d3e2f1a5b",
        "username": "bob",
        "displayName": "Bob Builder"
      }
    ]
  }
  ```

#### `GET /api/v1/users/:id/public-key`
- **Description**: Retrieves contact's current public key for E2EE session establishment.
- **Response `200 OK`**:
  ```json
  {
    "userId": "d2f8b3e9-5c0f-5f78-902b-8c4d3e2f1a5b",
    "publicKey": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...",
    "version": 1,
    "fingerprint": "b73a2ce4ddc18ba61c4c0873d391e987982faac2"
  }
  ```

---

### 2.3 Conversations & Messages (`/conversations`, `/messages`)

#### `GET /api/v1/conversations`
- **Description**: Lists active 1-on-1 conversations for authenticated user.

#### `POST /api/v1/conversations`
- **Description**: Creates or retrieves a 1-on-1 conversation with a contact.
- **Request Body**: `{ "participantId": "d2f8b3e9-5c0f-5f78-902b-8c4d3e2f1a5b" }`

#### `GET /api/v1/messages/:conversationId`
- **Description**: Retrieves encrypted message envelopes (ciphertext only).

---

### 2.4 Administration (`/admin`)

#### `GET /api/v1/admin/users`
- **Description**: Overview of registered accounts for authorized administrators.

#### `PATCH /api/v1/admin/users/:id/status`
- **Description**: Enable or suspend user account.

#### `GET /api/v1/admin/audit-logs`
- **Description**: Review security and administrative events.

---

## 3. Real-Time WebSocket Protocol (Socket.IO)

### Events:
- `connect`: Authenticated via handshake JWT token.
- `message:send`: `{ conversationId, recipientId, encryptedPayload, iv, macTag }`
- `message:delivered`: Emitted to recipient with encrypted envelope.
- `key:changed`: Notifies active chats when contact updates their public key.
