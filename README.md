PBI platform auth starter v2

## Domain checker and paid domain registration

The builder checks live domain availability and returns available suggestions. Customers can select a domain in the builder, save the project, then choose **Register a new domain** on the payment page. The saved first-year domain price is added to the first Stripe Checkout payment as a dynamic one-time line item alongside the selected website subscription.

Required Cloudflare env vars:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with Registrar permissions

Required/optional domain payment env vars:

- `DOMAIN_REGISTRATION_CURRENCY` defaults to `GBP`
- `DOMAIN_REGISTRATION_DEFAULT_AMOUNT_MINOR` defaults to `2000` (£20.00 base if Cloudflare pricing is not in your checkout currency)
- `DOMAIN_REGISTRATION_ONE_OFF_HANDLING_AMOUNT_MINOR` defaults to `0` and can be used only if you want an extra one-off setup fee on top of the first-year registration cost
- `DOMAIN_AUTO_REGISTER` defaults to off. Set to `true` only after your Cloudflare Registrar account has billing, default registrant contact, and domain registration agreement set up.
- `DOMAIN_REGISTRATION_AGENT_URL` and `DOMAIN_REGISTRATION_AGENT_TOKEN` can point to a separate registrar automation agent for extensions your Cloudflare Registrar account cannot register programmatically.

Important: when `DOMAIN_AUTO_REGISTER=true`, the Domain Registration Agent will attempt to register the selected domain after successful payment/publish. Successful registrations are billable and normally non-refundable.

## Stripe webhook automation

PBI publishes paid projects and starts the domain registration workflow from the Stripe webhook, not just from the browser success page.

Required Stripe setup:

- Add a Stripe webhook endpoint pointing to `https://www.purbeckbusinessinnovations.co.uk/api/billing/webhook`
- Subscribe it to `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, and `customer.subscription.deleted`
- Add the endpoint signing secret to Cloudflare Pages as `STRIPE_WEBHOOK_SECRET`

The browser payment success page remains as a fallback/status screen, but real provisioning should be driven by the webhook.


## Domain billing env vars

Do not add the yearly domain management price to the initial Checkout Session when the website plan is monthly. Stripe blocks subscription Checkout Sessions that contain recurring prices on different billing intervals. Keep the first-year domain registration charge as a one-time dynamic line item.

- `STRIPE_PRICE_DOMAIN_MANAGEMENT_YEARLY` = optional yearly price for PBI Domain Management Fee (£10/year), for a separate renewal/management flow rather than the initial publish checkout

Optional domain charge settings:

- `DOMAIN_REGISTRATION_DEFAULT_AMOUNT_MINOR` = fallback first-year domain registration amount in pence, default `2000`
- `DOMAIN_REGISTRATION_CURRENCY` = checkout currency, default `GBP`
- `DOMAIN_MANAGEMENT_FEE_AMOUNT_MINOR` = display/tracking amount for annual management fee, default `1000`
- `DOMAIN_REGISTRATION_ONE_OFF_HANDLING_AMOUNT_MINOR` = optional one-off extra setup/handling amount, default `0`

The old `DOMAIN_MARKUP_AMOUNT_MINOR` should no longer be used for checkout. Use the dynamic first-year registrar price for the publish checkout, and keep any yearly management/renewal fee in a separate renewal flow.
