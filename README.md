# 🔒 SecureChat: Secure and End-to-End Encrypted Private Messaging Web Application

## 1. Project Introduction
**SecureChat** is a web-based private messaging application designed to provide secure communication between users through one-to-one real-time text messaging. The main purpose of this project is to demonstrate how modern web technologies and cryptographic techniques can be used to protect the confidentiality and integrity of private conversations.

The application will allow users to register, log in securely, search for other users, and exchange text messages in real time. Messages will be encrypted on the sender's device and decrypted on the intended recipient's device using an **end-to-end encryption (E2EE)** design.

The server will manage authentication, message delivery, and encrypted message storage without needing access to the plaintext content of messages. The system will also provide public-key verification, key-change warnings, secure session management, access control, and a basic administrator dashboard.

This project is developed for educational purposes as a university project, focusing on full-stack web development, real-time communication, applied cryptography, and web application security.

---

## 2. Problem Statement
Online messaging applications are widely used to exchange personal information and private messages. However, if an application lacks appropriate security controls, sensitive information may be exposed through unauthorized database access, insecure communication, compromised accounts, or other vulnerabilities.

A messaging system that allows the server to access readable messages may create additional privacy risks if the server or its database is compromised.

**SecureChat** aims to address this problem by implementing end-to-end encrypted text messaging, secure authentication, public-key verification, and access control. The project will also include structured security testing to evaluate the implemented protections and identify potential weaknesses.

---

## 3. Project Objectives
The main objectives of SecureChat are:
1. To develop a responsive and user-friendly private messaging web application.
2. To implement secure user registration and login.
3. To support contact search and one-to-one real-time text messaging.
4. To implement end-to-end encryption for text messages.
5. To provide public-key verification and key-change warnings.
6. To protect user sessions and prevent unauthorized access.
7. To provide basic profile management and logout functionality.
8. To build a basic administrator dashboard for user management and security-event review.
9. To conduct security testing and document the results in a final report.

---

## 4. Project Scope: Nine Core Features

### Feature 1: User Registration and Login
This feature allows new users to create accounts and existing users to access the application securely.
* **Main functions:**
  * Register an account using the required information.
  * Validate registration and login inputs.
  * Hash passwords using **Argon2id**.
  * Authenticate users before granting access to protected pages.
  * Display appropriate success and error messages.
  * Apply appropriate protections against repeated login attempts.
* *Note:* Passwords will never be stored as plaintext. The application will use secure authentication and session-management practices.

### Feature 2: Contact Search
This feature allows users to search for other registered users and start private conversations.
* **Main functions:**
  * Search for users using their usernames or approved identifiers.
  * Display relevant search results.
  * Select a user to start or open a one-to-one conversation.
  * Restrict the information displayed about other users to what is necessary.

### Feature 3: One-to-One Real-Time Chat
This feature provides the main messaging interface for private communication between two users.
* **Main functions:**
  * Display the conversation interface.
  * Allow users to compose and send text messages.
  * Deliver messages in real time using **Socket.IO**.
  * Display incoming messages without requiring a page refresh.
  * Store encrypted message payloads in the database.
  * Display messages in the appropriate conversation.
* *Note:* The application will support one-to-one text messaging only. Group chats, file sharing, voice calls, and video calls are excluded from the project scope.

### Feature 4: End-to-End Encrypted Text Messages
This is the core security feature of SecureChat.
* **Main functions:**
  * Encrypt outgoing messages on the sender's device.
  * Send encrypted message payloads to the backend.
  * Store and deliver encrypted messages without requiring the server to read their plaintext content.
  * Decrypt messages on the intended recipient's device.
  * Detect message modification through authenticated encryption.
  * Keep private encryption keys under client-side control.
* *Technical Design:* The implementation may use **AES-GCM** for authenticated encryption and **ECDH with HKDF** for key establishment. The system must correctly handle nonce generation, key derivation, authentication tags, and key lifecycle management.

### Feature 5: Public-Key Verification and Key-Change Warning
This feature helps users verify the cryptographic identity of the people they communicate with.
* **Main functions:**
  * Generate or establish cryptographic key pairs for users.
  * Make the required public-key information available to contacts.
  * Keep private keys inaccessible to the server under the intended security design.
  * Provide a method for users to verify a contact's public key or cryptographic identity.
  * Warn users when a contact's public key changes unexpectedly.
  * Avoid silently accepting unexpected key changes without appropriate warning or verification.

### Feature 6: Secure Sessions and Access Control
This feature protects user sessions and ensures that users can access only the resources they are authorized to use.
* **Main functions:**
  * Maintain authenticated sessions securely.
  * Use appropriate cookie settings (`HttpOnly`, `Secure`, `SameSite`).
  * Support logout and session invalidation.
  * Verify user permissions before allowing access to conversations.
  * Prevent users from accessing other users' private messages without authorization.
  * Apply input validation and relevant CSRF protections.
  * Restrict administrative functions to authorized administrators (Principle of Least Privilege).

### Feature 7: Basic Profile and Logout
This feature allows users to view and manage essential account information and safely end their sessions.
* **Main functions:**
  * Display basic profile information.
  * Allow users to update permitted information, such as their display name.
  * Display their username or account identifier.
  * Provide a logout function and invalidate the current session after logout.
  * Return the user to the login page or another appropriate public page.

### Feature 8: Basic Admin Dashboard
This feature provides an interface for authorized administrators to manage user accounts and review relevant security events.
* **Main functions:**
  * Display a basic overview of registered users.
  * View and manage user account status.
  * Apply role-based access control (RBAC) to administrative functions.
  * Review relevant security and administrative audit events.
  * Record important administrative actions.
  * Prevent ordinary users from accessing administrator pages and APIs.
* *Note:* Audit logs must not contain passwords, private keys, or plaintext message contents.

### Feature 9: Security Testing and Report
This feature evaluates the application's functionality and security controls.
* **Authentication and session testing:** Test registration/login validation, password-hashing, logout, session expiration, and unauthorized access prevention.
* **Encryption testing:** Inspect network traffic and database records for ciphertext, verify decryption by authorized recipients, test ciphertext modification failure, check nonce management, and test public-key verification/warnings.
* **Access-control testing:** Attempt unauthorized access to other users' conversations and admin endpoints.
* **Web security testing:** Test SQL injection, XSS, CSRF protections, input validation, and log security.
* **Security report:** Document test objectives, procedures, test cases, expected/actual results, vulnerabilities, corrective actions, and limitations.

---

## 5. System Architecture
SecureChat will use a client-server architecture with three main components:
* **A. Frontend:** Provides the UI for registration, login, contact search, conversations, public-key verification, profile management, and administration. Performs client-side cryptographic operations.
* **B. Backend:** Handles authentication, user management, contact search, real-time message delivery, session validation, access control, and administrator functions without accessing plaintext messages or private keys.
* **C. Database:** Stores user account information, password hashes, public-key records, conversation metadata, encrypted messages, and security audit events.

---

## 6. Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend framework** | Next.js | Build the user interface |
| **Programming language** | TypeScript | Improve code reliability |
| **UI styling** | Tailwind CSS | Create responsive layouts |
| **Backend runtime** | Node.js | Run backend services |
| **Backend framework** | Express.js | Build APIs |
| **Real-time communication** | Socket.IO | Deliver messages in real time |
| **Database** | MySQL | Store application data |
| **Client-side cryptography** | Web Crypto API | Perform cryptographic operations |
| **Password hashing** | Argon2id | Protect stored password verifiers |
| **Transport security** | HTTPS/TLS | Protect data in transit |
| **Testing** | Automated & Security Tools | Evaluate functionality and security |

---

## 7. User Interface Design
The interface will use a modern and responsive messaging layout with dark teal navigation, green accent colors, and clean white or light-gray content panels.
* **Planned Screens:**
  1. Login Page
  2. Registration Page
  3. Main Chat Page with Contact Search
  4. One-to-One Conversation Page
  5. Public-Key Verification and Key-Change Warning Interface
  6. Basic Profile and Settings Page
  7. Administrator Dashboard
  8. User Management Page
  9. Responsive Mobile Chat Layout

---

## 8. Database Design
The planned database will include the following tables:
* **`Users`**: Account identifiers, usernames, password hashes, account status, and timestamps.
* **`PublicKeys`**: Public-key records, key versions, and verification-related metadata.
* **`Conversations`**: Conversation identifiers and participant information.
* **`Messages`**: Sender, conversation, encrypted message payload, timestamps, and necessary status metadata.
* **`AuditLogs`**: Relevant security events and administrative actions.

---

## 9. Security Requirements
* Password hashing using **Argon2id**.
* Secure authentication and session handling.
* **HTTPS/TLS** for communication between the browser and server.
* Client-side encryption and authenticated decryption.
* Secure cryptographic key generation and management.
* Public-key verification and key-change warnings.
* Correct nonce management and cryptographic error handling.
* Input validation, output encoding, and authorization checks.
* Protections against common web vulnerabilities & rate limiting for sensitive endpoints.
* Safe error handling and avoidance of sensitive data in server logs.

---

## 10. Development Methodology and Timeline

* **Phase 1: Planning and UI Design (Weeks 1–2)**
  * Confirm the nine core features, design UI, define architecture/database/API, and prepare environment.
* **Phase 2: Authentication and Sessions (Weeks 3–4)**
  * Implement registration, login, password hashing, secure sessions, access control, profile, and logout.
* **Phase 3: Contact Search and Real-Time Chat (Weeks 5–6)**
  * Implement contact search, 1-to-1 conversations, Socket.IO integration, and encrypted message storage/delivery.
* **Phase 4: End-to-End Encryption (Weeks 7–9)**
  * Define encryption/key-establishment design, implement client-side E2EE, public-key verification, and tampering detection.
* **Phase 5: Administrator Dashboard (Weeks 10–11)**
  * Implement user management, admin access control, and security event logging.
* **Phase 6: Security Testing (Weeks 12–14)**
  * Run functional/security tests, fix issues, collect evidence, and prepare the security report.
* **Phase 7: Final Preparation (Weeks 15–16)**
  * Prepare demonstration environment, technical documentation, and final presentation.

---

## 11. Expected Outcomes
1. A working SecureChat web application.
2. Secure user registration, login, and session management.
3. Contact search and one-to-one real-time text messaging.
4. Client-side end-to-end encrypted text messages.
5. Public-key verification and key-change warnings.
6. Basic profile and logout functionality.
7. A basic administrator dashboard.
8. Technical documentation describing the architecture and database.
9. A security testing report containing test results, evidence, and limitations.

---

## 12. Project Limitations
SecureChat is an educational project. The following features are explicitly excluded from the initial version:
* Encrypted file sharing
* Group chat
* Voice & Video calls
* Advanced push notifications
* Advanced administrator analytics

---

## 13. Conclusion
SecureChat is a university project that combines full-stack web development, real-time communication, cryptography, and web application security. By focusing on nine core features, the project aims to remain manageable while demonstrating the essential elements of a secure messaging system, supported by technical documentation and structured security evaluation.
