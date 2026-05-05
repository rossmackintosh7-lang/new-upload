(function(){
  const qs = new URLSearchParams(location.search);
  const presetId = qs.get('preset') || qs.get('template') || localStorage.getItem('pbi_selected_template') || 'cafe';
  const presetApi = window.PBITemplatePresets;
  const preset = presetApi?.get?.(presetId) || presetApi?.get?.('cafe') || {};
  const state = JSON.parse(localStorage.getItem('pbi_canvas_state')||'null') || presetApi?.toProjectData?.(preset.id||presetId) || {business_name:'New PBI Website',page_main_heading:'Your premium website starts here',sub_heading:'Edit the canvas, save the project, then publish when ready.',selected_pages:['home'],pages:{home:{label:'Home',title:'Your premium website starts here',body:'Edit this page.'}}};
  const plan = (qs.get('plan') || localStorage.getItem('pbi_plan') || state.plan || 'starter').toLowerCase();
  const premium = ['business','plus','pro'].includes(plan);
  const plus = ['plus','pro'].includes(plan);
  const drop = document.getElementById('canvasDropzone');
  const empty = document.getElementById('canvasEmpty');
  const title = document.getElementById('canvasProjectTitle');
  const status = document.getElementById('canvasAutosaveStatus');
  let activePage = state.active_page || state.activePage || 'home';
  let selected = null;
  function setStatus(text){ if(status) status.textContent=text; }
  function pageData(){ return state.pages?.[activePage] || Object.values(state.pages||{})[0] || {}; }
  function renderPages(){ const list=document.getElementById('canvasPagesList'); if(!list)return; const keys=state.selected_pages||state.selectedPages||Object.keys(state.pages||{home:{label:'Home'}}); list.innerHTML=keys.map(k=>`<button type="button" class="${k===activePage?'active':''}" data-page="${k}">${state.pages?.[k]?.label||k}</button>`).join(''); list.querySelectorAll('button').forEach(b=>b.onclick=()=>{activePage=b.dataset.page;render();}); }
  function block(kind, content){ return `<section class="pbi-canvas-render-block" data-kind="${kind}" tabindex="0">${content}</section>`; }
  function render(){
    if(title) title.textContent = state.business_name || preset.businessName || 'PBI Website';
    renderPages();
    const p=pageData();
    const bg=state.background_color||preset.background||'#fffaf4', accent=state.accent_color||preset.accent||'#b95624', text=state.text_color||preset.text||'#24130c';
    if(!drop)return; if(empty) empty.hidden=true;
    drop.style.setProperty('--preview-accent',accent); drop.style.background=bg; drop.style.color=text;
    const services=(state.servicesList||state.services_list||preset.servicesList||['Service one','Service two','Service three']).map(x=>`<article><h3>${x}</h3><p>Edit this card from the inspector or replace it with your own section.</p></article>`).join('');
    const img=state.heroImage||preset.heroImage||'/assets/pbi-logo-original.png';
    drop.innerHTML = block('hero',`<div class="pbi-live-hero"><div><p class="eyebrow">${state.tagline||preset.tagline||'Built with PBI'}</p><h1>${p.title||state.page_main_heading||preset.pageMainHeading||'Your website headline'}</h1><p>${p.body||state.sub_heading||preset.subHeading||'Your website introduction.'}</p><a class="btn" style="background:${accent}" href="#contact">${state.cta_button_text||preset.ctaButtonText||'Get started'}</a></div><img src="${img}" alt="Website preview image"></div>`)+
      block('services',`<div class="pbi-live-section"><p class="eyebrow">What you offer</p><h2>${preset.label||'Services'} built clearly</h2><div class="pbi-live-card-grid">${services}</div></div>`)+
      block('gallery',`<div class="pbi-live-section"><p class="eyebrow">Premium flow</p><h2>Move sections, edit content and shape the page.</h2><p>${premium?'Freeform and advanced controls are unlocked for this package.':'Starter keeps the page guided so customers cannot accidentally wreck the layout.'}</p></div>`)+
      block('contact',`<div class="pbi-live-section" id="contact"><h2>Ready to enquire?</h2><p>Add your phone, email, booking link or contact form here.</p><a class="btn" style="background:${accent}" href="/contact/">Contact</a></div>`);
    drop.querySelectorAll('.pbi-canvas-render-block').forEach(el=>{el.onclick=()=>select(el);});
    applyGate(); setStatus('Autosaved locally'); localStorage.setItem('pbi_canvas_state', JSON.stringify(state));
  }
  function select(el){ selected=el; document.querySelectorAll('.pbi-canvas-render-block').forEach(x=>x.classList.remove('selected')); el.classList.add('selected'); const form=document.getElementById('canvasInspectorForm'); const emp=document.getElementById('canvasInspectorEmpty'); if(form) form.hidden=false; if(emp) emp.hidden=true; const h=el.querySelector('h1,h2,h3'); const p=el.querySelector('p:not(.eyebrow)'); document.getElementById('inspectorTitle') && (document.getElementById('inspectorTitle').value=h?.textContent||''); document.getElementById('inspectorText') && (document.getElementById('inspectorText').value=p?.textContent||''); }
  function applyInspector(){ if(!selected)return; const h=selected.querySelector('h1,h2,h3'); const p=selected.querySelector('p:not(.eyebrow)'); const t=document.getElementById('inspectorTitle')?.value; const tx=document.getElementById('inspectorText')?.value; if(h&&t)h.textContent=t; if(p&&tx)p.textContent=tx; setStatus('Changes applied locally'); }
  function applyGate(){
    const advanced=['canvasFreeformGuideBtn','canvasSaveVersionBtn','canvasDuplicatePageBtn','cmsCloudSaveBtn','cmsCloudLoadBtn','collabInviteBtn'];
    advanced.forEach(id=>{const el=document.getElementById(id); if(el && !premium){el.classList.add('pbi-locked'); el.title='Business or Plus required';}});
    const plusOnly=['cmsAddItemBtn','collabCommentBtn']; plusOnly.forEach(id=>{const el=document.getElementById(id); if(el && !plus){el.classList.add('pbi-locked'); el.title='Plus required';}});
    const tabs=document.querySelectorAll('[data-studio-tab="cms"],[data-studio-tab="collab"]'); tabs.forEach(t=>{if(!plus)t.classList.add('pbi-locked')});
  }
  function saveProject(){
    const local = JSON.parse(localStorage.getItem('pbi_local_projects')||'[]');
    const existing = local.find(p=>p.id==='local-canvas');
    const project={id:'local-canvas',name:state.business_name||preset.businessName||'PBI Website',status:'draft',plan, billing_status:'draft', published:0, updated_at:new Date().toISOString()};
    if(existing) Object.assign(existing,project); else local.unshift(project);
    localStorage.setItem('pbi_local_projects',JSON.stringify(local)); localStorage.setItem('pbi_canvas_state',JSON.stringify(state)); setStatus('Project saved locally');
    fetch('/api/projects/save',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({project})}).catch(()=>{});
  }
  document.querySelectorAll('[data-studio-tab]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.classList.contains('pbi-locked')){alert('This panel is for Plus. Upgrade to unlock it.');return;} document.querySelectorAll('[data-studio-tab]').forEach(b=>b.classList.remove('active')); document.querySelectorAll('[data-studio-panel]').forEach(p=>p.classList.remove('active')); btn.classList.add('active'); document.querySelector(`[data-studio-panel="${btn.dataset.studioTab}"]`)?.classList.add('active');}));
  document.getElementById('canvasApplyInspectorBtn')?.addEventListener('click',applyInspector);
  document.getElementById('canvasExportBtn')?.addEventListener('click',saveProject);
  document.getElementById('canvasPublishBtn')?.addEventListener('click',()=>location.href='/pricing/?publish=1');
  document.getElementById('canvasBackToBuilder')?.setAttribute('href','/dashboard/');
  document.getElementById('canvasAiBuildBtn')?.addEventListener('click',()=>{const brief=document.getElementById('canvasAiBrief')?.value; if(brief){state.sub_heading=brief; render();}});
  render();
})();
