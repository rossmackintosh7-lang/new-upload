# PBI Crash Test Mode

This build includes a safe payment bypass for end-to-end testing.

## Cloudflare environment variables

Add either of these to your Pages project:

```txt
PBI_CRASH_TEST_MODE = true
```

or:

```txt
PBI_BYPASS_PAYMENT = true
PBI_BYPASS_TURNSTILE = true
```

Recommended for full start-to-finish testing:

```txt
PBI_CRASH_TEST_MODE = true
```

## What it does

- Signup can bypass Turnstile validation.
- Stripe checkout is bypassed.
- The selected project is marked as active.
- The publish process completes and creates a live preview route like:

```txt
/site/your-business/
```

- The publish response also displays a fake dev-style label:

```txt
https://your-business.fake.dev
```

## Important

Turn this off before going live with real customers:

```txt
PBI_CRASH_TEST_MODE = false
PBI_BYPASS_PAYMENT = false
PBI_BYPASS_TURNSTILE = false
```

Crash test mode does not create real Stripe payments, real subscriptions, or real domain registrations.
