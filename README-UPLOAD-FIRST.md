# PBI Final Integrated Build

Upload this folder to the `new-upload` GitHub repo and deploy with Cloudflare Pages.

Included:
- AI Website Agent live version
- SEO Agent dashboard at `/seo-agent/`
- Admin navigation at `/admin/`
- Static real-life examples page at `/examples/`
- SEO APIs under `/api/seo/*`
- Scheduled/manual scanner at `/scheduled`
- Combined D1 schema at `/database/pbi-combined-schema.sql`

Cloudflare Pages settings:
- Build command: blank
- Build output directory: `public`
- Root directory: `/`

Run schema:
```bash
npx wrangler d1 execute pbi-db --file=./database/pbi-combined-schema.sql --remote
```

Required vars/secrets:
```txt
OPENAI_API_KEY
OPENAI_MODEL = gpt-4.1-mini
PBI_BASE_URL = https://www.purbeckbusinessinnovations.co.uk
PBI_ADMIN_EMAILS = info@purbeckbusinessinnovations.co.uk,rossmackintosh7@icloud.com
PBI_ADMIN_TOKEN = create-a-long-random-secret
PBI_SEO_PAGES = /,/builder/,/custom-build/,/pricing/,/contact/,/about/,/websites-for-cafes/,/websites-for-consultants/,/websites-for-holiday-lets/,/websites-for-salons/,/websites-for-shops/,/websites-for-tradespeople/
RESEND_API_KEY
CUSTOM_BUILD_NOTIFY_TO = info@purbeckbusinessinnovations.co.uk
CUSTOM_BUILD_NOTIFY_FROM = PBI <enquiry@purbeckbusinessinnovations.co.uk>
```

Test:
- `/`
- `/admin/`
- `/examples/`
- `/demo/agent-dashboard.html`
- `/seo-agent/`
- `/api/seo/dashboard`
- `/scheduled?token=YOUR_TOKEN`

The SEO Agent is approval-based. It stores suggestions and lets you approve/save/reject them, but it does not auto-publish page rewrites.
