(function () {
  const $ = (selector) => document.querySelector(selector);
  const state = { dashboard: null, reports: [], busy: false };

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function status(message) {
    const el = $('#seoStatus');
    if (el) el.textContent = message || '';
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || data.message || `Request failed (${response.status})`);
    }
    return data;
  }

  function parseJson(value, fallback) {
    try { return typeof value === 'string' ? JSON.parse(value || JSON.stringify(fallback)) : (value || fallback); }
    catch (_) { return fallback; }
  }

  function shortUrl(value) {
    try {
      const url = new URL(value, location.origin);
      return url.pathname || value;
    } catch (_) {
      return value || '';
    }
  }

  function issueLabel(type) {
    return String(type || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function renderKpis(summary, pages) {
    const top = pages.slice().sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];
    const low = pages.slice().sort((a, b) => Number(a.score || 0) - Number(b.score || 0))[0];
    const cards = [
      ['Overall SEO Score', summary.overall_seo_score || 0, summary.overall_seo_score || 0],
      ['Indexed Pages', summary.indexed_pages || 0, Math.min(100, (summary.indexed_pages || 0) * 8)],
      ['Missing Meta Descriptions', summary.missing_meta_descriptions || 0, Math.min(100, (summary.missing_meta_descriptions || 0) * 14)],
      ['Broken Links', summary.broken_links || 0, Math.min(100, (summary.broken_links || 0) * 16)],
      ['Thin Content Pages', summary.thin_content_pages || 0, Math.min(100, (summary.thin_content_pages || 0) * 12)],
      ['Missing Alt Tags', summary.missing_alt_tags || 0, Math.min(100, (summary.missing_alt_tags || 0) * 12)],
      ['Internal Link Opportunities', summary.internal_link_opportunities || 0, Math.min(100, (summary.internal_link_opportunities || 0) * 9)],
      ['Core Web Vitals Warnings', summary.core_web_vitals_warnings || 0, Math.min(100, (summary.core_web_vitals_warnings || 0) * 12)],
      ['Pages Missing Schema', summary.pages_missing_schema || 0, Math.min(100, (summary.pages_missing_schema || 0) * 14)],
      ['Keyword Tracking Summary', summary.keyword_tracking_summary || 0, Math.min(100, (summary.keyword_tracking_summary || 0) * 8)],
      ['Top Performing Pages', top ? `${Number(top.score || 0)}` : 0, top ? Number(top.score || 0) : 0],
      ['Lowest Performing Pages', low ? `${Number(low.score || 0)}` : 0, low ? Number(low.score || 0) : 0]
    ];
    $('#seoKpiGrid').innerHTML = cards.map(([label, value, level]) => `
      <article>
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <span class="pbi-seo-kpi-trend"><i style="--level:${Math.max(0, Math.min(100, Number(level || 0)))}%"></i></span>
      </article>
    `).join('');
  }

  function renderTasks(tasks) {
    const open = (tasks || []).filter((task) => !['completed', 'dismissed'].includes(task.status));
    $('#seoTaskList').innerHTML = open.length ? open.slice(0, 40).map((task) => `
      <article class="pbi-seo-task priority-${esc(task.priority || 'medium')}">
        <div>
          <h3>${esc(issueLabel(task.task_type))}</h3>
          <p>${esc(task.reasoning || '')}</p>
          <p>${esc(shortUrl(task.page_url))}</p>
          <div class="pbi-seo-task-meta">
            <span class="pbi-seo-pill">${esc(task.priority || 'medium')}</span>
            <span class="pbi-seo-pill">${esc(task.estimated_impact || 'Medium')} impact</span>
            <span class="pbi-seo-pill">${esc(task.status || 'pending')}</span>
          </div>
        </div>
        <div class="pbi-admin-actions">
          <button class="btn" type="button" data-preview-fix="${esc(task.id)}">Preview fix</button>
          <button class="btn-ghost" type="button" data-task-status="completed" data-task-id="${esc(task.id)}">Done</button>
          <button class="btn-ghost" type="button" data-task-status="dismissed" data-task-id="${esc(task.id)}">Dismiss</button>
        </div>
      </article>
    `).join('') : '<p class="pbi-seo-empty">No open SEO tasks. Run an audit to refresh the queue.</p>';
  }

  function renderPages(pages) {
    const ordered = (pages || []).slice();
    const lowest = ordered.slice().sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 8);
    const top = ordered.slice().sort((a, b) => Number(b.score || 0) - Number(a.score || 0)).slice(0, 8);
    const row = (page) => `
      <article class="pbi-seo-page-row">
        <span class="pbi-seo-page-score">${Number(page.score || 0)}</span>
        <div>
          <strong>${esc(page.title || page.h1 || shortUrl(page.page_url))}</strong>
          <p>${esc(shortUrl(page.page_url))} · ${Number(page.word_count || 0)} words · ${Number(page.load_time_ms || 0)}ms</p>
        </div>
      </article>
    `;
    $('#seoLowestPages').innerHTML = lowest.length ? lowest.map(row).join('') : '<p class="pbi-seo-empty">No page scores yet.</p>';
    $('#seoTopPages').innerHTML = top.length ? top.map(row).join('') : '<p class="pbi-seo-empty">No page scores yet.</p>';
  }

  function renderIssueChart(tasks) {
    const counts = {};
    (tasks || []).forEach((task) => {
      if (['completed', 'dismissed'].includes(task.status)) return;
      counts[task.task_type] = (counts[task.task_type] || 0) + 1;
    });
    renderBars('#seoIssueChart', counts, 'No audit issues yet.');
  }

  function renderBars(selector, counts, emptyText) {
    const entries = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
    const max = Math.max(1, ...entries.map((entry) => entry[1]));
    $(selector).innerHTML = entries.length ? entries.map(([label, value]) => `
      <div class="pbi-seo-bar">
        <span>${esc(issueLabel(label))}</span>
        <div class="pbi-seo-bar-track"><i style="--width:${Math.max(6, Math.round((value / max) * 100))}%"></i></div>
        <strong>${Number(value || 0)}</strong>
      </div>
    `).join('') : `<p class="pbi-seo-empty">${esc(emptyText)}</p>`;
  }

  function renderKeywords(keywords) {
    const counts = {};
    (keywords || []).forEach((keyword) => {
      const group = keyword.group_type || 'national';
      counts[group] = (counts[group] || 0) + 1;
    });
    renderBars('#seoKeywordChart', counts, 'No keywords tracked yet.');
    $('#seoKeywordList').innerHTML = keywords?.length ? keywords.slice(0, 80).map((keyword) => `
      <article class="pbi-seo-keyword-row">
        <div>
          <strong>${esc(keyword.keyword)}</strong>
          <p>${esc(keyword.group_type || 'national')} · ${esc(keyword.search_intent || keyword.intent || '')} · ${esc(shortUrl(keyword.target_url || ''))}</p>
        </div>
        <span class="pbi-seo-pill">${keyword.ranking_position ? `#${Number(keyword.ranking_position)}` : 'tracking'}</span>
      </article>
    `).join('') : '<p class="pbi-seo-empty">No keywords tracked yet.</p>';
  }

  function renderLinks(links) {
    $('#seoInternalLinks').innerHTML = links?.length ? links.slice(0, 40).map((link) => `
      <article class="pbi-seo-link-row">
        <strong>${esc(link.anchor_text || 'Contextual link')}</strong>
        <p>${esc(shortUrl(link.source_url))} <span class="pbi-seo-link-arrow">to</span> ${esc(shortUrl(link.target_url))}</p>
        <p>${esc(link.reasoning || '')}</p>
      </article>
    `).join('') : '<p class="pbi-seo-empty">No internal link opportunities yet.</p>';
  }

  function renderClusters(clusters) {
    $('#seoClusters').innerHTML = clusters?.length ? clusters.slice(0, 30).map((cluster) => {
      const ideas = parseJson(cluster.content_ideas_json, {});
      const ideaCount = Array.isArray(ideas.ideas) ? ideas.ideas.length : 0;
      return `
        <article class="pbi-seo-cluster-row">
          <strong>${esc(cluster.name)}</strong>
          <p>${esc(cluster.topic || '')}</p>
          <p>${esc(shortUrl(cluster.pillar_url || ''))} · ${ideaCount} ideas</p>
        </article>
      `;
    }).join('') : '<p class="pbi-seo-empty">No content clusters yet.</p>';
  }

  function renderReports(reports) {
    $('#seoReports').innerHTML = reports?.length ? reports.map((report) => {
      const summary = parseJson(report.summary_json, {});
      return `
        <article class="pbi-seo-report-row">
          <strong>${esc(report.report_type || 'snapshot')} · ${esc(new Date(report.created_at).toLocaleString('en-GB'))}</strong>
          <p>${Number(summary.summary?.open_tasks || 0)} open tasks · ${Number(summary.summary?.keyword_tracking_summary || 0)} keywords · score ${Number(summary.summary?.overall_seo_score || 0)}</p>
        </article>
      `;
    }).join('') : '<p class="pbi-seo-empty">No reports created yet.</p>';
  }

  function renderDashboard(data) {
    state.dashboard = data;
    const summary = data.summary || {};
    const pages = data.pages || [];
    const score = Number(summary.overall_seo_score || 0);
    $('#seoOverallScore').textContent = score;
    document.documentElement.style.setProperty('--score', score);
    renderKpis(summary, pages);
    renderTasks(data.tasks || []);
    renderPages(pages);
    renderIssueChart(data.tasks || []);
    renderKeywords(data.keywords || []);
    renderLinks(data.links || []);
    renderClusters(data.clusters || []);
    status(`SEO Agent loaded. ${Number(summary.pages_scanned || 0)} pages scanned, ${Number(summary.open_tasks || 0)} open tasks.`);
  }

  async function loadDashboard() {
    status('Loading SEO Agent...');
    const data = await api('/api/admin/seo/dashboard');
    renderDashboard(data);
  }

  async function loadReports() {
    const data = await api('/api/admin/seo/report');
    state.reports = data.reports || [];
    renderReports(state.reports);
  }

  async function runAudit() {
    if (state.busy) return;
    state.busy = true;
    status('Running live SEO audit...');
    try {
      await api('/api/admin/seo/audit', { method: 'POST', body: JSON.stringify({ limit: 120 }) });
      await loadDashboard();
      status('Audit complete. Tasks, scores and internal links refreshed.');
    } finally {
      state.busy = false;
    }
  }

  async function previewFix(taskId) {
    status('Generating editable SEO fix preview...');
    const data = await api('/api/admin/seo/fix', { method: 'POST', body: JSON.stringify({ task_id: taskId }) });
    const fix = data.fix || {};
    $('#seoPreviewId').value = data.preview_id || '';
    $('#seoPreviewUrl').value = data.page_url || '';
    $('#seoPreviewTitle').value = fix.title || '';
    $('#seoPreviewDescription').value = fix.meta_description || '';
    $('#seoPreviewH1').value = fix.h1 || '';
    $('#seoPreviewSchema').value = fix.schema_jsonld || '';
    $('#seoPreviewContent').value = fix.content_block_html || '';
    $('#seoPreviewLinks').value = fix.internal_links_html || '';
    status('Preview ready. Review the fields before applying.');
  }

  async function applyPreview(event) {
    event.preventDefault();
    const previewId = $('#seoPreviewId').value.trim();
    if (!previewId) return status('Generate a preview before applying.');
    const fix = {
      title: $('#seoPreviewTitle').value.trim(),
      meta_description: $('#seoPreviewDescription').value.trim(),
      h1: $('#seoPreviewH1').value.trim(),
      schema_jsonld: $('#seoPreviewSchema').value.trim(),
      content_block_html: $('#seoPreviewContent').value.trim(),
      internal_links_html: $('#seoPreviewLinks').value.trim()
    };
    status('Applying approved SEO override...');
    await api('/api/admin/seo/fix', { method: 'PATCH', body: JSON.stringify({ preview_id: previewId, fix }) });
    clearPreview();
    await loadDashboard();
    status('Approved fix applied to the live SEO override layer.');
  }

  function clearPreview() {
    ['#seoPreviewId', '#seoPreviewUrl', '#seoPreviewTitle', '#seoPreviewDescription', '#seoPreviewH1', '#seoPreviewSchema', '#seoPreviewContent', '#seoPreviewLinks'].forEach((selector) => {
      const el = $(selector);
      if (el) el.value = '';
    });
  }

  async function updateTask(id, taskStatus) {
    await api('/api/admin/seo/tasks', { method: 'PATCH', body: JSON.stringify({ id, status: taskStatus }) });
    await loadDashboard();
  }

  async function addKeyword(event) {
    event.preventDefault();
    const keyword = $('#seoKeyword').value.trim();
    if (!keyword) return;
    await api('/api/admin/seo/keywords', {
      method: 'POST',
      body: JSON.stringify({
        keyword,
        target_url: $('#seoKeywordTarget').value.trim(),
        group_type: $('#seoKeywordGroup').value,
        search_intent: $('#seoKeywordIntent').value,
        intent: $('#seoKeywordIntent').value,
        ranking_position: $('#seoKeywordPosition').value || null,
        impressions: $('#seoKeywordImpressions').value || 0
      })
    });
    event.target.reset();
    await loadDashboard();
    status('Keyword added.');
  }

  async function generateCluster() {
    const topic = $('#seoClusterTopic').value.trim() || 'UK small business websites and automation';
    status('Generating topical authority cluster...');
    await api('/api/admin/seo/generate', { method: 'POST', body: JSON.stringify({ topic }) });
    await loadDashboard();
    status('Content cluster generated.');
  }

  async function createReport() {
    status('Creating SEO report...');
    await api('/api/admin/seo/report', { method: 'POST' });
    await loadReports();
    status('SEO report created.');
  }

  document.addEventListener('click', async (event) => {
    const preview = event.target.closest('[data-preview-fix]');
    const task = event.target.closest('[data-task-status]');
    try {
      if (event.target.closest('#seoRunAudit')) await runAudit();
      if (event.target.closest('#seoRefreshTasks')) await loadDashboard();
      if (event.target.closest('#seoCreateReport')) await createReport();
      if (event.target.closest('#seoRefreshReports')) await loadReports();
      if (event.target.closest('#seoGenerateCluster')) await generateCluster();
      if (event.target.closest('#seoClearPreview')) clearPreview();
      if (preview) await previewFix(preview.dataset.previewFix);
      if (task) await updateTask(task.dataset.taskId, task.dataset.taskStatus);
    } catch (err) {
      status(err.message || 'SEO Agent action failed.');
    }
  });

  document.addEventListener('submit', async (event) => {
    try {
      if (event.target.matches('#seoPreviewForm')) await applyPreview(event);
      if (event.target.matches('#seoKeywordForm')) await addKeyword(event);
    } catch (err) {
      status(err.message || 'SEO Agent action failed.');
    }
  });

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await loadDashboard();
      await loadReports();
    } catch (err) {
      status(err.message || 'Unable to load SEO Agent.');
    }
  });
}());
