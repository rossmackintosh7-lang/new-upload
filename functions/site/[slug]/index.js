import { sendEmail } from '../../_lib/email.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}

function parseJson(value, fallback = {}) {
  try {
    if (!value) return fallback;
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

function normaliseTemplate(value) {
  const legacyMap = { fashion: 'retail', restaurant: 'hospitality', calm: 'studio', tech: 'event', minimal: 'studio' };
  const validTemplates = ['service', 'hospitality', 'retail', 'studio', 'event'];
  if (validTemplates.includes(value)) return value;
  return legacyMap[value] || 'service';
}

function normaliseRetail(data) {
  const products = Array.isArray(data.retail_products) ? data.retail_products : [];
  return {
    enabled: Boolean(data.retail_enabled || data.template === 'retail' || products.length),
    currency: String(data.retail_currency || 'gbp').toLowerCase(),
    taxEnabled: Boolean(data.retail_tax_enabled),
    shippingLabel: data.retail_shipping_label || 'UK standard delivery',
    shippingAmount: data.retail_shipping_amount || '0',
    products: products
      .filter((product) => product && product.active !== false && String(product.name || '').trim())
      .slice(0, 10)
      .map((product, index) => ({
        id: product.id || `product_${index + 1}`,
        name: String(product.name || `Product ${index + 1}`).trim(),
        description: String(product.description || '').trim(),
        price: String(product.price || '0').trim(),
        stock: Number(product.stock ?? 0),
        sku: String(product.sku || '').trim(),
        image: String(product.image || '').trim(),
        stripe_price_id: String(product.stripe_price_id || '').trim(),
        payment_url: String(product.payment_url || '').trim(),
        track_stock: product.track_stock !== false
      }))
  };
}

function formatMoney(value, currency = 'gbp') {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

export async function onRequestGet({ params, env }) {
  const slug = String(params.slug || '').trim();
  if (!slug) return new Response('Site not found.', { status: 404 });

  const project = await env.DB
    .prepare(`SELECT * FROM projects WHERE public_slug = ? AND published = 1 LIMIT 1`)
    .bind(slug)
    .first();

  if (!project) return new Response('This website is not published yet.', { status: 404 });

  const data = parseJson(project.data_json, {});

  return new Response(renderSite(project, data, slug), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' }
  });
}

function renderSite(project, data, slug) {
  const businessName = data.business_name || project.name || 'Website';
  const pages = data.pages || {};
  const retail = normaliseRetail(data);

  let selectedPages = Array.isArray(data.selected_pages) && data.selected_pages.length
    ? Array.from(new Set(['home', ...data.selected_pages]))
    : ['home', 'about', 'services', 'contact'];

  if (retail.enabled && retail.products.length && !selectedPages.includes('shop')) {
    selectedPages = [...selectedPages.slice(0, 1), 'shop', ...selectedPages.slice(1)];
  }

  const template = normaliseTemplate(data.template || 'service');
  const accent = data.accent_color || '#256b5b';
  const background = data.background_color || '#f5f1e9';
  const text = data.text_color || '#19231f';
  const button = data.button_color || accent;
  const buttonText = data.button_text_color || '#ffffff';

  const pageNav = selectedPages.map((key) => {
    const page = pages[key] || {};
    const label = page.label || (key === 'shop' ? 'Shop' : key.charAt(0).toUpperCase() + key.slice(1));
    return `<a href="#${escapeAttr(key)}">${escapeHtml(label)}</a>`;
  }).join('');

  const sections = selectedPages.map((key) => {
    if (key === 'home') return '';
    if (key === 'shop') return renderRetailShopSection(retail, businessName, slug);

    const page = pages[key] || {};
    const title = page.title || key;
    const body = page.body || '';

    if (key === 'gallery') {
      const images = Array.isArray(data.gallery_images) ? data.gallery_images : [];
      return `<section id="${escapeAttr(key)}" class="published-section published-gallery-section"><h2>${escapeHtml(title || 'Gallery')}</h2><p>${escapeHtml(body || '')}</p><div class="published-gallery">${images.length ? images.map((image) => `<img src="${escapeAttr(image)}" alt="${escapeAttr(businessName)} gallery image">`).join('') : '<div class="published-empty-gallery">No gallery images have been added yet.</div>'}</div></section>`;
    }

    return `<section id="${escapeAttr(key)}" class="published-section"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`;
  }).join('');

  const logo = data.logo_data_url ? `<img class="published-logo-img" src="${escapeAttr(data.logo_data_url)}" alt="${escapeAttr(businessName)} logo">` : `<span class="published-logo-dot"></span>`;
  const home = pages.home || {};
  const heroTitle = data.page_main_heading || home.title || businessName;
  const heroBody = data.sub_heading || home.body || '';
  const cta = buildCta(data);
  const galleryImages = Array.isArray(data.gallery_images) ? data.gallery_images : [];
  const firstImage = galleryImages.length ? galleryImages[0] : (retail.products[0]?.image || '');
  const bgImage = data.background_image_data_url || '';

  const templateHero = { service: renderServiceHero, hospitality: renderHospitalityHero, retail: renderRetailHero, studio: renderStudioHero, event: renderEventHero }[template] || renderServiceHero;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(businessName)}</title><style>${publishedStyles()}</style></head><body class="template-${escapeAttr(template)}" style="--accent:${escapeAttr(accent)};--background:${escapeAttr(background)};--text:${escapeAttr(text)};--button:${escapeAttr(button)};--buttonText:${escapeAttr(buttonText)}"><div class="published-wrap">${template === 'retail' ? '<div class="retail-topline">New arrivals • Local favourites • Shop small</div>' : ''}<header><div class="brand">${logo}<span>${escapeHtml(businessName)}</span></div><nav>${pageNav}</nav></header>${templateHero({ businessName, heroTitle, heroBody, accent, firstImage, bgImage, logo, cta, retail })}<main>${renderRetailStatusNotice()}${sections}${renderContactForm(businessName)}</main><footer>© ${escapeHtml(businessName)} • Built with PBI</footer></div>${retail.enabled ? retailCartScript(slug, retail) : ''}</body></html>`;
}

function publishedStyles() {
  return `:root{--accent:#256b5b;--background:#f5f1e9;--text:#19231f;--button:#256b5b;--buttonText:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-height:100vh;font-family:Inter,Arial,sans-serif;color:var(--text);background:var(--background)}a{color:inherit}.published-wrap{min-height:100vh;overflow:hidden}header{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:28px 0;display:flex;justify-content:space-between;gap:22px;align-items:center}.brand{display:flex;gap:12px;align-items:center;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.published-logo-img{width:58px;height:58px;object-fit:contain}.published-logo-dot{width:48px;height:48px;border-radius:16px;background:var(--accent);display:inline-block}nav{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}nav a{text-decoration:none;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.22);border:1px solid rgba(127,127,127,.16);font-weight:850;font-size:14px}.cta,.published-shop-button{display:inline-flex;margin-top:18px;padding:14px 22px;border-radius:999px;color:var(--buttonText);background:var(--button);text-decoration:none;font-weight:950;border:0;cursor:pointer}.hero{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:70px 0 72px}.kicker{display:inline-flex;margin-bottom:18px;color:var(--accent);font-weight:950;letter-spacing:.18em;text-transform:uppercase;font-size:12px}h1{margin:0;max-width:900px;font-size:clamp(48px,8vw,96px);line-height:.9;letter-spacing:-.07em}.hero p{max-width:690px;font-size:20px;line-height:1.5;color:color-mix(in srgb,var(--text) 76%,transparent)}main{width:min(1180px,calc(100% - 32px));margin:0 auto;display:grid;gap:22px;padding-bottom:70px}.published-section{padding:40px;border-radius:28px;background:rgba(255,255,255,.56);border:1px solid rgba(127,127,127,.16);backdrop-filter:blur(10px)}.published-section h2{margin:0 0 14px;font-size:clamp(32px,4vw,58px);letter-spacing:-.05em;line-height:.96}.published-section p{max-width:760px;font-size:18px;line-height:1.6}.published-gallery,.published-products-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:22px}.published-gallery img,.published-product-card img{width:100%;aspect-ratio:1/.78;object-fit:cover;border-radius:18px}.published-empty-gallery{grid-column:1/-1;padding:24px;border:1px dashed rgba(127,127,127,.3);border-radius:18px}.published-contact-form{display:grid;gap:14px;margin-top:20px;max-width:760px}.published-contact-form input,.published-contact-form textarea{width:100%;border:1px solid rgba(127,127,127,.22);border-radius:16px;padding:14px 16px;font:inherit;background:rgba(255,255,255,.78);color:var(--text)}.published-contact-form textarea{min-height:120px;resize:vertical}.published-form-note,.muted{font-size:14px;color:color-mix(in srgb,var(--text) 64%,transparent)}footer{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:26px 0 44px;font-weight:850;color:color-mix(in srgb,var(--text) 64%,transparent)}body.template-service{background:radial-gradient(circle at top right,color-mix(in srgb,var(--accent) 18%,transparent),transparent 36%),linear-gradient(135deg,var(--background),#fff)}body.template-service .hero{display:grid;grid-template-columns:1fr 310px;gap:36px;align-items:stretch}.service-panel{padding:28px;border-radius:30px;color:#fff;background:var(--accent);box-shadow:0 28px 80px rgba(0,0,0,.12)}.service-panel h2{margin:0;font-size:30px}.service-panel ul{padding:0;margin:16px 0 0;list-style:none;display:grid;gap:12px;font-weight:850}.service-panel li{position:relative;padding-left:24px}.service-panel li:before{content:"✓";position:absolute;left:0}body.template-hospitality{background:linear-gradient(135deg,#2d160d,color-mix(in srgb,var(--accent) 52%,#2d160d));color:#fff8f1}.hospitality-hero{width:min(1180px,calc(100% - 32px));margin:0 auto 46px;display:grid;grid-template-columns:1.05fr .95fr;align-items:center}.hospitality-image{min-height:540px;border-radius:0 52px 52px 0;background:color-mix(in srgb,var(--accent) 36%,#fff8f1);background-size:cover;background-position:center}.hospitality-card{padding:44px;border-radius:34px;background:rgba(255,248,241,.96);color:#2d160d;transform:translateX(-34px);box-shadow:0 28px 90px rgba(0,0,0,.22)}.hospitality-card h1,body.template-studio h1{font-family:Georgia,"Times New Roman",serif;font-weight:500}body.template-retail{background:linear-gradient(135deg,var(--background),#ffe367);color:#111}.retail-topline{padding:10px;text-align:center;color:#fff;background:#111;font-size:12px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}.retail-products,.published-products-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:34px}.retail-product,.published-product-card{min-height:180px;border-radius:24px;background:rgba(255,255,255,.58);overflow:hidden;display:grid;align-content:start;font-weight:950;border:1px solid rgba(0,0,0,.08)}.retail-product img{width:100%;height:160px;object-fit:cover}.published-product-card{padding:14px;gap:10px}.published-product-card h3{margin:6px 0 0;font-size:22px}.published-product-price{font-size:20px;font-weight:950}.published-product-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.published-product-actions input{width:76px;border:1px solid rgba(0,0,0,.14);border-radius:12px;padding:10px}.retail-cart{position:fixed;right:18px;bottom:18px;z-index:999;background:#fff;border:1px solid rgba(0,0,0,.16);border-radius:24px;box-shadow:0 18px 70px rgba(0,0,0,.18);padding:18px;max-width:360px;width:calc(100% - 36px);display:none}.retail-cart.show{display:block}.retail-cart h3{margin:0 0 10px}.retail-cart-items{display:grid;gap:8px;max-height:220px;overflow:auto}.retail-cart-row{display:grid;grid-template-columns:1fr auto;gap:8px;border-bottom:1px solid #eee;padding-bottom:8px}.retail-cart-total{font-weight:950;margin-top:12px}.retail-cart-message{margin-top:10px;font-size:14px;color:#8a2b12}.retail-success,.retail-cancel{padding:16px 18px;border-radius:18px;background:#e9f8ed;border:1px solid #a7d8b2}.retail-cancel{background:#fff4e8;border-color:#e7bc8a}body.template-studio{background:linear-gradient(135deg,#fffaf5,var(--background))}.studio-hero{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:68px 0;display:grid;grid-template-columns:.86fr 1.14fr;gap:48px;align-items:center}.studio-image{min-height:460px;border-radius:150px 0;background:color-mix(in srgb,var(--accent) 18%,#fff);overflow:hidden;display:grid;place-items:center;font-weight:900}.studio-image img{width:100%;height:100%;min-height:460px;object-fit:cover}body.template-event{background:radial-gradient(circle at 72% 28%,color-mix(in srgb,var(--accent) 42%,transparent),transparent 28%),linear-gradient(135deg,#070717,#101033 64%,#080817);color:#f5f0ff}.event-hero{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:74px 0;display:grid;grid-template-columns:1fr 320px;gap:46px;align-items:center}.event-orb{aspect-ratio:1;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 34% 28%,#fff,transparent 9%),radial-gradient(circle at 50% 50%,var(--accent),transparent 43%),conic-gradient(from 90deg,#3b82f6,#8b5cf6,#ec4899,#3b82f6);box-shadow:0 0 90px color-mix(in srgb,var(--accent) 55%,transparent);font-weight:950;letter-spacing:.18em}@media(max-width:840px){header,body.template-service .hero,.hospitality-hero,.studio-hero,.event-hero{grid-template-columns:1fr;flex-direction:column;align-items:flex-start}.hospitality-card{transform:none}.retail-products,.published-gallery,.published-products-grid{grid-template-columns:1fr}}`;
}

function renderRetailStatusNotice() {
  return `<div id="retail-status-message"></div>`;
}

function renderRetailShopSection(retail, businessName, slug) {
  if (!retail.enabled) return '';
  const products = retail.products;
  return `<section id="shop" class="published-section published-shop-section"><span class="kicker">Shop</span><h2>Shop ${escapeHtml(businessName)}</h2><p>Choose your products and checkout securely through Stripe.</p><div class="published-products-grid">${products.length ? products.map((product) => renderProductCard(product, retail)).join('') : '<div class="published-empty-gallery">No products are available yet.</div>'}</div></section>`;
}

function renderProductCard(product, retail) {
  const stock = Number(product.stock || 0);
  const inStock = !product.track_stock || stock > 0;
  return `<article class="published-product-card" data-product-card="${escapeAttr(product.id)}"><img src="${escapeAttr(product.image || '/assets/demo-media/shop-hero.jpg')}" alt="${escapeAttr(product.name)}"><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || '')}</p><div class="published-product-price">${escapeHtml(formatMoney(product.price, retail.currency))}</div><div class="muted">${inStock ? (product.track_stock ? `${stock} in stock` : 'Available') : 'Out of stock'}</div><div class="published-product-actions"><input type="number" min="1" max="${Math.max(stock, 1)}" value="1" data-product-qty="${escapeAttr(product.id)}" ${inStock ? '' : 'disabled'}><button class="published-shop-button" type="button" data-add-to-cart="${escapeAttr(product.id)}" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to basket' : 'Out of stock'}</button></div></article>`;
}

function retailCartScript(slug, retail) {
  const safeProducts = retail.products.map((p) => ({ id: p.id, name: p.name, price: Number(p.price || 0), stock: Number(p.stock || 0), track_stock: p.track_stock !== false }));
  return `<aside id="retailCart" class="retail-cart"><h3>Your basket</h3><div id="retailCartItems" class="retail-cart-items"></div><div id="retailCartTotal" class="retail-cart-total"></div><button id="retailCheckoutBtn" class="published-shop-button" type="button">Checkout securely</button><button id="retailCloseCart" class="published-shop-button" style="background:#eee;color:#111" type="button">Keep shopping</button><div id="retailCartMessage" class="retail-cart-message"></div></aside><script>window.PBIRetail=${JSON.stringify({ slug, currency: retail.currency, products: safeProducts })};\n${cartJs()}</script>`;
}

function cartJs() {
  return `(function(){const data=window.PBIRetail||{};const products=data.products||[];const cart={};const cartEl=document.getElementById('retailCart');const itemsEl=document.getElementById('retailCartItems');const totalEl=document.getElementById('retailCartTotal');const msgEl=document.getElementById('retailCartMessage');function money(v){try{return new Intl.NumberFormat('en-GB',{style:'currency',currency:(data.currency||'gbp').toUpperCase()}).format(v)}catch{return (data.currency||'gbp').toUpperCase()+' '+v.toFixed(2)}}function show(msg,type){if(!msgEl)return;msgEl.textContent=msg||'';msgEl.style.color=type==='error'?'#9d1c1c':'#1f6f3b'}function render(){const rows=Object.values(cart);cartEl.classList.toggle('show',rows.length>0);itemsEl.innerHTML=rows.length?rows.map(i=>'<div class="retail-cart-row"><span><strong>'+i.name+'</strong><br><small>Qty '+i.quantity+'</small></span><b>'+money(i.price*i.quantity)+'</b></div>').join(''):'<p>Your basket is empty.</p>';const subtotal=rows.reduce((s,i)=>s+i.price*i.quantity,0);totalEl.textContent='Subtotal: '+money(subtotal)}document.addEventListener('click',function(e){const add=e.target.closest('[data-add-to-cart]');if(add){const id=add.dataset.addToCart;const p=products.find(x=>x.id===id);if(!p)return;const qtyInput=document.querySelector('[data-product-qty="'+CSS.escape(id)+'"]');const qty=Math.max(1,Number(qtyInput&&qtyInput.value||1));const current=cart[id]?.quantity||0;const next=current+qty;if(p.track_stock&&next>p.stock){show('Only '+p.stock+' available for '+p.name+'.','error');return}cart[id]={id:p.id,name:p.name,price:Number(p.price||0),quantity:next};show('Added to basket.','success');render()}if(e.target.id==='retailCloseCart'){cartEl.classList.remove('show')}});document.getElementById('retailCheckoutBtn')?.addEventListener('click',async function(){const items=Object.values(cart).map(i=>({id:i.id,quantity:i.quantity}));if(!items.length){show('Your basket is empty.','error');return}show('Opening secure checkout...','success');try{const res=await fetch('/api/retail/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:data.slug,items})});const out=await res.json().catch(()=>({}));if(!res.ok)throw new Error(out.error||'Checkout could not start.');if(out.url){location.href=out.url;return}throw new Error(out.message||'No checkout URL returned.')}catch(err){show(err.message||'Checkout could not start.','error')}});const params=new URLSearchParams(location.search);const status=document.getElementById('retail-status-message');if(status&&params.get('retail_success')){status.innerHTML='<div class="retail-success"><strong>Payment received.</strong> Thank you. The business will process your order.</div>'}if(status&&params.get('retail_cancelled')){status.innerHTML='<div class="retail-cancel"><strong>Checkout cancelled.</strong> Your basket was not charged.</div>'}})();`;
}

function renderContactForm(businessName) {
  return `<section id="customer-enquiry" class="published-section"><h2>Send an enquiry</h2><p>Use this quick form to contact ${escapeHtml(businessName)}. Your message will be saved in PBI records and emailed to the site owner when email is connected.</p><form class="published-contact-form" method="post"><input name="name" placeholder="Your name" required><input name="email" type="email" placeholder="Your email" required><textarea name="message" placeholder="How can we help?" required></textarea><button class="cta" type="submit">Send enquiry</button><div class="published-form-note">The business owner should still check that contact details and enquiry routing are correct before sharing this site publicly.</div></form></section>`;
}

function buildCta(data) {
  const label = escapeHtml(data.cta_button_text || 'Get in touch');
  const action = data.cta_button_action || 'contact';
  const destination = String(data.cta_button_destination || '').trim();
  const page = data.cta_button_page || 'contact';
  let href = '#contact';
  if (action === 'none') href = '#';
  if (action === 'page') href = '#' + encodeURIComponent(page);
  if (action === 'external') href = destination || '#';
  if (action === 'email') href = destination ? 'mailto:' + destination.replace(/^mailto:/, '') : '#contact';
  if (action === 'phone') href = destination ? 'tel:' + destination.replace(/^tel:/, '') : '#contact';
  return `<a class="cta" href="${escapeAttr(href)}">${label}</a>`;
}

function renderServiceHero({ heroTitle, heroBody, cta }) { return `<section class="hero"><div><span class="kicker">Local service pro</span><h1>${escapeHtml(heroTitle)}</h1><p>${escapeHtml(heroBody)}</p>${cta}</div><aside class="service-panel"><h2>How we help</h2><ul><li>Clear information for customers</li><li>Services explained properly</li><li>Simple route to enquiries</li></ul></aside></section>`; }
function renderHospitalityHero({ heroTitle, heroBody, cta, firstImage, bgImage }) { const image = firstImage || bgImage; return `<section class="hospitality-hero"><div class="hospitality-image" ${image ? `style="background-image:url('${escapeAttr(image)}')"` : ''}></div><div class="hospitality-card"><span class="kicker">Food & hospitality</span><h1>${escapeHtml(heroTitle)}</h1><p>${escapeHtml(heroBody)}</p>${cta}</div></section>`; }
function renderRetailHero({ heroTitle, heroBody, cta, retail }) { return `<section class="hero"><div><span class="kicker">Boutique retail</span><h1>${escapeHtml(heroTitle)}</h1><p>${escapeHtml(heroBody)}</p>${cta}</div>${retail.products.length ? `<div class="retail-products">${retail.products.slice(0,4).map((p)=>`<div class="retail-product"><img src="${escapeAttr(p.image || '/assets/demo-media/shop-hero.jpg')}" alt="${escapeAttr(p.name)}"><div style="padding:12px"><strong>${escapeHtml(p.name)}</strong><br><small>${escapeHtml(formatMoney(p.price, retail.currency))}</small></div></div>`).join('')}</div>` : '<div class="retail-products"><div class="retail-product">Featured</div><div class="retail-product">New</div><div class="retail-product">Local</div><div class="retail-product">Offers</div></div>'}</section>`; }
function renderStudioHero({ heroTitle, heroBody, cta, firstImage, bgImage }) { const image = firstImage || bgImage; return `<section class="studio-hero"><div><span class="kicker">Premium studio</span><h1>${escapeHtml(heroTitle)}</h1><p>${escapeHtml(heroBody)}</p>${cta}</div><div class="studio-image">${image ? `<img src="${escapeAttr(image)}" alt="">` : 'Upload a calm premium image'}</div></section>`; }
function renderEventHero({ heroTitle, heroBody, cta }) { return `<section class="event-hero"><div><span class="kicker">Event launch</span><h1>${escapeHtml(heroTitle)}</h1><p>${escapeHtml(heroBody)}</p>${cta}</div><div class="event-orb">LIVE</div></section>`; }

export async function onRequestPost({ params, request, env }) {
  const slug = String(params.slug || '').trim();
  if (!slug) return new Response('Site not found.', { status: 404 });

  const project = await env.DB.prepare(`SELECT * FROM projects WHERE public_slug = ? AND published = 1 LIMIT 1`).bind(slug).first();
  if (!project) return new Response('This website is not published yet.', { status: 404 });

  const form = await request.formData().catch(() => null);
  const name = String(form?.get('name') || '').trim();
  const email = String(form?.get('email') || '').trim();
  const message = String(form?.get('message') || '').trim();
  if (!name || !email || !message) return new Response('Please complete your name, email and message.', { status: 400 });

  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_enquiries (id TEXT PRIMARY KEY, project_id TEXT, site_slug TEXT, name TEXT, email TEXT, message TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`).run();
    await env.DB.prepare(`INSERT INTO site_enquiries (id, project_id, site_slug, name, email, message, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(), project.id, slug, name, email, message).run();
  } catch (err) { console.error('Could not save site enquiry:', err); }

  try {
    const notifyTo = env.CUSTOM_BUILD_NOTIFY_TO || env.PBI_SITE_ENQUIRY_TO || 'info@purbeckbusinessinnovations.co.uk';
    await sendEmail(env, { to: notifyTo, replyTo: email, subject: `New website enquiry from ${name} via ${project.name || slug}`, html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111"><h2>New website enquiry</h2><p><strong>Site:</strong> ${escapeHtml(project.name || slug)}</p><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p></div>`, text: `New website enquiry\nSite: ${project.name || slug}\nName: ${name}\nEmail: ${email}\nMessage: ${message}` });
  } catch (err) { console.error('Could not email site enquiry:', err); }

  return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Enquiry sent</title><style>body{font-family:Arial,sans-serif;background:#fff8f1;color:#2d160d;padding:40px}main{max-width:720px;margin:auto;background:#fff;padding:34px;border-radius:24px}a{display:inline-block;margin-top:16px;color:#fff;background:#b85f32;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:800}</style></head><body><main><h1>Thanks, your enquiry has been sent.</h1><p>The business owner will be able to review the enquiry from their PBI records.</p><a href="/site/${encodeURIComponent(slug)}/">Back to website</a></main></body></html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
