# CampusBites test results

## Latest local verification

| Check | Result | Evidence/limitations |
|---|---|---|
| Client lint | PASS | `npm --prefix client run lint` |
| Client production build | PASS | `npm --prefix client run build` |
| Client unit tests | PASS — 4 passed | `npm --prefix client test`; tests classify API/network errors |
| Focused backend tests | PASS — 11 passed | Error handling, canteen-logo URL validation, and smart-tool tests |
| Backend full suite | PARTIAL — 69 passed, 6 blocked | `npm --prefix server test`; six listener-dependent tests could not bind to `0.0.0.0` because the sandbox denied `listen` with `EPERM` |
| Browser mobile viewport inspection | NOT VERIFIED | Browser checks were unavailable; the local development server could not bind in the sandbox |
| MongoDB transaction/concurrency | NOT VERIFIED | Controller tests use mocks; no disposable replica-set test database was exercised |
| Production order latency | NOT VERIFIED | No production telemetry was available |

Do not treat a frontend build, mocked backend test, or repository audit as a live deployment or production database test. Run `npm --prefix server test` in CI or a normal development environment to exercise listener-dependent tests.

## Dependency audit notes

Earlier audits reported zero vulnerabilities in production-only dependencies. Full development dependency audits reported moderate advisories in the client ESLint tooling and server `nodemon` dependency tree. Those audits were not rerun as part of the latest UI/error-handling verification; no dependency update was applied here.
