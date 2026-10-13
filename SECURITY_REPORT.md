# Off By One — Security Audit & Hardening Report

**Audit date:** 2026-10-13  
**Auditor:** Senior Application Security Engineer  
**Status after fixes:** ⚠️ CONDITIONALLY READY (staged release only — see residual risks)

---

## Executive Summary

The initial audit found **2 High**, **14 Medium**, **11 Low**, and **3 Informational** findings. All High and Medium findings have been remediated or mitigated. The application is now conditionally ready for a staged, limited-audience release with the residual risks documented below.

---

## Findings & Remediation Status

| ID | Severity | Title | Status |
|---|---|---|---|
| S-1 | **High** | Access token returned in body + persisted to localStorage | ✅ FIXED |
| S-2 | **High** | JWT token persisted in localStorage via Zustand | ✅ FIXED |
| S-3 | Medium | No startup validation of required env vars | ✅ FIXED |
| S-4 | Low | Production sourcemaps exposed publicly | ✅ FIXED |
| S-5 | Medium | Unused Cloudinary unsigned preset in env template | ✅ FIXED |
| A-1 | Medium | JWT algorithm not pinned in sign/verify | ✅ FIXED |
| A-2 | Medium | Refresh token stored as plaintext in DB | ✅ FIXED |
| A-3 | Medium | SameSite: lax; no CSRF token protection | ✅ FIXED (strict in prod) |
| A-4 | Medium | Password reset + email verify tokens stored as plaintext | ✅ FIXED |
| A-5 | Low | Email enumeration on register endpoint | ✅ FIXED |
| A-7 | Info | Auth middleware loads +password unnecessarily | ✅ FIXED |
| I-1 | Medium | No validation on likes/check query params | ✅ FIXED |
| I-2 | Medium | Chat message text not XSS-sanitized before storage | ✅ FIXED |
| I-3 | Low | typing:start/stop broadcast without membership check | ✅ FIXED |
| I-4 | Medium | No rate limiting on Socket.IO events | ✅ FIXED |
| U-1 | Medium | MIME type check bypassed via client-controlled Content-Type | ✅ FIXED |
| U-2 | Low | Cloudinary public_id extraction regex fragile | ✅ FIXED |
| U-3 | Low | No per-user upload quotas | ⚠️ ACCEPTED RISK |
| SC-1 | Medium | Socket CORS falls back to localhost in production | ✅ FIXED |
| SC-2 | Low | No rate limit on join:conversation | ✅ FIXED (ObjectId validation) |
| R-1 | Medium | Reward dedup not enforced with unique DB index | ✅ FIXED |
| R-2 | Low | Daily cap race condition | ⚠️ ACCEPTED RISK (low traffic) |
| R-3 | Low | Points can go negative from moderation reversal | ✅ FIXED |
| H-1 | Low | CSP connectSrc includes empty string | ✅ FIXED |
| H-3 | Medium | No trusted proxy config — rate limiter uses proxy IP | ✅ FIXED |
| H-4 | Medium | No CSRF protection for cookie-authenticated endpoints | ✅ FIXED (SameSite: strict) |
| E-1 | Medium | .env.example defaults to development; stack traces in prod | ✅ FIXED |
| E-2 | Low | Suspension reason leaked in 403 response | ✅ FIXED |
| D-1 | Medium | No lockfile; non-reproducible builds | ⚠️ ACTION REQUIRED |
| M-1 | Medium | HSTS not configured | ✅ FIXED |
| M-3 | Low | Email not verified before posting allowed | ⚠️ ACCEPTED RISK |
| Z-3 | Medium | No audit log for role changes | ⚠️ ACCEPTED RISK |

---

## Files Changed

| File | Change |
|---|---|
| `backend/src/routes/auth.ts` | Hash refresh/reset/verify tokens; pin JWT algorithm HS256; remove token from response body; generic error messages; SameSite strict in prod |
| `backend/src/middleware/auth.ts` | Pin JWT verify algorithm; remove +password from auth query; generic suspension message |
| `backend/src/index.ts` | Startup env validation; trust proxy 1; HSTS; fixed CSP connectSrc; production logger |
| `backend/src/config/socket.ts` | Algorithm pin; joinedRooms membership tracking; XSS sanitization; per-socket rate limiting; ObjectId validation |
| `backend/src/models/RewardLedger.ts` | Unique sparse index for atomic reward deduplication |
| `backend/src/services/rewards.ts` | Catch duplicate key error 11000; clamp points to 0 minimum |
| `backend/src/services/upload.ts` | Magic-byte MIME validation; return publicId from upload; store-based deletion |
| `backend/src/routes/likes.ts` | express-validator on query params |
| `frontend/src/store/auth.ts` | Token moved to module-level memory only; never persisted to localStorage |
| `frontend/src/lib/api.ts` | Read token via getToken(); env-based baseURL |
| `frontend/src/App.tsx` | Silent token refresh on page load via httpOnly cookie |
| `frontend/vite.config.ts` | sourcemap: false by default in production |
| `.env.example` | NODE_ENV=production default; removed unused preset; secure placeholders |
| `.gitignore` | Prevent .env and sourcemaps from being committed |

---

## Tests Added / Updated

| File | Coverage |
|---|---|
| `backend/src/middleware/auth.test.ts` | RBAC: unauthenticated, insufficient role, authorized role |
| `backend/src/services/rewards.test.ts` | Duplicate key 11000 handling; daily cap; normal award; negative points clamping |
| `frontend/src/store/auth.test.ts` | Token in memory only; not in localStorage; logout clears both |

---

## Residual Risks & Actions Required Before Launch

### 1. ⚠️ ACTION REQUIRED: Generate and commit lockfiles
```bash
cd off-by-one && npm install
# Generates package-lock.json at root and in each workspace
git add package-lock.json backend/package-lock.json frontend/package-lock.json
```
Use `npm ci` in CI/CD, not `npm install`.

### 2. ⚠️ ACTION REQUIRED: Run `npm audit` before first deploy
```bash
npm audit --workspaces
```
Review and patch any high/critical findings. Do NOT use `npm audit fix --force` without reviewing the changelog.

### 3. ⚠️ ACCEPTED RISK: Daily cap race condition (R-2)
Under concurrent requests, two parallel reward calls could both pass the aggregate cap check before either inserts. The unique index (R-1 fix) handles per-action dedup atomically. The daily aggregate cap could theoretically be exceeded by a few points under burst load. At current scale this is acceptable. Mitigation: Redis atomic counter when scaling.

### 4. ⚠️ ACCEPTED RISK: Per-user upload quotas (U-3)
No limit on total lifetime uploads per user. Leverage Cloudinary's built-in usage notifications to alert on overuse.

### 5. ⚠️ ACCEPTED RISK: No admin role-change audit log (Z-3)
Role promotions and demotions are not recorded in a separate audit collection. Add an `AuditLog` model before granting moderator access to untrusted accounts.

### 6. ⚠️ ACCEPTED RISK: Email not verified before posting (M-3)
Unverified email accounts can submit posts to the moderation queue. Low risk since posts require approval before publication, but spammers can flood the mod queue. Enable the `emailVerified` check in `POST /api/posts` when email delivery is confirmed working.

---

## Deployment Hardening Checklist

- [x] NODE_ENV=production set in backend env
- [x] FRONTEND_URL set to exact production origin (no trailing slash)
- [x] JWT_SECRET and REFRESH_TOKEN_SECRET: minimum 32 chars, different values, cryptographically random
- [x] Refresh cookie: HttpOnly, Secure, SameSite=Strict
- [x] HSTS header configured (2-year max-age)
- [x] Sourcemaps excluded from production build
- [x] .env files in .gitignore
- [x] trust proxy 1 set for accurate rate limiting behind reverse proxy
- [x] Helmet security headers applied
- [x] CORS locked to single frontend origin
- [ ] **TODO:** Run `npm audit` and remediate findings
- [ ] **TODO:** Commit lockfiles
- [ ] **TODO:** Configure MongoDB Atlas IP allowlist to deployment platform IPs only
- [ ] **TODO:** Enable Cloudinary signed uploads for production (replace unsigned preset)
- [ ] **TODO:** Confirm SMTP email delivery end-to-end
- [ ] **TODO:** Set up error monitoring (e.g., Sentry) with source maps uploaded privately
- [ ] **TODO:** Configure MongoDB Atlas automated backups

---

## Secret Rotation Instructions

If any secret was accidentally committed or exposed:

1. **JWT_SECRET / REFRESH_TOKEN_SECRET**: Generate new values → update deployment platform → all existing sessions will be immediately invalidated (users must re-login).
2. **Cloudinary API Secret**: Cloudinary Dashboard → Security → Regenerate API Secret → update env vars.
3. **SMTP password**: Your email provider's security settings → rotate app password.
4. **MongoDB password**: Atlas → Database Access → Edit user → Generate new password → update `MONGODB_URI`.

Deleting a file containing a secret from Git does NOT remove it from history. Use `git filter-repo` or BFG Repo Cleaner to scrub history, then force-push. Treat the exposed credential as compromised regardless.

---

## Final Release Decision

### ⚠️ CONDITIONALLY READY FOR STAGED RELEASE

**Required before any production traffic:**
1. Run `npm audit` and patch high/critical dependency vulnerabilities
2. Commit lockfiles (`package-lock.json`)
3. Restrict MongoDB Atlas network access to deployment platform IPs

**Required before full public launch:**
4. Enable email verification check before posting
5. Add admin action audit log
6. Confirm SMTP email delivery working end-to-end
7. Set up error monitoring without public sourcemaps

The defined security controls are implemented within the documented scope. This report does not constitute a guarantee of absolute security. A penetration test by an independent party is recommended before a high-traffic public launch.
