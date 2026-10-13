# Off By One — API Reference

Base URL: `https://api.off-by-one.dev/api` (or `http://localhost:4000/api`)

## Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Create a new user account | No |
| `POST` | `/login` | Authenticate with email/password; returns JWT | No |
| `POST` | `/logout` | Revoke refresh token and clear cookies | Yes |
| `POST` | `/refresh` | Rotate access token via httpOnly cookie | No |
| `POST` | `/forgot-password` | Send password reset email | No |
| `POST` | `/reset-password` | Set new password with valid token | No |
| `GET` | `/me` | Get currently logged-in user profile | Yes |

## Posts & Publishing (`/api/posts`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Paginated feed (supports `?tag=`, `?category=`, `?search=`) | No |
| `GET` | `/trending` | Top 10 most liked/viewed posts from past 7 days | No |
| `GET` | `/:slug` | Get post details and increment view count | No |
| `POST` | `/` | Submit post for moderation review (supports multipart cover & gallery) | Yes |
| `PATCH`| `/:id` | Edit post (author or moderator) | Yes |
| `DELETE`| `/:id` | Delete post (author or moderator) | Yes |
| `POST` | `/:id/like` | Toggle like on post | Yes |
| `POST` | `/:id/bookmark` | Toggle bookmark on post | Yes |

## Comments (`/api/posts/:postId/comments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Get comments for post | No |
| `POST` | `/` | Post a comment or reply (`?parent=`) | Yes |
| `DELETE`| `/:id` | Soft-delete comment | Yes |
| `POST` | `/:id/like` | Toggle like on comment | Yes |

## Real-time Chat (`/api/conversations`) & Socket.IO
- **Socket Event `join:conversation`**: Validates user is an authorized participant before joining room `conv:<id>`.
- **Socket Event `message:send`**: Validates text, creates message document, broadcasts to room, emits notification to recipient.
- **REST Endpoints**:
  - `GET /api/conversations`: List active chats.
  - `POST /api/conversations`: Initiate conversation with a user.
  - `GET /api/conversations/:id/messages`: Paginated message history.

## Rewards & Leaderboard (`/api/rewards`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/leaderboard` | All-time points ranking | No |
| `GET` | `/monthly-leaderboard` | Monthly ranking | No |
| `GET` | `/me` | My reward ledger history and point breakdown | Yes |

## Verification (`/api/verification`)
- `POST /apply`: Submit verification request (must meet criteria: >=5 posts, >=20 followers, >=200 points).
- `GET /my`: Check status of own application.
- `GET /`: Moderator queue of pending requests.
- `PATCH /:id`: Approve (grants blue tick) or reject with note.

## Moderation & Admin (`/api/admin`)
- `GET /stats`: High-level metrics.
- `GET /posts/pending`: Posts awaiting review.
- `PATCH /posts/:id/review`: Approve (`published`) or reject post.
- `PATCH /users/:id/suspend`: Suspend user account.
- `POST /rewards/reverse`: Deduct points with audit reason.
