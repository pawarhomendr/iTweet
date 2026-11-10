# Phase 6 — Bug Remediation Log

Supersedes preliminary remediation notes. Linked from `docs/quality-assurance/09-final-acceptance-report.md`. Created per user instruction: "Create: docs/quality-assurance/06-bug-remediation-log.md Document reproduced issues, root causes, fixes, and verification results."

## 1. Remediation Log
- **Bug 1: PostCard Null Author Crash**
  - *Symptom:* `TypeError: Cannot read properties of null (reading 'displayName')`
  - *Root Cause:* Unpopulated or deleted author reference.
  - *Fix:* Optional chaining and fallback added in `PostCard.tsx`.
  - *Verification:* Frontend production build (`npm run build`) passed successfully.
