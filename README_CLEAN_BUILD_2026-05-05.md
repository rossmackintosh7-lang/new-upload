# PBI Clean Full Build - 2026-05-05

This folder is a cleaned, deploy-ready PBI build created from the uploaded `new-upload.zip` and the 2026-05-05 chat handoff.

## Included changes

- Removed obvious duplicate clutter, patch folders, numbered copies, `.git`, and old checklist noise.
- Added a premium-style customer dashboard with a visible **PREMIUM** navigation rail.
- Added admin access from the dashboard for approved admin accounts.
- Added `/api/auth/me` so the dashboard can detect `PBI_ADMIN_EMAILS`, including `rossmackintosh7@icloud.com`.
- Combined `/templates/` and `/examples/` into a single smoother template journey. `/examples/` now redirects to `/templates/` while individual demo pages remain available.
- Added `/projects/` with real project loading from `/api/projects/list` and a useful empty state.
- Re-routed `/builder/` into the unified `/canvas-builder/` experience.
- Added package-gated canvas controls: Starter is guided; Business unlocks advanced canvas controls; Plus unlocks CMS/collaboration-style panels.
- Added an admin landing/login button at `/admin/`, suitable for `https://admin.purbeckbusinessinnovations.co.uk/admin/`.

## Cloudflare notes

Deploy the folder contents to the existing Cloudflare Pages project. Keep secrets such as `STRIPE_SECRET_KEY` in Cloudflare secrets, not in files.

## Required D1 table patch

Run `database/pbi-user-manager-billing.sql` if it has not already been run.
