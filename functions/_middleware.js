const SEO_HOME_SECTION = `
<section class="section pbi-google-seo-section" id="google-seo-ready">
  <div class="container two-column">
    <div class="card readable-card">
      <p class="eyebrow">Google SEO ready</p>
      <h2>Free website builder for small businesses, only pay when you publish.</h2>
      <p>PBI Website Builder helps cafés, trades, salons, shops, consultants, holiday lets and local service businesses create a professional website with AI-assisted setup, editable templates, mobile preview, launch checks and optional custom build support.</p>
      <p>Every PBI site is built around clear page structure, helpful wording, internal links, image alt text prompts, launch readiness checks, sitemap support and search-friendly page titles and descriptions.</p>
      <div class="hero-actions">
        <a class="btn" href="/onboarding/">Start building for free</a>
        <a class="btn-ghost" href="/google-seo/">How PBI helps Google understand your website</a>
      </div>
    </div>
    <div class="card readable-card">
      <p class="eyebrow">Built for crawling</p>
      <h2>Designed to help Google find, understand and index your pages.</h2>
      <ul>
        <li>Automatic sitemap and robots.txt support.</li>
        <li>Clear internal links between templates, pricing, help, contact and custom build pages.</li>
        <li>SEO titles, descriptions and Open Graph previews for stronger search snippets.</li>
        <li>Structured data for the PBI Website Builder application and business information.</li>
        <li>Google Search Console friendly launch checklist for indexing and ongoing improvements.</li>
      </ul>
      <p class="muted small-note">No website builder can guarantee a number-one Google ranking, but PBI is structured to give small-business websites a cleaner crawl path and stronger SEO starting point.</p>
    </div>
  </div>
</section>`;

const SEO_JSON_LD = `
<script type="application/ld+json" id="pbi-seo-home-schema">
{
  "@context":"https://schema.org",
  "@graph":[
    {
      "@type":"WebSite",
      "name":"PBI Website Builder",
      "url":"https://www.purbeckbusinessinnovations.co.uk/",
      "description":"Free small-business website builder. Build for free and only pay when you publish.",
      "publisher":{"@id":"https://www.purbeckbusinessinnovations.co.uk/#organization"},
      "potentialAction":{
        "@type":"SearchAction",
        "target":"https://www.purbeckbusinessinnovations.co.uk/templates/?q={search_term_string}",
        "query-input":"required name=search_term_string"
      }
    },
    {
      "@type":"Organization",
      "@id":"https://www.purbeckbusinessinnovations.co.uk/#organization",
      "name":"Purbeck Business Innovations",
      "url":"https://www.purbeckbusinessinnovations.co.uk/",
      "logo":"https://www.purbeckbusinessinnovations.co.uk/assets/pbi-brand-logo-20260505.png"
    },
    {
      "@type":"FAQPage",
      "mainEntity":[
        {"@type":"Question","name":"Is PBI a free website builder?","acceptedAnswer":{"@type":"Answer","text":"You can start building for free with PBI. Payment is only required when you choose to publish your website live."}},
        {"@type":"Question","name":"Can PBI help small businesses with Google SEO?","acceptedAnswer":{"@type":"Answer","text":"PBI includes search-friendly page structure, metadata, sitemap support, internal links and launch checks to help Google understand and index your website."}},
        {"@type":"Question","name":"Can I request a custom website build?","acceptedAnswer":{"@type":"Answer","text":"Yes. PBI includes a custom build request route for businesses that want hands-on website setup, design and launch support."}}
      ]
    }
  ]
}
</script>`;

const SECRET_AGENT_SCRIPT = '<script src="/assets/pbi-secret-agent.js?v=20260508-launch-qa" defer></script>';

function shouldLoadSecretAgent(pathname) {
  return pathname.startsWith('/dashboard/') || pathname.startsWith('/admin/') || pathname.startsWith('/projects/') || pathname.startsWith('/canvas-builder/');
}

export async function onRequest(context) {
  const response = await context.next();
  const url = new URL(context.request.url);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();
  if (url.pathname === '/' && !html.includes('id="google-seo-ready"')) {
    html = html.replace('</main>', `${SEO_HOME_SECTION}\n</main>`);
  }
  if (url.pathname === '/' && !html.includes('id="pbi-seo-home-schema"')) {
    html = html.replace('</head>', `${SEO_JSON_LD}\n</head>`);
  }
  if (shouldLoadSecretAgent(url.pathname) && !html.includes('/assets/pbi-secret-agent.js')) {
    html = html.replace('</body>', `${SECRET_AGENT_SCRIPT}\n</body>`);
  }

  const headers = new Headers(response.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}
