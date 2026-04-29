Paste this into PBI 2:

We now have a new deployable live-version folder called `pbi-ai-agent-live-version`.

Please integrate or deploy it as the live PBI Website Assistant version.

It includes:
- public/index.html
- public/demo/agent-dashboard.html
- public/assets/css/pbi-ai-agent.css
- public/assets/js/pbi-ai-agent-live.js
- functions/api/_lib/http.js
- functions/api/_lib/openai.js
- functions/api/_lib/schemas.js
- functions/api/agent/generate-website.js
- functions/api/agent/improve-section.js
- functions/api/agent/seo-plan.js
- functions/api/agent/chat.js
- functions/api/projects/save-draft.js
- functions/api/projects/get-draft.js
- functions/api/enquiries/custom-build.js
- database/pbi-ai-agent-live-schema.sql
- wrangler.toml
- README.md

Expected Cloudflare settings:
Build command: blank
Build output directory: public

Required environment variables:
OPENAI_API_KEY as encrypted secret
OPENAI_MODEL = gpt-4.1-mini

Expected D1 binding:
DB

Required database schema:
database/pbi-ai-agent-live-schema.sql

Main test page after deploy:
/demo/agent-dashboard.html

Do not replace existing PBI 2 auth/payment/dashboard logic blindly. Merge the live dashboard components and endpoints cleanly.
