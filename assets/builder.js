(() => {
  const projectId = new URLSearchParams(window.location.search).get('project');

  const pageDefaults = {
    home: { label: 'Home', title: 'Your Business in your local area', body: 'Your website intro will appear here as you build it out.' },
    about: { label: 'About', title: 'About your business', body: 'Tell customers who you are, what you do and what makes your business different.' },
    services: { label: 'Services', title: 'What we offer', body: 'List your main services, products or customer benefits in a clear and simple way.' },
    gallery: { label: 'Gallery', title: 'Gallery', body: 'Show customers your work, products, venue, food, team or finished projects.' },
    contact: { label: 'Contact', title: 'Get in touch', body: 'Add your phone number, email address, opening hours and the best way for customers to contact you.' }
  };

  const templates = {
    fashion: { accent: '#f4b72f', background: '#fff7db', text: '#111111', nav: '#111111', button: '#111111', label: 'Fresh Retail' },
    restaurant: { accent: '#b88945', background: '#070707', text: '#f7f1e7', nav: '#050505', button: '#b88945', label: 'Premium Dining' },
    calm: { accent: '#0c2b4a', background: '#f7f5ef', text: '#0c2b4a', nav: '#ffffff', button: '#0c2b4a', label: 'Calm Craft' },
    tech: { accent: '#9d4dff', background: '#070818', text: '#f6f2ff', nav: '#08091d', button: '#9d4dff', label: 'Future Event' },
    studio: { accent: '#b9846b', background: '#efe5da', text: '#3b332e', nav: '#f8f1ea', button: '#b9846b', label: 'Minimal Studio' }
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    saveBtn: $('saveBtn'), backBtn: $('backBtn'), logoutBtn: $('logoutBtn'), saveStatus: $('builderSaveStatus'),
    projectName: $('projectName'), businessName: $('businessName'), pageMainHeading: $('pageMainHeading'), subHeading: $('subHeading'),
    accentColor: $('accentColor'), backgroundColor: $('backgroundColor'), textColor: $('textColor'), navColor: $('navColor'), buttonColor: $('buttonColor'),
    buttonTransparency: $('buttonTransparency'), buttonTransparencyNote: $('buttonTransparencyNote'),
    pageTabs: $('pageTabs'), pageTitle: $('pageTitle'), pageBody: $('pageBody'),
    logoUpload: $('logoUpload'), galleryUpload: $('galleryUpload'), galleryThumbs: $('galleryThumbs'),
    backgroundUpload: $('backgroundUpload'), backgroundTransparency: $('backgroundTransparency'), backgroundTransparencyNote: $('backgroundTransparencyNote'),
    useCustomDomain: $('useCustomDomain'), httpsEnabled: $('httpsEnabled'), subdomainSlug: $('subdomainSlug'), customDomain: $('customDomain'),
    checkDomainBtn: $('checkDomainBtn'), domainResult: $('domainResult'),
    desktopBtn: $('desktopBtn'), mobileBtn: $('mobileBtn'), previewFrame: $('previewFrame'), previewAddress: $('previewAddress'), previewScroll: $('previewScroll')
  };

  const state = {
    projectName: '', businessName: '', pageMainHeading: '', subHeading: '', template: 'fashion',
    accentColor: '#c86f3d', backgroundColor: '#fff8f1', textColor: '#2f1b12', navColor: '#8a431d', buttonColor: '#c86f3d',
    buttonTransparency: 0, pages: JSON.parse(JSON.stringify(pageDefaults)), selectedPages: ['home','about','services','contact'], activePage: 'home',
    logoDataUrl: '', galleryImages: [], backgroundImageDataUrl: '', backgroundTransparency: 25,
    subdomainSlug: '', customDomain: '', useCustomDomain: false, httpsEnabled: true, domainOption: 'pbi_subdomain'
  };

  function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;"); }
  function msg(text,type='info'){ if(els.saveStatus){ els.saveStatus.textContent=text||''; els.saveStatus.className=`builder-save-status ${type}`; } }
  function dmsg(text,type='info'){ if(els.domainResult){ els.domainResult.textContent=text; els.domainResult.className=`notice domain-${type}`; } }

  async function api(path, options={}){
    const res = await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
    const data = await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error||data.message||`Request failed with ${res.status}`);
    return data;
  }

  function slug(v){ return String(v||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60); }
  function fileData(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('Could not read file.')); r.readAsDataURL(file); }); }

  function syncInputs(){
    state.projectName=els.projectName?.value||''; state.businessName=els.businessName?.value||''; state.pageMainHeading=els.pageMainHeading?.value||''; state.subHeading=els.subHeading?.value||'';
    state.accentColor=els.accentColor?.value||state.accentColor; state.backgroundColor=els.backgroundColor?.value||state.backgroundColor; state.textColor=els.textColor?.value||state.textColor;
    state.navColor=els.navColor?.value||state.navColor; state.buttonColor=els.buttonColor?.value||state.buttonColor; state.buttonTransparency=Number(els.buttonTransparency?.value||0);
    state.backgroundTransparency=Math.min(60,Number(els.backgroundTransparency?.value||25)); state.subdomainSlug=els.subdomainSlug?.value||''; state.customDomain=els.customDomain?.value||'';
    state.useCustomDomain=els.useCustomDomain?.value==='true'; state.httpsEnabled=els.httpsEnabled?.value!=='false';
    state.domainOption=document.querySelector('input[name="launchDomainOption"]:checked')?.value||'pbi_subdomain';
    state.template=document.querySelector('input[name="templateStyle"]:checked')?.value||state.template;

    const p=state.pages[state.activePage]||pageDefaults.home; p.title=els.pageTitle?.value||''; p.body=els.pageBody?.value||''; state.pages[state.activePage]=p;
    state.selectedPages=Array.from(new Set(['home',...Array.from(document.querySelectorAll('.pageToggle')).filter(i=>i.checked).map(i=>i.value)]));
    if(!state.selectedPages.includes(state.activePage)) state.activePage='home';
  }

  function syncToInputs(){
    if(els.projectName) els.projectName.value=state.projectName||''; if(els.businessName) els.businessName.value=state.businessName||''; if(els.pageMainHeading) els.pageMainHeading.value=state.pageMainHeading||''; if(els.subHeading) els.subHeading.value=state.subHeading||'';
    if(els.accentColor) els.accentColor.value=state.accentColor; if(els.backgroundColor) els.backgroundColor.value=state.backgroundColor; if(els.textColor) els.textColor.value=state.textColor; if(els.navColor) els.navColor.value=state.navColor; if(els.buttonColor) els.buttonColor.value=state.buttonColor;
    if(els.buttonTransparency) els.buttonTransparency.value=state.buttonTransparency; if(els.backgroundTransparency) els.backgroundTransparency.value=state.backgroundTransparency; if(els.subdomainSlug) els.subdomainSlug.value=state.subdomainSlug||''; if(els.customDomain) els.customDomain.value=state.customDomain||'';
    if(els.useCustomDomain) els.useCustomDomain.value=String(!!state.useCustomDomain); if(els.httpsEnabled) els.httpsEnabled.value=String(state.httpsEnabled!==false);
    const ti=document.querySelector(`input[name="templateStyle"][value="${state.template}"]`); if(ti) ti.checked=true;
    const di=document.querySelector(`input[name="launchDomainOption"][value="${state.domainOption}"]`); if(di) di.checked=true;
    document.querySelectorAll('.pageToggle').forEach(i=>i.checked=state.selectedPages.includes(i.value));
    renderPageEditor(); updateNotes();
  }

  function updateNotes(){ if(els.buttonTransparencyNote) els.buttonTransparencyNote.textContent=`${state.buttonTransparency}% transparent`; if(els.backgroundTransparencyNote) els.backgroundTransparencyNote.textContent=`${state.backgroundTransparency}% transparent, maximum 60%`; }

  function renderTabs(){
    if(!els.pageTabs) return;
    els.pageTabs.innerHTML=state.selectedPages.map(k=>`<button type="button" class="${k===state.activePage?'active':''}" data-tab="${esc(k)}">${esc((state.pages[k]||pageDefaults[k]).label)}</button>`).join('');
    els.pageTabs.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ syncInputs(); state.activePage=b.dataset.tab; renderAll(); });
  }

  function renderPageEditor(){ const p=state.pages[state.activePage]||pageDefaults.home; if(els.pageTitle) els.pageTitle.value=p.title||''; if(els.pageBody) els.pageBody.value=p.body||''; }

  function renderThumbs(){
    if(!els.galleryThumbs) return;
    if(!state.galleryImages.length){ els.galleryThumbs.innerHTML='<div class="notice" style="grid-column:1/-1">No pictures uploaded yet.</div>'; return; }
    els.galleryThumbs.innerHTML=state.galleryImages.map((im,i)=>`<div class="thumb-item"><img src="${im}" alt=""><button type="button" class="thumb-remove" data-r="${i}">×</button></div>`).join('');
    els.galleryThumbs.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ state.galleryImages.splice(Number(b.dataset.r),1); renderAll(); });
  }

  function previewDomain(){ const custom=state.customDomain.trim(); const s=slug(state.subdomainSlug||state.businessName||'your-business'); return state.useCustomDomain&&custom?custom.replace(/^https?:\/\//,''):`${s||'your-business'}.pbi.dev`; }

  function renderPreview(){
    if(!els.previewScroll) return;
    const business=state.businessName.trim()||'Your Business';
    const page=state.pages[state.activePage]||state.pages.home;
    if(els.previewAddress) els.previewAddress.textContent=`https://${previewDomain()}`;
    const pages=state.selectedPages.map(k=>`<button type="button" class="${k===state.activePage?'active':''}" data-preview="${k}">${esc((state.pages[k]||pageDefaults[k]).label)}</button>`).join('');
    const logo=state.logoDataUrl?`<img class="site-logo-img" src="${state.logoDataUrl}" alt="">`:'<div class="site-logo"></div>';
    const gallery=state.galleryImages.length?`<div class="preview-gallery-grid">${state.galleryImages.slice(0,6).map(i=>`<img src="${i}" alt="">`).join('')}</div>`:'<div class="drop-hint">Upload pictures to fill this gallery.</div>';

    els.previewScroll.className=`preview-scroll pbi-template pbi-template-${state.template}`;
    els.previewScroll.style.cssText=`--site-accent:${state.accentColor};--site-bg:${state.backgroundColor};--site-text:${state.textColor};--site-nav:${state.navColor};--site-button:${state.buttonColor};--site-bg-image:${state.backgroundImageDataUrl?`url(${state.backgroundImageDataUrl})`:'none'};--site-bg-opacity:${1-(state.backgroundTransparency/100)};`;
    els.previewScroll.innerHTML=`<div class="template-bg-layer"></div>
      <header class="tpl-${state.template}-nav"><div class="tpl-logo-wrap">${logo}<strong>${esc(business)}</strong></div><nav class="site-links">${pages}</nav></header>
      <section class="tpl-${state.template}-hero"><div><p class="tpl-kicker">${esc(templates[state.template]?.label||'Website')}</p><h1>${esc(page.title)}</h1><p>${esc(page.body)}</p><button class="preview-cta">Get in touch</button></div>${state.template==='tech'?'<div class="tpl-tech-orb"></div>':''}</section>
      ${state.activePage==='gallery'?`<section class="tpl-gallery-section"><h2>Gallery</h2>${gallery}</section>`:`<section class="tpl-feature-strip"><div><span>✦</span><strong>Simple setup</strong></div><div><span>✦</span><strong>Mobile friendly</strong></div><div><span>✦</span><strong>Editable content</strong></div><div><span>✦</span><strong>Launch guidance</strong></div></section>`}
      <footer class="preview-footer">© ${esc(business)} • Crafted with PBI</footer>`;
    els.previewScroll.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{ syncInputs(); state.activePage=b.dataset.preview; renderAll(); });
  }

  function renderAll(){ updateNotes(); renderTabs(); renderPageEditor(); renderThumbs(); renderPreview(); }

  function collect(){ syncInputs(); return { project_name:state.projectName,business_name:state.businessName,page_main_heading:state.pageMainHeading,sub_heading:state.subHeading,template:state.template,accent_color:state.accentColor,background_color:state.backgroundColor,text_color:state.textColor,nav_color:state.navColor,button_color:state.buttonColor,button_transparency:state.buttonTransparency,pages:state.pages,selected_pages:state.selectedPages,active_page:state.activePage,logo_data_url:state.logoDataUrl,gallery_images:state.galleryImages,background_image_data_url:state.backgroundImageDataUrl,background_transparency:state.backgroundTransparency,subdomain_slug:state.subdomainSlug,custom_domain:state.customDomain,use_custom_domain:state.useCustomDomain,https_enabled:state.httpsEnabled,domain_option:state.domainOption }; }

  async function save(){ if(!projectId) return msg('No project ID found in the URL.','error'); const data=collect(); const name=data.project_name?.trim()||data.business_name?.trim()||'Untitled website'; if(els.saveBtn){els.saveBtn.disabled=true; els.saveBtn.textContent='Saving...';} msg('Saving project...','saving'); try{ await api('/api/projects/update',{method:'POST',body:JSON.stringify({id:projectId,name,data})}); msg('Project saved successfully.','success'); }catch(e){console.error(e); msg(e.message||'Could not save project.','error');} finally{ if(els.saveBtn){els.saveBtn.disabled=false; els.saveBtn.textContent='Save project';} } }

  async function load(){
    if(!projectId){ syncToInputs(); renderAll(); return; }
    try{
      const result=await api(`/api/projects/get?id=${encodeURIComponent(projectId)}`);
      const project=result.project||result;
      let d={}; if(project.data_json) d=typeof project.data_json==='string'?JSON.parse(project.data_json||'{}'):project.data_json;
      state.projectName=project.name||d.project_name||''; state.businessName=d.business_name||''; state.pageMainHeading=d.page_main_heading||''; state.subHeading=d.sub_heading||''; state.template=d.template||'fashion';
      Object.assign(state,{ accentColor:d.accent_color||templates[state.template]?.accent||'#c86f3d', backgroundColor:d.background_color||templates[state.template]?.background||'#fff8f1', textColor:d.text_color||templates[state.template]?.text||'#2f1b12', navColor:d.nav_color||templates[state.template]?.nav||'#8a431d', buttonColor:d.button_color||templates[state.template]?.button||'#c86f3d' });
      state.buttonTransparency=Number(d.button_transparency||0); state.pages={...JSON.parse(JSON.stringify(pageDefaults)),...(d.pages||{})}; state.selectedPages=Array.isArray(d.selected_pages)&&d.selected_pages.length?Array.from(new Set(['home',...d.selected_pages])):['home','about','services','contact']; state.activePage=d.active_page&&state.selectedPages.includes(d.active_page)?d.active_page:'home';
      state.logoDataUrl=d.logo_data_url||''; state.galleryImages=Array.isArray(d.gallery_images)?d.gallery_images:[]; state.backgroundImageDataUrl=d.background_image_data_url||''; state.backgroundTransparency=Number(d.background_transparency||25); state.subdomainSlug=d.subdomain_slug||''; state.customDomain=d.custom_domain||''; state.useCustomDomain=!!d.use_custom_domain; state.httpsEnabled=d.https_enabled!==false; state.domainOption=d.domain_option||project.domain_option||'pbi_subdomain';
    }catch(e){ console.error(e); msg(e.message||'Could not load project.','error'); }
    syncToInputs(); renderAll();
  }

  function bind(){
    if(els.saveBtn) els.saveBtn.onclick=save;
    if(els.backBtn) els.backBtn.onclick=()=>location.href='/dashboard/';
    if(els.logoutBtn) els.logoutBtn.onclick=async()=>{ try{await fetch('/api/auth/logout',{method:'POST',credentials:'include'});}finally{location.href='/login/';} };
    if(els.logoUpload) els.logoUpload.onchange=async e=>{ const f=e.target.files?.[0]; if(f){state.logoDataUrl=await fileData(f); renderPreview();} };
    if(els.galleryUpload) els.galleryUpload.onchange=async e=>{ const fs=Array.from(e.target.files||[]); state.galleryImages.push(...await Promise.all(fs.map(fileData))); renderAll(); };
    if(els.backgroundUpload) els.backgroundUpload.onchange=async e=>{ const f=e.target.files?.[0]; if(f){state.backgroundImageDataUrl=await fileData(f); renderPreview();} };
    if(els.checkDomainBtn) els.checkDomainBtn.onclick=()=>dmsg('Domain checking will connect here. For now, continue building and choose your domain option at publish.','info');
    document.querySelectorAll('input[name="templateStyle"]').forEach(i=>i.onchange=()=>{ const t=templates[i.value]; state.template=i.value; state.accentColor=t.accent; state.backgroundColor=t.background; state.textColor=t.text; state.navColor=t.nav; state.buttonColor=t.button; syncToInputs(); renderAll(); });
    document.querySelectorAll('input[name="launchDomainOption"], .pageToggle').forEach(i=>i.onchange=()=>{ syncInputs(); renderAll(); });
    [els.projectName,els.businessName,els.pageMainHeading,els.subHeading,els.accentColor,els.backgroundColor,els.textColor,els.navColor,els.buttonColor,els.buttonTransparency,els.pageTitle,els.pageBody,els.backgroundTransparency,els.useCustomDomain,els.httpsEnabled,els.subdomainSlug,els.customDomain].filter(Boolean).forEach(i=>{ i.oninput=()=>{syncInputs(); renderAll();}; i.onchange=()=>{syncInputs(); renderAll();}; });
    if(els.desktopBtn&&els.mobileBtn&&els.previewFrame){ els.desktopBtn.onclick=()=>{els.previewFrame.style.maxWidth='100%';els.previewFrame.style.margin='0';els.desktopBtn.classList.add('active');els.mobileBtn.classList.remove('active');}; els.mobileBtn.onclick=()=>{els.previewFrame.style.maxWidth='390px';els.previewFrame.style.margin='0 auto';els.mobileBtn.classList.add('active');els.desktopBtn.classList.remove('active');}; }
  }

  bind(); syncToInputs(); renderAll(); load();
})();
