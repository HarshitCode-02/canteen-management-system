# CampusBites Phase 2 Test Report

## Baseline before implementation

Branch: `feature/campusbites-phase-2`

Baseline commit: `5f7cf92`

| Command | Result |
|---|---|
| `npm --prefix server test` | Passed: 45 tests, 0 failures |
| `npm --prefix client run lint` | Passed |
| `npm --prefix client run build` | Passed: Vite production bundle built |

These are local baseline checks, not evidence of live deployment behavior. No production database was used.

## Phase 2 implementation checks

Run from the repository root:

| Command | Actual result |
|---|---|
| `npm --prefix server test` | Passed: 67 tests, 0 failures |
| `npm --prefix client run lint` | Passed: ESLint completed with no errors |
| `npm --prefix client run build` | Passed: Vite production build completed; scanner remains a separate lazy-loaded chunk |

Dependency audit commands:

| Command | Actual result |
|---|---|
| `npm audit --prefix client` | Exit 1: 6 moderate development-tool advisories through `minimatch`/ESLint; audit reports no fix available |
| `npm audit --prefix server` | Exit 1: 2 moderate development-tool advisories through `minimatch`/`nodemon`; npm suggests a breaking forced change |
| `npm audit --prefix client --omit=dev` | Passed: 0 production vulnerabilities |
| `npm audit --prefix server --omit=dev` | Passed: 0 production vulnerabilities |

No automatic or forced dependency updates were run.

The backend tests use stubs and do not connect to MongoDB. These checks do not prove transaction behavior on Atlas, the review unique index on existing data, the live Vercel deployment, external scheduler operation, camera scanning, or offline behavior on a phone.

## Not covered by baseline tests

- Frontend component or browser end-to-end behavior.
- MongoDB-backed integration and transaction behavior using a disposable replica set.
- Physical Android Chrome or iOS Safari camera, install, safe-area, and keyboard behavior.
- Frontend component tests; no client test runner is configured.
- Live Vercel configuration, scheduler calls, Atlas backups, or production smoke checks.
