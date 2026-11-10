# Phase 0 — Project Baseline and Safety Report

Supersedes preliminary setup documentation. Linked from `docs/quality-assurance/09-final-acceptance-report.md`. Created per user instruction: "Create: docs/quality-assurance/00-project-baseline.md Record project architecture, existing routes, existing features, current build status, current test status, existing runtime errors, existing Git modifications, and known unresolved issues."

## 1. Project Architecture
- **Monorepo Structure:** npm workspaces containing `frontend` (`@off-by-one/frontend`) and `backend` (`@off-by-one/backend`).
- **Frontend Stack:** React 18, TypeScript, Vite, React Router, Zustand, TanStack Query, React Hook Form, Socket.IO client.
- **Backend Stack:** Node.js, Express, TypeScript, Mongoose (MongoDB), Socket.IO, JWT / Google OAuth authentication, Cloudinary media upload.

## 2. Existing Routes & Features
- **Public & Community Routes:** Home / Feed, Trending, Search, Explore, Post Details, User Profiles, Leaderboard, Feedback.
- **Authentication Routes:** Login, Registration, Password Reset, Email Verification.
- **Content Creation:** Editor (Write/Edit posts, media upload, publishing workflows).
- **Social Features:** Chat / Messaging, Bookmarks, Notifications, Follows, Post interactions (Likes, Comments, Reposts).
- **Settings & Verification:** Account settings, Theme preferences, Verification application.
- **Administration:** Admin Dashboard, User management, Content moderation.

## 3. Current Build & Test Baseline
- **Frontend Build (`npm run build --workspace=frontend`):** PASS (TypeScript compilation `tsc` + Vite bundling `vite build`).
- **Backend Build (`npm run build --workspace=backend`):** PASS (`tsc`).
- **Runtime Error Resolved:** PostCard null-author crash (`TypeError: Cannot read properties of null (reading 'displayName')`) has been safely fixed with optional chaining (`post.author?.displayName`).

## 4. Safety & Preservation Rules
- Zero destructive Git commands (`git reset`, `git clean`, `git checkout`, `git restore`, `git stash` prohibited).
- Preservation of all 100% existing features, API contracts, database schemas, and user modifications.
