# Test Suite

## Structure

```
tests/
├── setup.ts                 # Sets test DB path (runs before all tests)
├── integration-tests/
│   ├── JobTracker/          # API tests for job tracking (uses x-demo-mode mock)
│   │   ├── jobs.test.ts
│   │   ├── no-apply.test.ts
│   │   └── interview-prep.test.ts
│   └── BlacklistInc/        # API tests for company reviews
│       ├── reviews.test.ts
│       ├── interview-questions.test.ts
│       └── application-experiences.test.ts
└── unit-tests/
    ├── JobTracker/          # Lib/function tests
    │   ├── extract-concepts.test.ts
    │   └── demo-data.test.ts
    └── BlacklistInc/
        ├── demo-reviews-data.test.ts
        └── us-companies.test.ts
```

## Running Tests

```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
```

## CI Pipelines

- **PR Pipeline** (`.github/workflows/pr-pipeline.yml`): Runs on pull requests to `main`. Must pass for merge.
- **Prod Pipeline** (`.github/workflows/prod-pipeline.yml`): Runs on push to `main` (when PR merges). Runs checks then deploy step.

## Branch Protection

To require tests pass before merge, enable branch protection on `main`:
1. Repo Settings → Branches → Add rule for `main`
2. Check "Require status checks to pass" and select `check` from PR Pipeline

## Local Setup

If you see `NODE_MODULE_VERSION` errors with `better-sqlite3`, run:
```bash
npm rebuild better-sqlite3
```
