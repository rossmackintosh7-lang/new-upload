PBI ADMIN SUBDOMAIN FIX

Problem:
Opening admin.purbeckbusinessinnovations.co.uk showed the public homepage because the subdomain was pointed at the same Pages project root.

Fix in this build:
- functions/_middleware.js now redirects:
  https://admin.purbeckbusinessinnovations.co.uk/
  to:
  https://admin.purbeckbusinessinnovations.co.uk/admin/

Also added a browser fallback in index.html.

Test after deployment:
1. Open:
   https://admin.purbeckbusinessinnovations.co.uk
2. It should automatically become:
   https://admin.purbeckbusinessinnovations.co.uk/admin/
3. You should see PBI Admin Command Centre.

Direct admin URL:
- https://www.purbeckbusinessinnovations.co.uk/admin/
- https://admin.purbeckbusinessinnovations.co.uk/admin/

If the public homepage still shows:
- Purge Cloudflare cache.
- Check latest deployment is successful.
- Make sure admin.purbeckbusinessinnovations.co.uk is attached to the same Pages project.
