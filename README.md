# EventForge

A campus hackathon platform built with Next.js and AWS Lambda. Neobrutalist UI, public discovery, accounts, team registration, project submissions, organizer team management, a builder feed, account bookmarks, and a browser toolkit.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Without AWS environment variables, development runs the same backend service against `.data/eventforge.json`. This is a local development store, not a production database. Sample hackathons are explicitly labeled and start with zero teams. Create an account, register a team, submit a project, or host a new hackathon. The demo uses phone-number identities with any nonempty OTP; no SMS is sent.

## Signed-in experience

Successful phone login and account switching always open `/dashboard`. Signed-in visits to `/` also redirect there, and the wordmark links directly to the dashboard. The dashboard combines account details, real registration/submission/bookmark counts, builds, recommended events, community posts, upcoming registered events, and organizer shortcuts. Detailed teams and submissions live at `/dashboard/builds`.

The wordmark is **EventForge**. Seeded dummy event listings are displayed without “Sample event” badges. OTP input uses four visual slots, accepts exactly four digits in the browser, and supports paste and autofill. It makes no SMS-delivery claims.

## Demo phone access

Click **Log in** and enter a 7–15 digit phone number. The login UI does not display preset accounts. A new number must enter a name before the OTP step. Registered numbers skip the name step and keep their existing name. Enter a four-digit OTP; no SMS is sent and the phone is not verified.

Each number has a separate persistent account. **Switch account** opens the phone form without erasing the current account’s data. Returning to a number restores its teams, saved events, and feed identity. Multiple browser sessions can coexist; signing out revokes only that session.

This bypass is deliberately limited to `DEMO_AUTH_ENABLED=true` on the backend. The current demo deployment enables it. CloudFormation defaults to `false`; the deploy script reads the explicit setting from `.env.local` or the shell. Turning it off blocks demo sign-in and stops existing demo sessions from authenticating. Local browser tests enable it only for their test server.

Anyone knowing a demo number can access that demo identity. Use made-up numbers and sample data. This is not SMS authentication and is not suitable for private accounts. Legacy email/password endpoints remain compatible with older accounts, but the UI has no email/password form.

## Pages and extras

| Route               | Page                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `/`                 | Home, featured builds, community shortcuts                                   |
| `/hackathons`       | Search, track/format filters, sorting                                        |
| `/hackathons/:id`   | Full brief, team registration, bookmark, share, calendar download            |
| `/dashboard`        | Personal dashboard, metrics, recommendations, feed, and quick access         |
| `/dashboard/builds` | Registered teams and project submissions                                     |
| `/organize`         | Hosted hackathons and team/submission review                                 |
| `/feed`             | Build logs, team-up posts, questions, and hackathon humour                   |
| `/saved`            | Private bookmarks that sync across devices                                   |
| `/toolkit`          | Focus timer, team-name generator, persistent launch checklist, pitch outline |

Each is a Next.js route: direct links, refresh, and browser back/forward work. The old `/?event=...` share URLs redirect to the new event pages. Navigation uses a shared layout and account provider; page content lives in `components/pages/`.

The feed starts with six clearly labeled fictional sample posts. Signed-in builders can publish posts, add/remove a fire reaction, and reply. Author names come from the account on the server. Reactions are idempotent per account. Posts and replies have account rate limits. New posts and comments are public. The focus timer runs while the Toolkit page is open; the checklist is stored in this browser. Sample hackathons now include game development and fintech.

## Architecture

```text
Browser
  └─ Vercel / Next.js
       ├─ Responsive React interface
       └─ /api/* (same-origin proxy; HttpOnly session cookie)
            └─ API Gateway HTTP API (rate limits)
                 └─ AWS Lambda / Node.js 22
                      └─ DynamoDB (on-demand, TTL, point-in-time recovery)
```

The Lambda API key stays in the server environment. Browsers never receive it. Legacy email passwords use salted scrypt hashes. Demo phone identities deliberately bypass OTP verification when enabled. Session tokens are randomly generated; only token hashes are stored, with a seven-day TTL. Production cookies use HttpOnly, Secure, and SameSite=Lax. Signout invalidates the server session. Event ownership is checked on the backend. Registration and capacity-slot claims use an atomic DynamoDB transaction. Links accept only HTTP(S). No public CORS access is configured.

The Vercel production app deliberately returns an explicit configuration error without a Lambda backend. It never silently falls back to ephemeral filesystem storage.

## Deploy AWS

```sh
aws login
npm run deploy:aws
```

The deployment script checks credentials first, bundles the function, uploads a content-addressed ZIP to a private S3 bucket, and creates/updates the `eventforge-campus` CloudFormation stack. Resources: Lambda, HTTP API, DynamoDB, least-privilege IAM role, and 14-day CloudWatch logs. DynamoDB is retained if the stack is deleted. Account and region come from AWS CLI; override with `AWS_REGION` and `EVENTFORGE_STACK` if needed. The S3 artifact bucket remains available for subsequent deployments.

On success the script saves `LAMBDA_API_URL` and `LAMBDA_API_KEY` to gitignored `.env.local` with owner-only permissions. It does not print secrets. Keep this file when updating the stack so its API key is reused.

## Connect the existing Vercel project

1. Set the project's Node.js version to 22 or newer, framework to Next.js, and build command to `npm run build`.
2. Add `LAMBDA_API_KEY` from `.env.local` to Vercel's server-side environment variables for each environment you intend to use. The API URL is hardcoded as the default; set `LAMBDA_API_URL` to override it. An explicitly empty URL keeps the local development backend enabled.
3. Deploy this repository to the existing Vercel project. Do not prefix either variable with `NEXT_PUBLIC_`.
4. Check `/api/workspace`, choose a demo phone identity, register a team, and verify the registration from another session/device.

AWS is deployed in `us-east-1` with stack `eventforge-campus`.

API endpoint: `https://qeibhvgse3.execute-api.us-east-1.amazonaws.com` (server API key required).

Verified live: public listing through the proxy, demo phone sessions, first-time names, returning identities, secure HttpOnly cookies, session persistence, event creation, registration, duplicate prevention, submissions, organizer permissions, signout, private bookmarks, feed posts, idempotent reactions, and comments. Temporary smoke-test records were deleted. Run `python3 scripts/smoke-aws.py` to repeat the live API check with automatic test-record cleanup. Vercel deployment is intentionally left to the existing project owner; this checkout has no connection to that Vercel project.

## Verification

```sh
npm run typecheck
npm test
npm run build:backend
npm run build
npx playwright install chromium
npm run test:e2e
```

Backend integration tests isolate their filesystem data in a temporary directory. Stop any running dev server before browser tests. Playwright starts its own server with Lambda variables explicitly unset, then creates test accounts and a test hackathon in the local development database. Remove `.data/` while the dev server is stopped to clear local data.

## API

| Method | Path                       | Purpose                                                    |
| ------ | -------------------------- | ---------------------------------------------------------- |
| GET    | `/workspace`               | Public events, current account, own registrations          |
| POST   | `/auth/signup`             | Create account and session                                 |
| POST   | `/auth/signin`             | Validate password and issue session                        |
| POST   | `/auth/demo-phone/check`   | Check whether a demo number is registered                  |
| POST   | `/auth/demo-phone`         | Create/return to demo phone identity with any nonempty OTP |
| POST   | `/auth/signout`            | Invalidate session                                         |
| POST   | `/events`                  | Publish hackathon                                          |
| POST   | `/events/:id/register`     | Register a team, atomically claim capacity                 |
| POST   | `/events/:id/submission`   | Create/update own project submission                       |
| GET    | `/events/:id/participants` | Organizer-only teams and submissions                       |
| POST   | `/events/:id/bookmark`     | Set own saved state                                        |
| GET    | `/feed`                    | Public posts, reaction totals, and replies                 |
| POST   | `/feed`                    | Publish a community post                                   |
| POST   | `/feed/:id/reaction`       | Set own reaction state                                     |
| POST   | `/feed/:id/comments`       | Add a reply                                                |

Browser requests use `/api` before these paths. Lambda receives the paths directly.

## Scope and limits

This is an elective-project implementation, not a full Unstop replacement. It has no payment processing, email delivery/verification, password reset, teammate invitations, judging, or certificate issuance. Team members are names supplied by the team captain, not separate authenticated memberships. Organizers can publish events and review teams/submissions; editing/cancelling published events is not implemented. The old fake leaderboard and certificate screen were removed.

DynamoDB scans keep this small project simple; introduce secondary indexes and pagination before a large deployment. API Gateway applies global request throttling, and authentication is limited to ten attempts per email per 15 minutes. Add per-IP protection and recovery/verification emails before broad public promotion. The development file store supports one Node.js process. The deployed AWS backend has passed the live smoke test.
