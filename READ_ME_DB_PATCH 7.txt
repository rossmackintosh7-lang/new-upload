PBI DB PATCH

This tiny patch only replaces wrangler.toml.

Why:
Your actual Cloudflare D1 database is d1-template-database, not pbi-db.

Upload/copy wrangler.toml into the root of your GitHub repo:
new-upload/wrangler.toml

Then run:

npx wrangler d1 execute d1-template-database --file=./database/pbi-combined-schema.sql --remote

Cloudflare Pages settings:
Build command: blank
Build output directory: .
Root directory: /
