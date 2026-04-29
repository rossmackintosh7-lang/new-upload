# PBI AI Agent Live Version

Deployable live-version folder for the PBI Website Assistant.

## Included

- Public landing page: `/`
- Live dashboard demo: `/demo/agent-dashboard.html`
- Cloudflare Pages Functions:
  - `POST /api/agent/generate-website`
  - `POST /api/agent/improve-section`
  - `POST /api/agent/seo-plan`
  - `POST /api/agent/chat`
  - `POST /api/projects/save-draft`
  - `GET /api/projects/get-draft?id=PROJECT_ID`
  - `POST /api/enquiries/custom-build`
- CSS and JS for the live dashboard
- D1 schema
- Wrangler config

## Cloudflare Pages settings

Build command: blank
Build output directory: `public`

## Required Variables

- `OPENAI_API_KEY` as encrypted secret
- `OPENAI_MODEL` as normal variable, suggested `gpt-4.1-mini`

## D1

Create/connect a D1 database and bind it as `DB`.

Run:

```txt
database/pbi-ai-agent-live-schema.sql
```

## Test

Open:

```txt
/demo/agent-dashboard.html
```
