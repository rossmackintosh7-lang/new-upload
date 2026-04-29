# PBI SEO Max Upgrade Notes

This build adds stronger on-page and technical SEO foundations:

- Unique title and meta description for the homepage, builder, pricing, custom-build, about, contact, examples and industry pages.
- Canonical tags, robots meta, Open Graph tags and Twitter card tags.
- Organization, WebSite, Service, BreadcrumbList and FAQPage JSON-LD where relevant.
- `robots.txt`, `sitemap.xml` and `manifest.json`.
- Real-world image-led example cards with useful alt text.
- Local/industry landing pages for cafés, tradespeople, salons, shops, consultants and holiday lets.
- Internal links between core service pages.
- SEO Agent scan list aligned to the handoff file.
- Improved SEO Agent checks for schema, image alt text and internal links.
- Approval-based SEO suggestion workflow retained.

After deployment:

1. Run the combined D1 schema.
2. Add `PBI_SEO_PAGES` in Cloudflare if you want to override the default scan list.
3. Submit `/sitemap.xml` in Google Search Console.
4. Run `/api/seo/scan` or `/scheduled?token=YOUR_TOKEN`.
5. Review suggestions in `/seo-agent/` before approving changes.

This does not guarantee ranking. It gives PBI a stronger launch structure while avoiding keyword stuffing, doorway pages and reckless auto-publishing.

## Issue-level Fix button

The SEO Agent Open Issues panel now has a **Fix** button for each issue. The button posts the issue ID to `/api/seo/fix-issue`, creates a targeted pending suggestion, and leaves publishing under human approval.
