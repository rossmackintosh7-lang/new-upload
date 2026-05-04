PBI ADMIN SUBDOMAIN SETUP

Do you need a new domain?
No. admin.purbeckbusinessinnovations.co.uk is a subdomain of purbeckbusinessinnovations.co.uk.

Recommended now:
- Keep the same Cloudflare Pages project.
- Add admin.purbeckbusinessinnovations.co.uk as a custom domain in Workers & Pages → new-upload → Custom domains.
- Keep /admin/ protected with PBI_ADMIN_EMAILS and PBI_ADMIN_TOKEN.
- Later, if PBI grows, move admin to a separate Pages project and protect it with Cloudflare Access/Zero Trust.

If Cloudflare asks for DNS:
- Type: CNAME
- Name: admin
- Target: new-upload-3ty.pages.dev
- Proxy: Proxied
