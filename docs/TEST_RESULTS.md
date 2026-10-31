# CampusBites test results

**Run date:** 2026-10-31

| Check | Result | Evidence/limitations |
|---|---|---|
| Focused backend tests | PASS — 30 passed, 0 failed | Origin, checkout/idempotency, order validation, collection, QR, no-show, slots, and error-handler test files |
| Frontend lint | PASS | `npm --prefix client run lint` |
| Frontend production build | PASS | `npm --prefix client run build`; Vite completed successfully |
| Backend JavaScript syntax | PASS | `find server ... '*.js' ... node --check` |
| Diff whitespace | PASS | `git diff --check` |
| Backend full suite | NOT VERIFIED | Attempted `npm --prefix server test`; listener-dependent tests received `listen EPERM` when binding `0.0.0.0`. |
| Frontend component/browser tests | NOT CONFIGURED | No frontend test script or browser test configuration is tracked. |
| Browser mobile viewport inspection | NOT VERIFIED | Local Vite server could not bind `127.0.0.1:5173` (`EPERM`). |
| MongoDB transaction/concurrency | NOT VERIFIED | Controller tests use mocks; no disposable replica-set test database was exercised. |
| Production order latency | NOT VERIFIED | Timing instrumentation is present, but no production telemetry was available. |
| Production dependency audit | PASS | `npm audit --omit=dev` in both packages reported 0 vulnerabilities. This excludes development dependencies. |
| Full server dependency audit | WARN | Two moderate `minimatch` advisories via development dependency `nodemon`; npm's forced fix proposes a breaking version. No update was applied. |
| Full client dependency audit | WARN | Six moderate `minimatch` advisories through ESLint tooling; npm reports no fix. No update was applied. |

Do not treat a frontend build, mocked backend test, or repository audit as a live deployment or production database test.
