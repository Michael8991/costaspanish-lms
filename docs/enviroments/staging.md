# Staging and Demo Environment

## Purpose

The staging environment is used for:

- Manual QA
- Playwright E2E testing
- Product demonstrations
- Integration validation
- Safe experimentation

## Application

- Git branch: `staging`
- Vercel project: `costaspanish-lms-staging`
- Domain: `demo.costaspanishclass.com`
- App environment: `staging`
- Demo mode: enabled

## External resources

- MongoDB: isolated staging database
- Firebase: isolated staging project and bucket
- Google Cloud: isolated OAuth client
- Google Calendar: dedicated demo calendar

## Data policy

- Only synthetic data is allowed.
- Production exports are forbidden.
- Real student names, emails, notes and documents are forbidden.
- Demo data may be deleted or reset at any time.

## Deployment flow

1. Merge a feature into `staging`.
2. Vercel deploys the staging branch.
3. Run smoke tests.
4. Run Playwright.
5. Review integrations.
6. Merge `staging` into `main`.

## Security

- Never share production secrets.
- Never connect staging to production databases or buckets.
- Never run destructive E2E tests against production.
