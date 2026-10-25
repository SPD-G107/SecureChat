PROJECT PROPOSAL
SecureChat: Secure and End-to-End Encrypted Private Messaging Web Application
1. Project Introduction
SecureChat is a web-based private messaging application designed to provide secure communication between users through one-to-one real-time text messaging. The main purpose of this project is to demonstrate how modern web technologies and cryptographic techniques can be used to protect the confidentiality and integrity of private conversations.
The application will allow users to register, log in securely, search for other users, and exchange text messages in real time. Messages will be encrypted on the sender's device and decrypted on the intended recipient's device using an end-to-end encryption (E2EE) design.
The server will manage authentication, message delivery, and encrypted message storage without needing access to the plaintext content of messages. The system will also provide public-key verification, key-change warnings, secure session management, access control, and a basic administrator dashboard.
This project is developed for educational purposes as a university project, focusing on full-stack web development, real-time communication, applied cryptography, and web application security.
2. Problem Statement
Online messaging applications are widely used to exchange personal information and private messages. However, if an application lacks appropriate security controls, sensitive information may be exposed through unauthorized database access, insecure communication, compromised accounts, or other vulnerabilities.
A messaging system that allows the server to access readable messages may create additional privacy risks if the server or its database is compromised.
SecureChat aims to address this problem by implementing end-to-end encrypted text messaging, secure authentication, public-key verification, and access control. The project will also include structured security testing to evaluate the implemented protections and identify potential weaknesses.
3. Project Objectives
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
4. Project Scope: Nine Core Features
Feature 1: User Registration and Login
This feature allows new users to create accounts and existing users to access the application securely.
Main functions:
- Register an account using the required information.
- Validate registration and login inputs.
- Hash passwords using Argon2id.
- Authenticate users before granting access to protected pages.
- Display appropriate success and error messages.
- Apply appropriate protections against repeated login attempts.
Passwords will never be stored as plaintext. The application will use secure authentication and session-management practices.
Feature 2: Contact Search
This feature allows users to search for other registered users and start private conversations.
Main functions:
- Search for users using their usernames or approved identifiers.
- Display relevant search results.
- Select a user to start or open a one-to-one conversation.
- Restrict the information displayed about other users to what is necessary.
This feature makes it easy for users to find the intended recipient before sending a private message.
Feature 3: One-to-One Real-Time Chat
This feature provides the main messaging interface for private communication between two users.
Main functions:
- Display the conversation interface.
- Allow users to compose and send text messages.
- Deliver messages in real time using Socket.IO.
- Display incoming messages without requiring a page refresh.
- Store encrypted message payloads in the database.
- Display messages in the appropriate conversation.
The application will support one-to-one text messaging only. Group chats, file sharing, voice calls, and video calls are excluded from the project scope.
Feature 4: End-to-End Encrypted Text Messages
This is the core security feature of SecureChat.
Main functions:
- Encrypt outgoing messages on the sender's device.
- Send encrypted message payloads to the backend.
- Store and deliver encrypted messages without requiring the server to read their plaintext content.
- Decrypt messages on the intended recipient's device.
- Detect message modification through authenticated encryption.
- Keep private encryption keys under client-side control.
The implementation may use AES-GCM for authenticated encryption and ECDH with HKDF for key establishment, according to the selected cryptographic design.
The system must correctly handle nonce generation, key derivation, authentication tags, and key lifecycle management. These cryptographic building blocks do not automatically form a complete secure messaging protocol, so the implementation and its limitations will be documented.
Feature 5: Public-Key Verification and Key-Change Warning
This feature helps users verify the cryptographic identity of the people they communicate with.
Main functions:
- Generate or establish cryptographic key pairs for users.
- Make the required public-key information available to contacts.
- Keep private keys inaccessible to the server under the intended security design.
- Provide a method for users to verify a contact's public key or cryptographic identity.
- Warn users when a contact's public key changes unexpectedly.
- Avoid silently accepting unexpected key changes without appropriate warning or verification.
This feature is important because encryption alone cannot guarantee that the intended recipient's public key has not been substituted. Verification helps reduce the risk of impersonation and unauthorized key replacement.
Feature 6: Secure Sessions and Access Control
This feature protects user sessions and ensures that users can access only the resources they are authorized to use.
Main functions:
- Maintain authenticated sessions securely.
- Use appropriate cookie settings, including HttpOnly, Secure, and suitable SameSite attributes.
- Support logout and session invalidation.
- Verify user permissions before allowing access to conversations.
- Prevent users from accessing other users' private messages without authorization.
- Apply input validation and relevant CSRF protections.
- Restrict administrative functions to authorized administrators.
The application will follow the principle of least privilege so that users receive only the permissions required for their tasks.
Feature 7: Basic Profile and Logout
This feature allows users to view and manage essential account information and safely end their sessions.
Main functions:
- Display basic profile information.
- Allow users to update permitted information, such as their display name.
- Display their username or account identifier.
- Provide a logout function.
- Invalidate the current session after logout.
- Return the user to the login page or another appropriate public page.
Advanced profile customization, notification preferences, and extensive settings are not included in the initial version.
Feature 8: Basic Admin Dashboard
This feature provides an interface for authorized administrators to manage user accounts and review relevant security events.
Main functions:
- Display a basic overview of registered users.
- View and manage user account status.
- Apply role-based access control to administrative functions.
- Review relevant security and administrative audit events.
- Record important administrative actions.
- Prevent ordinary users from accessing administrator pages and APIs.
The dashboard will focus on essential management tasks. Advanced analytics, complex reporting, and access to plaintext private conversations are excluded. Audit logs must not contain passwords, private keys, or plaintext message contents.
Feature 9: Security Testing and Report
This feature evaluates the application's functionality and security controls.
Authentication and session testing
- Test registration and login validation.
- Verify password-hashing behavior.
- Test logout and session expiration.
- Confirm that unauthorized users cannot access protected resources.
Encryption testing
- Inspect network traffic to verify that message contents are not transmitted as plaintext by the application.
- Inspect database records to confirm that message payloads are stored as ciphertext.
- Verify that authorized recipients can decrypt valid messages.
- Modify ciphertext and verify that decryption or authentication fails.
- Check nonce generation and management.
- Test public-key verification and key-change warnings.
Access-control testing
- Attempt to access another user's conversation without permission.
- Test administrator-only endpoints using an ordinary account.
- Verify that unauthorized requests are rejected.
Web security testing
- Test relevant SQL injection and cross-site scripting (XSS) scenarios.
- Test CSRF protections where applicable.
- Check input validation and authorization behavior.
- Review application logs for accidental exposure of sensitive information.
Security report
The final report will include:
- Test objectives and procedures.
- Test cases and expected results.
- Actual results and supporting evidence.
- Identified weaknesses or vulnerabilities.
- Corrective actions taken.
- Remaining limitations and recommendations.
Security claims will be based on the tests performed and evidence collected. The application will not be described as completely secure simply because it uses encryption.
5. System Architecture
SecureChat will use a client-server architecture with three main components.
A. Frontend
The frontend provides the user interface for registration, login, contact search, conversations, public-key verification, profile management, and administration.
It will also perform the client-side cryptographic operations required for message encryption and decryption.
B. Backend
The backend handles authentication, user management, contact search, real-time message delivery, session validation, access control, and administrator functions.
The server will deliver encrypted message payloads and should not need access to plaintext messages or private encryption keys.
C. Database
The database stores user account information, password hashes, public-key records, conversation metadata, encrypted messages, and relevant security audit events.
Private encryption keys and plaintext messages will not be stored on the server as part of the intended security design.
6. Technology Stack
ComponentTechnologyPurposeFrontend frameworkNext.jsBuild the user interfaceProgramming languageTypeScriptImprove code reliabilityUI stylingTailwind CSSCreate responsive layoutsBackend runtimeNode.jsRun backend servicesBackend frameworkExpress.jsBuild APIsReal-time communicationSocket.IODeliver messages in real timeDatabaseMySQLStore application dataClient-side cryptographyWeb Crypto APIPerform cryptographic operationsPassword hashingArgon2idProtect stored password verifiersTransport securityHTTPS/TLSProtect data in transitTestingAutomated tests and security-testing toolsEvaluate functionality and security
The final implementation may adjust these technologies based on university requirements and the development environment.
7. User Interface Design
The interface will use a modern and responsive messaging layout with dark teal navigation, green accent colors, and clean white or light-gray content panels.
The planned screens are:
1. Login Page.
2. Registration Page.
3. Main Chat Page with Contact Search.
4. One-to-One Conversation Page.
5. Public-Key Verification and Key-Change Warning Interface.
6. Basic Profile and Settings Page.
7. Administrator Dashboard.
8. User Management Page.
9. Responsive Mobile Chat Layout.
The design will prioritize readable messages, straightforward navigation, clear security indicators, and a consistent visual style across desktop and mobile screens.
8. Database Design
The planned database will include the following tables:
- Users: Account identifiers, usernames, password hashes, account status, and timestamps.
- PublicKeys: Public-key records, key versions, and verification-related metadata.
- Conversations: Conversation identifiers and participant information.
- Messages: Sender, conversation, encrypted message payload, timestamps, and necessary status metadata.
- AuditLogs: Relevant security events and administrative actions.
The final schema will be refined during implementation. Authorization checks will ensure that users cannot retrieve messages or private account information belonging to other users.
Private keys and plaintext message contents will not be stored in these tables.
9. Security Requirements
The application will follow security principles throughout development.
The main requirements include:
- Password hashing using Argon2id.
- Secure authentication and session handling.
- HTTPS/TLS for communication between the browser and server.
- Client-side encryption and authenticated decryption.
- Secure cryptographic key generation and management.
- Public-key verification and key-change warnings.
- Correct nonce management and cryptographic error handling.
- Input validation and output encoding.
- Authorization checks for messages and administrative functions.
- Protections against common web vulnerabilities.
- Rate limiting for sensitive endpoints.
- Safe error handling and security logging.
- Avoidance of plaintext messages, private keys, and passwords in server logs.
A known limitation is that a compromised server capable of modifying the JavaScript delivered to users may attempt to access plaintext messages or cryptographic keys. This risk will be documented in the threat model and final report.
10. Development Methodology and Timeline
The project will be developed in stages.
Phase 1: Planning and UI Design — Weeks 1–2
- Confirm the nine core features.
- Design the user interface.
- Define the architecture, database schema, and API requirements.
- Prepare the development environment.
Phase 2: Authentication and Sessions — Weeks 3–4
- Implement registration and login.
- Configure password hashing.
- Implement secure sessions and access control.
- Build profile and logout functionality.
Phase 3: Contact Search and Real-Time Chat — Weeks 5–6
- Implement contact search.
- Create one-to-one conversations.
- Integrate Socket.IO.
- Implement encrypted-message storage and real-time delivery.
Phase 4: End-to-End Encryption — Weeks 7–9
- Define the encryption and key-establishment design.
- Implement client-side encryption and decryption.
- Implement public-key verification and key-change warnings.
- Test encryption, decryption, and message-tampering detection.
Phase 5: Administrator Dashboard — Weeks 10–11
- Implement basic user management.
- Add administrative access control.
- Record relevant security events.
Phase 6: Security Testing — Weeks 12–14
- Run functional and security tests.
- Fix identified issues.
- Collect evidence and prepare the security report.
Phase 7: Final Preparation — Weeks 15–16
- Prepare the demonstration environment.
- Complete technical documentation.
- Prepare the final presentation.
The estimated development period is approximately 12–16 weeks, depending on the available working hours, project deadline, and complexity of the cryptographic implementation.
11. Expected Outcomes
At the end of the project, the expected deliverables are:
1. A working SecureChat web application.
2. Secure user registration, login, and session management.
3. Contact search and one-to-one real-time text messaging.
4. Client-side end-to-end encrypted text messages.
5. Public-key verification and key-change warnings.
6. Basic profile and logout functionality.
7. A basic administrator dashboard.
8. Technical documentation describing the architecture and database.
9. A security testing report containing test results, evidence, and limitations.
The final demonstration will show the application operating with two user accounts and explain how message encryption, access control, and security testing work.
12. Project Limitations
SecureChat is an educational project and is not intended to claim the same security maturity as established messaging applications such as Signal or WhatsApp.
The initial version will focus exclusively on the nine core features described in this proposal.
The following features are explicitly excluded:
- Encrypted file sharing.
- Group chat.
- Voice calls.
- Video calls.
- Advanced push notifications.
- Advanced administrator analytics.
These features may be considered for future development if the project scope changes.
The project's security will depend on the quality of the cryptographic design, implementation, key management, deployment environment, and testing. Storing ciphertext in a database does not, by itself, prove that the entire system is secure.
13. Conclusion
SecureChat is a university project that combines full-stack web development, real-time communication, cryptography, and web application security.
By focusing on nine core features, the project aims to remain manageable while demonstrating the essential elements of a secure messaging system. The final application will provide one-to-one real-time text messaging, client-side end-to-end encryption, public-key verification, secure access control, basic administration, and a structured security evaluation.
The project will also document its technical decisions, testing results, limitations, and potential improvements. The expected outcome is a working demonstration that explains not only how users communicate privately, but also how the application attempts to protect their messages and how its security has been evaluated.



it is readme ?
