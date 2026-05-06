# PBI Muscles, Nerves & Polish Patch

This build keeps the current layout but adds the infrastructure needed to make PBI behave more like a real website platform.

## Added

- Hard package rules on frontend and backend
- Package enforcement on save, checkout and publish
- Plus/Business feature locking after downgrade
- Starter-safe conversion for freeform blocks
- Pre-publish checklist
- Readiness score
- Undo/redo
- Local version history
- Direct inline text editing
- Device preview controls
- Layers reorder/delete/select
- Template loading
- CMS save/list endpoints
- Lead capture/list/update endpoints
- SEO scan/apply endpoints
- Analytics track/summary endpoints
- Retail product endpoint
- Project create/duplicate/delete/unpublish/version endpoints
- Stripe plan-to-price mapping:
  - Starter: STRIPE_PRICE_STARTER
  - Business: STRIPE_PRICE_BUSINESS
  - Plus: STRIPE_PRICE_PLUS

## D1 migration

Run:

```bash
npx wrangler d1 execute <DB_NAME> --file=./migrations/pbi_muscles_nerves_polish.sql --remote
```

The Functions also attempt to create missing tables/columns where possible, but running the migration is cleaner.
