# SecureChat: Secure and End-to-End Encrypted Private Messaging Web Application

## Group 7 — Project Team & Roles

| No. | Member Name | Role | Assigned Responsibilities |
| :---: | :--- | :--- | :--- |
| 1 | **SENG KOEMNAN** | **Project Manager** | Project Coordination, Architecture, Documentation & Integration |
| 2 | **SOK SOVANRITH**<br>**SENG KOEMNAN** | **Frontend Developers** | Next.js, TypeScript, Tailwind CSS, Responsive UI & Web Crypto E2EE |
| 3 | **REAM RITHY**<br>**SENG KOEMNAN** | **Backend & AI Engineers** | Node.js, Express, Socket.IO Real-time Messaging, MySQL & Argon2id |
| 4 | **HENG MINOU** | **QA & DevOps Specialist** | Docker, Docker Compose, Security & Tamper Testing, Quality Assurance |


## 1. Project Introduction

SecureChat is a web-based private messaging application designed to provide secure, real-time, one-to-one text communication between users. The project focuses on protecting message confidentiality, securing user accounts, preventing unauthorized access, and reducing the risk of sensitive information leakage.

The application will allow users to register accounts, log in securely, search for other registered users, exchange real-time messages, manage basic profile information, and verify the cryptographic identities of their contacts. Messages will be encrypted on the sender's device and decrypted on the intended recipient's device using an end-to-end encryption (E2EE) design.

The backend will manage authentication, authorization, session management, real-time message delivery, and encrypted message storage. Under the intended E2EE design, the server will not need access to the plaintext content of messages or users' private encryption keys.

SecureChat will be developed as a university project to demonstrate full-stack web development, real-time communication, applied cryptography, and practical web application security. The project will prioritize a manageable set of core features, clear system architecture, and documented security testing.

An important project requirement is to prevent API leakage and avoid unnecessary dependence on external API services. SecureChat will use locally installed libraries and self-managed backend services for its core functionality. Sensitive server-side configuration and credentials will remain on the backend, while client-side cryptographic operations will be performed in the user's browser.

## 2. Problem Statement

Private messaging applications transmit sensitive information, including personal conversations and potentially confidential data. If an application does not implement appropriate security controls, messages and account information may be exposed through network interception, unauthorized database access, account compromise, insecure session handling, or application vulnerabilities.

Applications that store readable messages on their servers may also expose conversation contents to individuals who gain unauthorized access to the backend or database.

Another important risk is the leakage of API credentials, database passwords, session secrets, and other sensitive configuration. If such information is included in frontend code, browser bundles, API responses, or application logs, attackers may use it to gain unauthorized access to internal services.

SecureChat aims to address these risks through end-to-end encrypted messaging, secure authentication, public-key verification, session protection, access control, server-side secret management, and structured security testing.

The project will also investigate whether its core functionality can operate without relying on third-party hosted API services at runtime. It will document the protections implemented, their test results, and the limitations that remain.

## 3. Project Objectives

The main objectives of SecureChat are:

1. To develop a responsive and user-friendly private messaging web application.
2. To implement secure user registration and login with Argon2id password hashing.
3. To provide contact search and one-to-one real-time text messaging.
4. To implement end-to-end encryption so that message plaintext is handled on the intended client devices.
5. To provide public-key verification and warnings when a contact's cryptographic identity key changes unexpectedly.
6. To implement secure session management and prevent unauthorized access to private conversations.
7. To provide basic profile management and secure logout.
8. To develop a basic administrator dashboard with role-based access control.
9. To prevent the leakage of server-side secrets and sensitive information through frontend code, API responses, and application logs.
10. To use locally installed dependencies and self-managed services for core application functionality instead of relying on third-party hosted APIs.
11. To conduct functional and security testing and prepare a report documenting the results and limitations.

## 4. Important Teacher Requirement

### Prevent API Leakage from the Server and Run Required Libraries Internally

The project must address the following requirement provided by the supervisor:

"Prevent API leakage from server. A server must run every library internally."

For this project, the requirement will be implemented as follows, subject to confirmation from the supervisor regarding the exact meaning of "run every library internally."

### 4.1 Locally Installed Libraries

SecureChat will use locally installed dependencies managed within the project environment. The backend will use Node.js and Express.js for server-side functionality, Socket.IO for real-time messaging, MySQL for persistent data storage, and Argon2id for password hashing.

These libraries will execute within the appropriate application environment rather than requiring a separate third-party hosted API for each operation.

### 4.2 No External Hosted APIs for Core Features

Core functionality will be implemented using the project's own backend and database. The application will not depend on third-party hosted APIs for user authentication, message delivery, database operations, or password hashing.

External package registries may be used during development to install dependencies. Once installed, those dependencies can be executed locally or on the project's server without calling the package registry during normal application runtime.

### 4.3 Server-Side Secret Protection

Database credentials, session secrets, and other server-side configuration will be stored in environment variables or an appropriate secrets-management system.

The application will follow these rules:

- Do not hardcode real secrets in frontend code.
- Do not expose server credentials in browser bundles.
- Do not return database credentials or private configuration in API responses.
- Do not include passwords, private encryption keys, or plaintext messages in application logs.
- Validate API inputs and return safe error messages.
- Apply authentication, authorization, and rate limiting to sensitive endpoints.
- Keep production secrets out of version control.

### 4.4 Correct Separation Between Client and Server

Not every library should run on the server. SecureChat must keep client-side encryption and decryption on the user's device to support the intended end-to-end encryption design.

The Web Crypto API will be used in the browser for cryptographic operations. The backend will receive, store, and forward encrypted message payloads without requiring access to their plaintext contents.

The backend will continue to enforce user authentication, conversation permissions, and message-delivery authorization.

### 4.5 Dependency Management and Verification

Project dependencies will be documented and managed through package manifests and lockfiles. Dependencies will be reviewed and updated when necessary.

Security testing will check that core features do not require third-party hosted API services at runtime and that sensitive server-side information is not unintentionally exposed through the application.

If the supervisor specifically requires copying library source code into the repository instead of installing packages, this requirement must be confirmed before implementation because it is different from ordinary dependency management.

## 5. Project Scope: Nine Core Features

### Feature 1: User Registration and Login

This feature allows new users to create accounts and existing users to authenticate securely.

Main functions:

- Register an account using the required information.
- Validate registration and login inputs.
- Hash passwords using Argon2id.
- Verify passwords during login without storing plaintext passwords.
- Prevent unauthorized access to protected pages and endpoints.
- Apply appropriate protections against repeated login attempts.
- Display appropriate success and error messages.

Passwords will never be stored as plaintext. Authentication will be handled by the project's own backend rather than depending on an external hosted authentication API.

### Feature 2: Contact Search

This feature allows users to find registered users and start private conversations.

Main functions:

- Search for users by username or another approved identifier.
- Display relevant search results.
- Allow a user to select a contact and open a conversation.
- Restrict displayed user information to the minimum necessary.
- Validate and authorize requests through the backend.

The search feature will use the project's own database and backend services.

### Feature 3: One-to-One Real-Time Chat

This feature provides the main interface for private communication between two users.

Main functions:

- Display the conversation interface.
- Allow users to compose and send text messages.
- Deliver messages in real time using Socket.IO.
- Display incoming messages without requiring a page refresh.
- Store encrypted message payloads in the database.
- Retrieve and display messages belonging to the authorized conversation.
- Enforce conversation membership and access-control rules.

The initial version will support one-to-one text messaging only. Group chat, file sharing, voice calls, and video calls are excluded.

### Feature 4: End-to-End Encrypted Text Messages

This is the core security feature of SecureChat.

Main functions:

- Encrypt outgoing messages on the sender's device.
- Transmit encrypted message payloads to the backend over HTTPS/WSS.
- Store and forward encrypted messages without requiring the server to read their plaintext contents.
- Decrypt received messages on the intended recipient's device.
- Detect unauthorized ciphertext modification through authenticated encryption.
- Keep private encryption keys under client-side control according to the chosen key-management design.

The technical design may use AES-GCM for authenticated encryption and ECDH with HKDF for key establishment and derivation, where appropriate.

The implementation must define secure key generation, peer authentication, nonce handling, key lifecycle management, authenticated decryption, and error handling. These cryptographic components must be integrated according to a documented design rather than treated as a complete secure messaging protocol by themselves.

### Feature 5: Public-Key Verification and Key-Change Warning

This feature helps users verify the cryptographic identities of their contacts and reduces the risk of man-in-the-middle attacks.

Main functions:

- Generate or establish cryptographic key pairs.
- Make required public-key information available to contacts.
- Keep private encryption keys inaccessible to the server under the intended design.
- Display a cryptographic fingerprint or safety number.
- Provide a method to verify a contact's public key through a trusted verification process.
- Warn users when a contact's public key changes unexpectedly.
- Avoid silently accepting unexpected key changes without appropriate warning or verification.

This feature is important because encryption alone does not guarantee that the intended recipient's public key has not been replaced by an attacker's key.

### Feature 6: Secure Sessions and Access Control

This feature protects authenticated sessions and restricts access to authorized resources.

Main functions:

- Maintain authenticated sessions securely.
- Configure session cookies with appropriate HttpOnly, Secure, and SameSite attributes.
- Support logout and session invalidation.
- Implement session expiration and appropriate renewal behavior.
- Verify user permissions before allowing access to conversations.
- Prevent users from accessing other users' private messages without authorization.
- Apply input validation and relevant CSRF protections.
- Restrict administrative functions to authorized administrators through role-based access control.

Authorization checks must be enforced by the backend and must not rely only on frontend navigation restrictions.

### Feature 7: Basic Profile and Logout

This feature allows users to manage essential account information and end their sessions securely.

Main functions:

- Display basic profile information.
- Allow updates to permitted fields, such as the display name.
- Display the user's username or account identifier.
- Provide a logout function.
- Invalidate the active session after logout.
- Redirect the user to the login page or another appropriate public page.

Profile operations will use the project's own backend endpoints and database.

### Feature 8: Basic Administrator Dashboard

This feature provides authorized administrators with basic account-management and security-event review capabilities.

Main functions:

- Display an overview of registered users.
- View and manage user account status.
- Apply role-based access control to administrative functions.
- Review relevant security and administrative audit events.
- Record important administrative actions.
- Prevent ordinary users from accessing administrator pages and endpoints.

Audit logs must not contain passwords, private encryption keys, or plaintext message contents. The administrator dashboard will not provide a feature for reading users' E2EE-protected messages.

### Feature 9: Security Testing and Report

This feature evaluates the application's security controls and documents the results.

Testing will include:

**Authentication and session testing**

- Registration and login validation.
- Password-hashing verification.
- Logout and session expiration.
- Unauthorized access prevention.
- Rate-limiting checks.

**Encryption testing**

- Inspect network payloads and database records to verify that stored and transmitted message bodies are ciphertext.
- Verify that authorized recipients can decrypt messages.
- Verify that modified ciphertext fails authenticated decryption.
- Test nonce management and key handling.
- Test public-key verification and key-change warnings.

**Access-control testing**

- Attempt to access another user's conversation.
- Attempt to access protected endpoints without authentication.
- Attempt to use administrator endpoints as an ordinary user.

**API leakage and dependency testing**

- Inspect frontend build artifacts for server-side secrets.
- Inspect API responses and application logs for sensitive information.
- Verify that core application functionality does not require third-party hosted API services at runtime.
- Review installed dependencies and document their versions.

**Web security testing**

- Test for SQL injection and cross-site scripting.
- Review CSRF protections and input validation.
- Check error handling and logging practices.

The final security report will document test objectives, procedures, expected results, actual results, evidence, identified vulnerabilities, corrective actions, and remaining limitations.

## 6. System Architecture

SecureChat will use a client-server architecture with three primary components.

### A. Frontend

The frontend will be built using Next.js, TypeScript, and Tailwind CSS.

Responsibilities:

- Display login and registration pages.
- Display contact search and conversation interfaces.
- Provide profile and administrator interfaces.
- Communicate with the backend through HTTPS and WSS.
- Perform client-side message encryption and decryption.
- Manage client-side cryptographic operations and public-key verification interfaces.
- Display security warnings and relevant authentication errors.

The frontend must not contain server-side secrets or direct database credentials.

### B. Backend

The backend will be built using Node.js, Express.js, and Socket.IO.

Responsibilities:

- Handle registration and login.
- Verify passwords using Argon2id.
- Manage authenticated sessions.
- Validate requests and enforce access control.
- Search for contacts and manage conversations.
- Receive, store, and forward encrypted message payloads.
- Manage public-key records and relevant key-change metadata.
- Provide administrator endpoints.
- Record appropriate security and administrative events.
- Protect sensitive configuration and avoid exposing internal implementation details.

The backend will use locally installed dependencies and self-managed services for its core operations.

### C. Database

MySQL will store the application's persistent data.

The database will contain account information, password hashes, public-key records, conversation metadata, encrypted message payloads, and security audit events.

The database will not store plaintext passwords or plaintext message contents. Private encryption keys will not be stored on the backend as part of the intended E2EE design.

### Message Flow

1. User A writes a message in the browser.
2. The browser encrypts the message using the established encryption design.
3. The encrypted payload is transmitted to the SecureChat backend.
4. The backend authenticates the sender, verifies conversation permissions, and routes the encrypted payload.
5. The payload may be stored in the database in encrypted form.
6. User B receives the encrypted payload.
7. User B's browser verifies and decrypts the message using the appropriate key material.

This design aims to protect message contents from network attackers and server/database readers, subject to correct implementation, key verification, endpoint security, and the limitations of the browser-based application model.

## 7. Technology Stack

| Component                | Technology                           | Purpose                                                  |
| ------------------------ | ------------------------------------ | -------------------------------------------------------- |
| Frontend framework       | Next.js                              | Build the user interface                                 |
| Programming language     | TypeScript                           | Improve code reliability                                 |
| UI styling               | Tailwind CSS                         | Create responsive layouts                                |
| Backend runtime          | Node.js                              | Run backend services                                     |
| Backend framework        | Express.js                           | Implement backend endpoints                              |
| Real-time communication  | Socket.IO                            | Deliver messages in real time                            |
| Database                 | MySQL                                | Store application data                                   |
| MySQL driver             | mysql2                               | Connect the backend to MySQL                             |
| Client-side cryptography | Web Crypto API                       | Perform browser-side cryptographic operations            |
| Password hashing         | Argon2id                             | Protect stored password verifiers                        |
| Configuration            | Environment variables                | Keep server-side configuration separate from source code |
| Transport security       | HTTPS/TLS                            | Protect data in transit                                  |
| Testing                  | Automated and security testing tools | Evaluate functionality and security                      |

The application will use installed dependencies rather than calling external hosted APIs for core backend operations. The Web Crypto API will run in the browser because client-side cryptographic operations are required for the intended E2EE design.

## 8. Project Folder Structure

The project will use a monorepo-style structure that separates frontend, backend, database, documentation, and tests.

securechat/

- frontend/
  - src/app/
    - (auth)/login/
    - (auth)/register/
    - chat/
    - profile/
    - verify-key/
    - admin/
  - src/components/
    - layout/
    - chat/
    - contacts/
    - security/
  - src/lib/
    - api-client.ts
    - socket-client.ts
    - crypto/
  - src/hooks/
  - src/types/
  - public/
  - package.json
- backend/
  - src/
    - app.ts
    - server.ts
    - config/
    - routes/
    - controllers/
    - services/
    - repositories/
    - middleware/
    - sockets/
    - validators/
    - utils/
    - types/
  - tests/
  - package.json
- database/
  - migrations/
  - seeds/
  - schema.sql
- docs/
  - architecture.md
  - api-design.md
  - encryption-design.md
  - security-testing.md
- tests/
  - integration/
  - security/
- .gitignore
- package.json (optional root workspace)
- README.md

Real server configuration will be stored outside source control. Example configuration files may be included, but they must not contain actual secrets.

## 9. Database Design

The initial database design will include the following tables.

### Users

Stores user account identifiers, usernames, password hashes, account status, roles where appropriate, and timestamps.

### PublicKeys

Stores public-key records, key versions, fingerprints or verification-related metadata, and relevant timestamps. It must not store users' private encryption keys.

### Conversations

Stores conversation identifiers, participant relationships, and required conversation metadata.

### Messages

Stores message identifiers, conversation identifiers, sender identifiers, encrypted message payloads, timestamps, and necessary delivery or status metadata.

The message schema must support the selected encryption format and must not require the backend to access plaintext message content.

### AuditLogs

Stores relevant security events and administrative actions without recording passwords, private keys, or plaintext message contents.

Database access will use parameterized queries and appropriate authorization checks.

## 10. Security Requirements

SecureChat will implement the following security requirements:

1. Password hashing using Argon2id.
2. Secure authentication and session management.
3. HTTPS/TLS for client-server communication.
4. Secure WebSocket communication through WSS in deployment.
5. Client-side encryption and authenticated decryption.
6. Secure cryptographic key generation and management.
7. Public-key verification and key-change warnings.
8. Correct nonce handling and cryptographic error handling.
9. Input validation, output encoding, and authorization checks.
10. Protection against SQL injection, XSS, CSRF where applicable, and unauthorized access.
11. Rate limiting for sensitive endpoints.
12. Secure handling of environment variables and server-side secrets.
13. Avoidance of sensitive data in API responses, frontend bundles, and server logs.
14. Dependency documentation and security updates.
15. Least-privilege database and administrative access.
16. Security testing with documented results and evidence.

These controls reduce identified risks but do not guarantee complete protection against every possible attack.

## 11. User Interface Design

The application will use a modern, responsive messaging interface with dark teal navigation, green accent colors, and clean white or light-gray content panels.

The planned screens are:

1. Login Page
2. Registration Page
3. Main Chat Page with Contact Search
4. One-to-One Conversation Page
5. Public-Key Verification Interface
6. Key-Change Warning Interface
7. Basic Profile and Settings Page
8. Administrator Dashboard
9. User Management Page
10. Responsive Mobile Chat Layout

The interface will communicate important security states clearly, including authentication errors, key-change warnings, and message delivery status. It will not claim that a conversation is verified or secure unless the corresponding verification and security conditions have been satisfied.

## 12. Development Methodology and Timeline

The project will be developed in phases to make implementation and testing manageable.

### Phase 1: Planning, Architecture, and Environment Setup — Weeks 1–2

- Confirm the project scope and teacher's requirement.
- Design the frontend and backend architecture.
- Create the project folder structure.
- Install and configure dependencies.
- Prepare the database schema.
- Document the API design and encryption requirements.

### Phase 2: Authentication and Session Management — Weeks 3–4

- Implement registration and login.
- Integrate Argon2id password hashing.
- Configure secure sessions and logout.
- Implement initial access-control middleware.
- Test authentication and secret handling.

### Phase 3: Contact Search and Real-Time Messaging — Weeks 5–6

- Implement contact search.
- Create one-to-one conversation management.
- Integrate Socket.IO.
- Implement authorization for message delivery.
- Prepare encrypted-message storage and transport structures.

### Phase 4: End-to-End Encryption — Weeks 7–9

- Document the key-establishment and identity-verification design.
- Implement client-side cryptographic operations.
- Implement encrypted message transport and storage.
- Add public-key fingerprints and key-change warnings.
- Test encryption, decryption, and tamper detection.

### Phase 5: Profile and Administrator Dashboard — Weeks 10–11

- Implement profile management.
- Complete logout behavior.
- Implement administrator user management.
- Apply role-based access control.
- Add security-event logging.

### Phase 6: Security Testing — Weeks 12–14

- Test authentication and session security.
- Inspect network traffic and database records.
- Test unauthorized access and cryptographic tampering.
- Test API leakage and dependency requirements.
- Fix identified issues and document test evidence.

### Phase 7: Final Preparation — Weeks 15–16

- Finalize technical documentation.
- Prepare the security testing report.
- Prepare the demonstration environment.
- Complete the project presentation and final review.

The timeline is an estimate and may be adjusted according to implementation progress and supervisor feedback.

## 13. Expected Outcomes

The expected outcomes are:

1. A working SecureChat web application.
2. Secure user registration, login, and session management.
3. Contact search and one-to-one real-time messaging.
4. Client-side end-to-end encrypted text messages.
5. Public-key verification and key-change warnings.
6. Basic profile management and logout.
7. A basic administrator dashboard.
8. Locally installed dependencies and self-managed core backend services.
9. Improved protection against accidental server-secret and sensitive-information leakage.
10. Technical documentation describing the system architecture, database, and encryption design.
11. A security testing report containing test results, evidence, and limitations.

## 14. Project Limitations

SecureChat is an educational university project and is not intended to claim the same security assurance as mature, independently audited messaging applications.

The initial version will exclude:

- Encrypted file sharing
- Group chat
- Voice calls
- Video calls
- Advanced push notifications
- Advanced administrator analytics

The project also has important security limitations:

- A compromised client device may expose plaintext messages or cryptographic keys.
- A compromised server that can modify JavaScript delivered to the browser may attempt to capture plaintext or key material.
- Incorrect key verification or key management may weaken E2EE.
- Metadata, such as account identifiers, timestamps, or communication patterns, may remain visible to the server depending on the design.
- Locally installed libraries can still contain vulnerabilities and require maintenance.
- Security testing can provide evidence of tested protections but cannot prove that the application is free from all vulnerabilities.

The project will document these limitations and avoid making unsupported claims of absolute security.

## 15. Conclusion

SecureChat is a university project that combines full-stack web development, real-time communication, cryptography, and web application security in a private messaging application.

By focusing on nine core features, the project aims to remain manageable while demonstrating secure authentication, one-to-one messaging, end-to-end encryption, public-key verification, access control, and security testing.

The additional requirement concerning API leakage will be addressed through locally installed dependencies, self-managed backend services, server-side secret protection, restricted API responses, and documented security tests. Client-side cryptographic operations will remain on the user's device to support the intended end-to-end encryption design.

The final goal is to deliver a functional application with a clear architecture, documented implementation decisions, and evidence-based security evaluation, while honestly explaining the protections achieved and the limitations that remain.




