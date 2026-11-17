# SecureChat Sprint 1 & Sprint 2 Backlog (Group 7 - SDP:G107)

## Team Roles & Ownership
| Member | GitHub Handle | Primary Role & Ownership |
|---|---|---|
| **SENG Koemnan** | `sengkoemnan6749-source` | Project Manager, Backend Auth/Express Security, Git Governance & Scrum Sync |
| **SOK Sovanrith** | `Narith0494` | DevOps & Frontend E2EE UX, CI/CD, Docker Healthchecks, Media Chunked Encryption |
| **REAM Rithy** | `ReamRithy` | Database Architecture (3NF MySQL & Migrations), Zero-Plaintext Protocol & Crypto Tests |
| **HENG Minou** | `hengminou12345-del` | Reverse Proxy & Admin Security Dashboard, Key Rotation Sync & Audit Monitoring |

---

## Sprint 1: Core Architecture, Auth, 3NF Database & E2EE Baseline (Completed)
| ID | User Story | Story Points | Owner | Binary Acceptance Criteria |
|---|---|---|---|---|
| S1-1 | Provision 3NF MySQL schema with foreign keys & indexes | 3 | REAM Rithy | All 7 tables (`users`, `public_keys`, `conversations`, `messages`, `message_reactions`, `audit_logs`, `push_subscriptions`) enforce FK integrity. |
| S1-2 | Argon2id authentication & JWT session issuance | 5 | SENG Koemnan | Passwords hashed via Argon2id (64MB); invalid login returns HTTP `401` and logs `USER_LOGIN_FAILED`. |
| S1-3 | Client-side ECDH P-256 + HKDF-SHA256 + AES-256-GCM encryption | 8 | SOK Sovanrith | Private keys never leave browser `localStorage`; server stores ciphertext, IV, and MAC tag only. |
| S1-4 | Real-time Socket.IO messaging & typing/read receipts | 5 | HENG Minou | Conversations persist in MySQL across browser refresh; messages decrypt cleanly on verified peer devices. |

---

## Sprint 2: Production Hardening, Key Rotation, DevOps & Auditability
| ID | Feature Branch (from `development`) | Story Points | Owner | Binary Acceptance Criteria |
|---|---|---|---|---|
| S2-1 | `feature/ec2-coturn-ip-update` | 2 | HENG Minou | Coturn TURN `--external-ip` & frontend `RTC_CONFIG` updated to `18.140.114.212`. |
| S2-2 | `feature/github-pr-issue-templates` | 1 | SENG Koemnan | `.github/PULL_REQUEST_TEMPLATE.md` & Issue templates enforce linked issues and AC checklist. |
| S2-3 | `feature/github-actions-ci` | 3 | SOK Sovanrith | `.github/workflows/ci.yml` compiles `backend` & typechecks/builds `frontend` on PRs to `development`/`main`. |
| S2-4 | `feature/db-migration-002` | 3 | REAM Rithy | `002_avatar_reactions_edit_push.sql` idempotently syncs `avatar_url`, `is_edited`, `message_reactions`, and `push_subscriptions`. |
| S2-5 | `feature/nginx-reverse-proxy` | 3 | HENG Minou | `deploy/nginx-securechat.conf` proxies `/api/`, `/socket.io/`, and `/` with 25MB encrypted upload support. |
| S2-6 | `feature/express-trust-proxy` | 2 | SENG Koemnan | `app.set('trust proxy', 1)` enabled in `backend/src/app.ts` so `req.ip` and rate limits see client IPs behind Nginx. |
| S2-7 | `feature/docker-healthchecks` | 2 | SOK Sovanrith | `docker-compose.yml` defines healthchecks for `mysql`, `backend`, `frontend` and documents `.env.example`. |
| S2-8 | `feature/crypto-security-tests` | 3 | REAM Rithy | `npm run test:crypto` verifies ECDH P-256 + AES-GCM 1-bit tamper rejection and >128KB chunked Base64 encoding. |
| S2-9 | `feature/admin-audit-filter` | 3 | HENG Minou | Admin Dashboard supports filtering audit logs by `ALL` / `LOGIN` / `FAILED` / `KEY` and `@username`/IP search. |
| S2-10 | `feature/sprint-backlog-docs` | 1 | SENG Koemnan | `docs/sprint-backlog.md` reflects Sprint 1–2 story points, AC, and balanced role ownership across all 4 members. |
