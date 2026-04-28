PBI platform auth starter v2

## Domain checker and paid domain registration

The builder now checks live domain availability through Cloudflare Registrar and returns available suggestions. Customers can select an available domain in the builder, save the project, then choose **Register a new domain** on the payment page. The domain registration fee is added to the first Stripe Checkout payment as a one-time line item.

Required Cloudflare env vars:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with Registrar permissions

Required/optional domain payment env vars:

- `DOMAIN_REGISTRATION_CURRENCY` defaults to `GBP`
- `DOMAIN_REGISTRATION_DEFAULT_AMOUNT_MINOR` defaults to `2000` (£20.00 base if Cloudflare pricing is not in your checkout currency)
- `DOMAIN_MARKUP_AMOUNT_MINOR` defaults to `1000` (£10.00 PBI handling fee)
- `DOMAIN_AUTO_REGISTER` defaults to off. Set to `true` only after your Cloudflare Registrar account has billing, default registrant contact, and domain registration agreement set up.

Important: when `DOMAIN_AUTO_REGISTER=true`, the Stripe webhook will attempt to register the selected domain after successful payment. Successful registrations are billable and normally non-refundable.
