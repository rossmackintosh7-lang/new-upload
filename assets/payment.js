<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Publish Website • PBI</title>
  <link rel="stylesheet" href="/assets/styles.css">
</head>

<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a class="brand brand-logo-only" href="/">
        <img src="/assets/PBI%20Logo.png" alt="Purbeck Business Innovations logo" class="header-logo">
      </a>

      <div class="row">
        <a class="btn-ghost" href="/dashboard/">Dashboard</a>
        <a class="btn-ghost" href="/login/">Login</a>
      </div>
    </div>
  </nav>

  <main class="container section">
    <div class="payment-hero">
      <p class="eyebrow">Publish your website</p>
      <h1 class="section-title">Choose how your website goes live</h1>
      <p class="hero-text">
        Build for free. When you are ready, choose your website plan, domain setup, or request a custom built website.
      </p>
    </div>

    <div id="paymentMessage" class="notice" style="display:none;margin-bottom:20px"></div>

    <section class="card domain-choice-section">
      <div class="domain-choice-header">
        <div>
          <p class="eyebrow">Domain setup</p>
          <h2>Choose your web address option</h2>
          <p class="muted">
            Not sure which one to choose? Start with the PBI subdomain. You can connect or register a custom domain later.
          </p>
        </div>
      </div>

      <div class="domain-option-grid">
        <label class="domain-option-card recommended-domain">
          <input type="radio" name="domainOption" value="pbi_subdomain" checked>
          <span>
            <strong>PBI subdomain</strong>
            <small>
              Best for launching quickly. Your site goes live on a PBI web address while you test and refine it.
            </small>
            <em>Recommended for first launch</em>
          </span>
        </label>

        <label class="domain-option-card">
          <input type="radio" name="domainOption" value="connect_existing">
          <span>
            <strong>Connect your own domain</strong>
            <small>
              Best if you already own a domain. PBI will guide you through the DNS setup needed to connect it.
            </small>
            <em>Good if you already own a domain</em>
          </span>
        </label>

        <label class="domain-option-card">
          <input type="radio" name="domainOption" value="register_new">
          <span>
            <strong>Register a new domain</strong>
            <small>
              Best if you need a new domain. Domain registration will be charged separately at live cost plus £10/year.
            </small>
            <em>Best for new businesses</em>
          </span>
        </label>
      </div>
    </section>

    <section class="pricing-grid">
      <article class="pricing-card card" data-plan="starter">
        <p class="template-label">Starter Launch</p>
        <h2>£12.99<span>/month</span></h2>
        <p class="muted">
          For a simple local business website launched on a PBI subdomain.
        </p>

        <ul>
          <li>Publish live website</li>
          <li>PBI subdomain</li>
          <li>Hosting and SSL</li>
          <li>Basic support</li>
        </ul>

        <button class="btn planBtn" type="button" data-plan="starter">
          Choose Starter
        </button>
      </article>

      <article class="pricing-card card featured" data-plan="business">
        <p class="template-label">Business Launch</p>
        <h2>£24.99<span>/month</span></h2>
        <p class="muted">
          For most businesses. Publish on a PBI subdomain or connect your own domain.
        </p>

        <ul>
          <li>Everything in Starter</li>
          <li>Connect existing domain</li>
          <li>More pages and images</li>
          <li>Launch guidance</li>
        </ul>

        <button class="btn planBtn" type="button" data-plan="business">
          Choose Business
        </button>
      </article>

      <article class="pricing-card card" data-plan="plus">
        <p class="template-label">Business Plus</p>
        <h2>£39.99<span>/month</span></h2>
        <p class="muted">
          For businesses that want priority support and extra help with setup.
        </p>

        <ul>
          <li>Everything in Business</li>
          <li>Priority support</li>
          <li>Custom domain help</li>
          <li>Extra update support</li>
        </ul>

        <button class="btn planBtn" type="button" data-plan="plus">
          Choose Plus
        </button>
      </article>

      <article class="pricing-card card custom-build-card" data-plan="custom_build_deposit">
        <p class="template-label">Custom Built Website</p>
        <h2>From £1,500</h2>
        <p class="muted">
          For businesses that want PBI to design and build the website for them.
        </p>

        <ul>
          <li>Custom website built by PBI</li>
          <li>Project quoted after enquiry</li>
          <li>£500 deposit once scope is confirmed</li>
          <li>Remaining balance due on completion</li>
          <li>Custom layout, wording and styling</li>
          <li>Launch guidance included</li>
        </ul>

        <button class="btn" id="customBuildRequestBtn" type="button">
          Request Custom Build
        </button>
      </article>
    </section>

    <section class="card assisted-setup">
      <div>
        <p class="eyebrow">Optional extra</p>
        <h2>Assisted setup</h2>
        <p class="muted">
          Want PBI to help with wording, pages, layout and images? Add assisted setup for £99 one-off.
        </p>
      </div>

      <label class="assisted-toggle">
        <input id="assistedSetup" type="checkbox">
        <span>Add £99 assisted setup</span>
      </label>
    </section>

    <section class="card custom-build-form-card" id="customBuildFormSection" style="display:none;">
      <p class="eyebrow">Custom build enquiry</p>
      <h2>Tell us what you need</h2>
      <p class="muted">
        Complete this first so PBI can understand the project before taking a deposit. Once submitted, you’ll have the option to pay the £500 deposit to secure your build slot.
      </p>

      <form id="customBuildForm" class="custom-build-form">
        <div class="grid-2">
          <div class="field">
            <label for="customBusinessName">Business name</label>
            <input id="customBusinessName" name="business_name" class="input" required>
          </div>

          <div class="field">
            <label for="customContactName">Contact name</label>
            <input id="customContactName" name="contact_name" class="input" required>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customEmail">Email address</label>
            <input id="customEmail" name="email" type="email" class="input" required>
          </div>

          <div class="field">
            <label for="customPhone">Phone number</label>
            <input id="customPhone" name="phone" class="input">
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customIndustry">Business type / industry</label>
            <input id="customIndustry" name="industry" class="input" placeholder="Café, electrician, salon, consultant, shop...">
          </div>

          <div class="field">
            <label for="customCurrentWebsite">Current website, if you have one</label>
            <input id="customCurrentWebsite" name="current_website" class="input" placeholder="https://...">
          </div>
        </div>

        <div class="field">
          <label for="customProjectSummary">What would you like your website to do?</label>
          <textarea id="customProjectSummary" name="project_summary" class="textarea" required placeholder="Tell us what you need, what the business does, and what customers should be able to do on the site."></textarea>
        </div>

        <div class="field">
          <label for="customPages">Pages you think you need</label>
          <textarea id="customPages" name="pages_needed" class="textarea" placeholder="Example: Home, About, Services, Gallery, Contact, Menu, Booking, FAQs..."></textarea>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customDomainStatus">Domain status</label>
            <select id="customDomainStatus" name="domain_status" class="select">
              <option value="">Select one</option>
              <option value="already_have_domain">I already have a domain</option>
              <option value="need_new_domain">I need a new domain</option>
              <option value="not_sure">I’m not sure</option>
            </select>
          </div>

          <div class="field">
            <label for="customDomainName">Domain name, if known</label>
            <input id="customDomainName" name="domain_name" class="input" placeholder="yourbusiness.co.uk">
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customLogoStatus">Do you need a logo?</label>
            <select id="customLogoStatus" name="logo_status" class="select">
              <option value="">Select one</option>
              <option value="have_logo">I already have a logo</option>
              <option value="need_logo">I need a logo</option>
              <option value="need_logo_refresh">I have a logo but want it improved</option>
              <option value="not_sure">I’m not sure</option>
            </select>
          </div>

          <div class="field">
            <label for="customBrandColours">Brand colours</label>
            <input id="customBrandColours" name="brand_colours" class="input" placeholder="Example: dark green, cream, gold">
          </div>
        </div>

        <div class="field">
          <label for="customLogoIdeas">Logo ideas / brand style</label>
          <textarea id="customLogoIdeas" name="logo_ideas" class="textarea" placeholder="Tell us what you have in mind for the logo or brand style."></textarea>
        </div>

        <div class="field">
          <label for="customLikedWebsites">Websites you like</label>
          <textarea id="customLikedWebsites" name="liked_websites" class="textarea" placeholder="Paste links to websites you like and say what you like about them."></textarea>
        </div>

        <div class="field">
          <label for="customFeatures">Features needed</label>
          <textarea id="customFeatures" name="features_needed" class="textarea" placeholder="Booking, contact form, payments, menus, gallery, blog, ecommerce-style products, newsletter, members area, etc."></textarea>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customImagesStatus">Do you already have images?</label>
            <select id="customImagesStatus" name="images_status" class="select">
              <option value="">Select one</option>
              <option value="have_images">Yes, I have images</option>
              <option value="need_images">No, I need help with images</option>
              <option value="mixed">Some, but probably need more</option>
            </select>
          </div>

          <div class="field">
            <label for="customWordingHelp">Do you need help with wording?</label>
            <select id="customWordingHelp" name="wording_help" class="select">
              <option value="">Select one</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="some_help">Some help</option>
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label for="customDeadline">Ideal launch date</label>
            <input id="customDeadline" name="deadline" class="input" placeholder="Example: within 4 weeks">
          </div>

          <div class="field">
            <label for="customBudget">Estimated budget</label>
            <select id="customBudget" name="budget" class="select">
              <option value="">Select one</option>
              <option value="1500_2500">£1,500 – £2,500</option>
              <option value="2500_3500">£2,500 – £3,500</option>
              <option value="3500_plus">£3,500+</option>
              <option value="not_sure">I’m not sure yet</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label for="customExtraNotes">Anything else?</label>
          <textarea id="customExtraNotes" name="extra_notes" class="textarea" placeholder="Add anything else that would help us understand the project."></textarea>
        </div>

        <div class="custom-form-actions">
          <button class="btn" type="submit" id="customBuildSubmitBtn">
            Submit Custom Build Request
          </button>

          <button class="btn-ghost" type="button" id="customBuildCancelBtn">
            Cancel
          </button>
        </div>
      </form>
    </section>

    <section class="card custom-build-deposit-card" id="customBuildDepositSection" style="display:none;">
      <p class="eyebrow">Deposit</p>
      <h2>Secure your custom build slot</h2>
      <p class="muted">
        Thanks, your custom build request has been received. If you’re ready to secure your project slot, you can pay the £500 deposit now. The remaining balance will be confirmed after the project scope is reviewed and is payable before final launch.
      </p>

      <button class="btn planBtn" type="button" data-plan="custom_build_deposit">
        Pay £500 Deposit
      </button>
    </section>
  </main>

  <script src="/assets/payment.js"></script>
</body>
</html>
