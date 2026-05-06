# PBI Google SEO + D1 Console Notes

## Google homepage search title/description

Homepage title now set to:

PBI Website Builder | Free Website Builder - Only Pay When You Publish

Homepage description now set to:

Create a professional small-business website with PBI Website Builder. Build for free, choose a template, edit with AI tools and only pay when you publish your site live.

Google may still rewrite the visible result snippet depending on the search query, and it may take time to recrawl after deployment.

## D1 Console

The Cloudflare D1 Console accepts SQL only.

Do not paste:

```bash
npx wrangler d1 execute <DB_NAME> --file=./migrations/pbi_muscles_nerves_polish.sql --remote
```

That command is for Terminal only.

Inside Cloudflare D1 > Console, open and paste:

```text
migrations/pbi_muscles_nerves_polish_CONSOLE_READY.sql
```

If Cloudflare reports that a column already exists, use:

```text
migrations/pbi_create_tables_only_safe_for_console.sql
```

The Functions also attempt to add missing columns/tables during runtime where possible.
