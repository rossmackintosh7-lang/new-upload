# PBI Builder + Pricing Update

This is a Cloudflare Pages-ready static build for Purbeck Business Innovations.

## What this update fixes

- All pricing packages are shown clearly.
- The Assisted Setup Launch Offer is still included, but no longer looks like the only option.
- Pricing cards use consistent button spacing.
- Template selection, image upload, page editing, advanced editing and preview now sit inside one combined "Build Your Website" section.
- Template choices, uploads and editor changes update the same live preview.
- Logo, hero image and gallery image uploads are included.
- The pricing shortcut inside the builder links to the full pricing section.
- Stripe checkout has an optional Cloudflare Pages Function at `/api/checkout`.

## Upload to Cloudflare Pages

1. Unzip this folder.
2. Push the contents to your GitHub repository, or upload directly through Cloudflare Pages.
3. In Cloudflare Pages, set:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `/`
4. Deploy.

## Optional Stripe environment variables

Add these in Cloudflare Pages > Settings > Environment Variables:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER_SITE`
- `STRIPE_PRICE_BUSINESS_SITE`
- `STRIPE_PRICE_GROWTH_SITE`
- `STRIPE_PRICE_ASSISTED_SETUP`
- `STRIPE_PRICE_DOMAIN_MANAGEMENT_YEARLY`

The checkout function maps each pricing button to the matching price variable.

## Where to edit pricing text

Open:

`assets/app.js`

Find the `packages` object near the top. You can change names, prices, descriptions and feature lists there.

## Where to edit template wording

Open:

`assets/app.js`

Find the `templates` object near the top.

## Important note

This build was recreated from the available PBI 3 context because the original chat would not load. It is designed as a clean continuation point and avoids the broken/missing import problems from earlier builds.
