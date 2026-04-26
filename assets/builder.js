<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Builder • PBI</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a class="brand" href="/">
        <div class="brand-mark"></div>
        <div>
          <div class="brand-title">PBI</div>
          <div class="brand-sub">Purbeck Business Innovations</div>
        </div>
      </a>

      <div class="row">
        <button class="btn-ghost" id="backBtn">Dashboard</button>
        <button class="btn-ghost" id="logoutBtn">Logout</button>
        <button class="btn" id="saveBtn">Save project</button>
      </div>
    </div>
  </nav>

  <main class="container section">
    <div class="row-between" style="margin-bottom:18px">
      <div>
        <h1 class="section-title">Website builder</h1>
        <p class="muted">Edit content on the left. The live preview stays on the right.</p>
      </div>

      <div class="row">
        <button class="btn-ghost" id="checkDomainBtn">Check domain</button>
        <button class="btn-secondary" id="onboardDomainBtn">Onboard custom hostname</button>
      </div>
    </div>

    <div class="builder-app">
      <div class="builder-layout">
        <section class="builder-left">
          <div class="builder-stack">
            <div class="card">
              <h3>Project</h3>

              <div class="field">
                <label>Project name</label>
                <input id="projectName" class="input">
              </div>

              <div class="field">
                <label>Business name</label>
                <input id="businessName" class="input">
              </div>

              <div class="grid-2">
                <div class="field">
                  <label>Location</label>
                  <input id="location" class="input">
                </div>

                <div class="field">
                  <label>Accent colour</label>
                  <input id="accentColor" class="input" type="color" value="#ff8a1a">
                </div>
              </div>

              <div class="field">
                <label>Brand tone</label>
                <textarea id="brandTone" class="textarea"></textarea>
              </div>
            </div>

            <div class="card">
              <h3>Brand assets</h3>

              <div class="field">
                <label>Upload logo</label>
                <input id="logoUpload" class="input" type="file" accept="image/*">
              </div>

              <div class="field">
                <label>Upload gallery images</label>
                <input id="galleryUpload" class="input" type="file" accept="image/*" multiple>
              </div>

              <div id="galleryThumbs" class="thumb-grid"></div>
            </div>

            <div class="card">
              <h3>Domain</h3>

              <div class="grid-2">
                <div class="field">
                  <label>Use custom domain</label>
                  <select id="useCustomDomain" class="select">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>

                <div class="field">
                  <label>HTTPS</label>
                  <select id="httpsEnabled" class="select">
                    <option value="true">On</option>
                    <option value="false">Off</option>
                  </select>
                </div>
              </div>

              <div class="field">
                <label>PBI subdomain slug</label>
                <input id="subdomainSlug" class="input" placeholder="your-business">
              </div>

              <div class="field">
                <label>Custom domain</label>
                <input id="customDomain" class="input" placeholder="www.yourdomain.co.uk">
              </div>

              <div id="domainResult" class="notice">No domain check run yet.</div>
            </div>
          </div>
        </section>

        <aside class="builder-right">
          <div class="preview-panel">
            <div class="preview-top">
              <div>
                <div class="muted" style="font-size:12px;text-transform:uppercase;letter-spacing:.16em">Live preview</div>
                <div style="font-size:24px;font-weight:700;margin-top:4px">Website window</div>
              </div>

              <div class="toggle-group">
                <button id="desktopBtn" class="active">Desktop</button>
                <button id="mobileBtn">Mobile</button>
              </div>
            </div>

            <div id="previewFrame" class="browser">
              <div class="browser-bar">
                <span class="browser-dot"></span>
                <span class="browser-dot"></span>
                <span class="browser-dot"></span>
                <div class="address">https://your-business.pbi.dev</div>
              </div>

              <div class="preview-scroll">
                <div class="site-nav">
                  <div class="site-brand">
                    <div class="site-logo"></div>
                    <span>YOUR BUSINESS</span>
                  </div>

                  <div class="site-links">
                    <button class="active">Home</button>
                    <button>About</button>
                    <button>Services</button>
                    <button>Contact</button>
                  </div>
                </div>

                <div class="page">
                  <h2>Your homepage headline</h2>
                  <p>Your website intro will appear here as you build it out.</p>
                </div>

                <footer class="preview-footer">© Your Business • Crafted with PBI</footer>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </main>

  <script src="/assets/builder.js"></script>
</body>
</html>
