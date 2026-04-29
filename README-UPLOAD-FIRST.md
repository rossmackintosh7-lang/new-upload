# PBI Theme-Safe Admin + SEO Patch

This patch fixes the issue where a previous upload changed the whole public website.

## What this patch DOES update

- `/admin/`
- `/seo-agent/`
- `/assets/css/pbi-admin-theme-safe.css`
- `/assets/js/pbi-admin-theme-safe.js`
- SEO Agent JS
- AI/SEO/API Cloudflare Functions
- combined D1 schema file

## What this patch deliberately DOES NOT include

- No `/index.html`
- No homepage replacement
- No logo replacement
- No background image replacement
- No `/examples/` replacement
- No public marketing pages replacement
- No `wrangler.toml` replacement
- No sitemap/robots replacement

## Upload method

Upload/merge the contents of this folder into your existing GitHub repo.
Do not delete your current site files first.

This is a PATCH, not a full replacement build.

## After upload

Test:

```txt
/
/admin/
/seo-agent/
/api/seo/dashboard
```

Your homepage/logo/background should remain exactly as they were before.

## Important

If your live repo currently contains the replacement `public/index.html` from the previous full build, restore your original homepage from GitHub history first, then apply this patch.
