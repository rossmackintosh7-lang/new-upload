export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    const name = clean(body.contact_name || body.name);
    const email = clean(body.email);
    const phone = clean(body.phone);

    const businessName = clean(body.business_name);
    const industry = clean(body.industry);
    const currentWebsite = clean(body.current_website);

    const projectSummary = clean(body.project_summary);
    const likedWebsites = clean(body.liked_websites);
    const dislikedWebsites = clean(body.disliked_websites);
    const featuresNeeded = clean(body.features_needed);
    const pagesNeeded = clean(body.pages_needed);

    const brandColours = clean(body.brand_colours);
    const logoStatus = clean(body.logo_status);
    const logoIdeas = clean(body.logo_ideas);

    const domainOption = clean(body.domain_option);
    const domainName = clean(body.domain_name);
    const domainStatus = clean(body.domain_status);

    const imagesStatus = clean(body.images_status);
    const wordingHelp = clean(body.wording_help);
    const deadline = clean(body.deadline);
    const budget = clean(body.budget);

    const extraNotes = clean(body.extra_notes);

    if (!name || !email) {
      return json(
        {
          success: false,
          error: "Please complete your name and email.",
          receivedFields: Object.keys(body),
        },
        400
      );
    }

    if (!isValidEmail(email)) {
      return json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        400
      );
    }

    if (!env.RESEND_API_KEY) {
      return json(
        {
          success: false,
          error: "Email service is not configured. Missing RESEND_API_KEY.",
        },
        500
      );
    }

    const notifyTo =
      env.CUSTOM_BUILD_NOTIFY_TO || "info@purbeckbusinessinnovations.co.uk";

    const notifyFrom =
      env.CUSTOM_BUILD_NOTIFY_FROM ||
      "PBI Enquiries <enquiry@purbeckbusinessinnovations.co.uk>";

    const subject = `New PBI custom build enquiry from ${name}`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>New PBI Custom Build Enquiry</h2>

        <h3>Contact details</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>

        <hr />

        <h3>Business details</h3>
        <p><strong>Business name:</strong> ${escapeHtml(businessName || "Not provided")}</p>
        <p><strong>Industry:</strong> ${escapeHtml(industry || "Not provided")}</p>
        <p><strong>Current website:</strong> ${escapeHtml(currentWebsite || "Not provided")}</p>

        <hr />

        <h3>Website brief</h3>
        <p><strong>Project summary:</strong><br>${formatMultiline(projectSummary || "Not provided")}</p>
        <p><strong>Pages needed:</strong><br>${formatMultiline(pagesNeeded || "Not provided")}</p>
        <p><strong>Features needed:</strong><br>${formatMultiline(featuresNeeded || "Not provided")}</p>
        <p><strong>Websites they like:</strong><br>${formatMultiline(likedWebsites || "Not provided")}</p>
        <p><strong>Websites they dislike:</strong><br>${formatMultiline(dislikedWebsites || "Not provided")}</p>

        <hr />

        <h3>Branding</h3>
        <p><strong>Brand colours:</strong> ${escapeHtml(brandColours || "Not provided")}</p>
        <p><strong>Logo status:</strong> ${escapeHtml(logoStatus || "Not provided")}</p>
        <p><strong>Logo ideas:</strong><br>${formatMultiline(logoIdeas || "Not provided")}</p>

        <hr />

        <h3>Domain</h3>
        <p><strong>Domain option:</strong> ${escapeHtml(domainOption || "Not provided")}</p>
        <p><strong>Domain name:</strong> ${escapeHtml(domainName || "Not provided")}</p>
        <p><strong>Domain status:</strong> ${escapeHtml(domainStatus || "Not provided")}</p>

        <hr />

        <h3>Project details</h3>
        <p><strong>Images status:</strong> ${escapeHtml(imagesStatus || "Not provided")}</p>
        <p><strong>Wording help:</strong> ${escapeHtml(wordingHelp || "Not provided")}</p>
        <p><strong>Ideal launch date:</strong> ${escapeHtml(deadline || "Not provided")}</p>
        <p><strong>Estimated budget:</strong> ${escapeHtml(budget || "Not provided")}</p>

        <hr />

        <h3>Anything else</h3>
        <p>${formatMultiline(extraNotes || "Not provided")}</p>
      </div>
    `;

    const text = `
New PBI Custom Build Enquiry

CONTACT DETAILS
Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}

BUSINESS DETAILS
Business name: ${businessName || "Not provided"}
Industry: ${industry || "Not provided"}
Current website: ${currentWebsite || "Not provided"}

WEBSITE BRIEF
Project summary:
${projectSummary || "Not provided"}

Pages needed:
${pagesNeeded || "Not provided"}

Features needed:
${featuresNeeded || "Not provided"}

Websites they like:
${likedWebsites || "Not provided"}

Websites they dislike:
${dislikedWebsites || "Not provided"}

BRANDING
Brand colours: ${brandColours || "Not provided"}
Logo status: ${logoStatus || "Not provided"}
Logo ideas:
${logoIdeas || "Not provided"}

DOMAIN
Domain option: ${domainOption || "Not provided"}
Domain name: ${domainName || "Not provided"}
Domain status: ${domainStatus || "Not provided"}

PROJECT DETAILS
Images status: ${imagesStatus || "Not provided"}
Wording help: ${wordingHelp || "Not provided"}
Ideal launch date: ${deadline || "Not provided"}
Estimated budget: ${budget || "Not provided"}

ANYTHING ELSE
${extraNotes || "Not provided"}
    `.trim();

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notifyFrom,
        to: [notifyTo],
        reply_to: email,
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      console.error("Resend error:", resendData);

      return json(
        {
          success: false,
          error: "The enquiry could not be sent through Resend.",
          resendError: resendData,
        },
        500
      );
    }

    return json({
      success: true,
      message: "Your enquiry has been sent successfully.",
      id: resendData?.id || null,
    });
  } catch (error) {
    console.error("Custom build enquiry error:", error);

    return json(
      {
        success: false,
        error: "Something went wrong while sending your enquiry.",
      },
      500
    );
  }
}

export async function onRequestGet() {
  return json(
    {
      success: false,
      error: "Method not allowed.",
    },
    405
  );
}

function clean(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMultiline(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
