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

    console.log("Custom build enquiry payload:", JSON.stringify(body));

    const name = pick(body, [
      "name",
      "fullName",
      "customerName",
      "contactName",
      "clientName",
    ]);

    const email = pick(body, [
      "email",
      "customerEmail",
      "contactEmail",
      "clientEmail",
      "emailAddress",
    ]);

    const phone = pick(body, [
      "phone",
      "telephone",
      "mobile",
      "contactNumber",
      "phoneNumber",
    ]);

    const businessName = pick(body, [
      "businessName",
      "company",
      "companyName",
      "business",
    ]);

    const currentWebsite = pick(body, [
      "currentWebsite",
      "website",
      "existingWebsite",
      "websiteUrl",
    ]);

    const websitesLiked = pick(body, [
      "websitesLiked",
      "websitesYouLike",
      "likedWebsites",
      "sitesLiked",
    ]);

    const websitesDisliked = pick(body, [
      "websitesDisliked",
      "websitesYouDislike",
      "dislikedWebsites",
      "sitesDisliked",
    ]);

    const featuresNeeded = pick(body, [
      "featuresNeeded",
      "features",
      "requiredFeatures",
      "websiteFeatures",
    ]);

    const hasImages = pick(body, [
      "hasImages",
      "alreadyHaveImages",
      "images",
      "doYouAlreadyHaveImages",
    ]);

    const needsWording = pick(body, [
      "needsWording",
      "helpWithWording",
      "wording",
      "doYouNeedHelpWithWording",
    ]);

    const launchDate = pick(body, [
      "launchDate",
      "idealLaunchDate",
      "timeframe",
      "deadline",
    ]);

    const budget = pick(body, [
      "budget",
      "estimatedBudget",
      "projectBudget",
    ]);

    const message = pick(body, [
      "message",
      "anythingElse",
      "notes",
      "extraInfo",
      "additionalInfo",
      "details",
      "projectDetails",
    ]);

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
        <h2>New custom build enquiry</h2>

        <h3>Contact details</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
        <p><strong>Business name:</strong> ${escapeHtml(businessName || "Not provided")}</p>
        <p><strong>Current website:</strong> ${escapeHtml(currentWebsite || "Not provided")}</p>

        <hr />

        <h3>Website brief</h3>
        <p><strong>Websites they like:</strong><br>${formatMultiline(websitesLiked || "Not provided")}</p>
        <p><strong>Websites they dislike:</strong><br>${formatMultiline(websitesDisliked || "Not provided")}</p>
        <p><strong>Features needed:</strong><br>${formatMultiline(featuresNeeded || "Not provided")}</p>
        <p><strong>Already has images:</strong> ${escapeHtml(hasImages || "Not provided")}</p>
        <p><strong>Needs help with wording:</strong> ${escapeHtml(needsWording || "Not provided")}</p>
        <p><strong>Ideal launch date:</strong> ${escapeHtml(launchDate || "Not provided")}</p>
        <p><strong>Estimated budget:</strong> ${escapeHtml(budget || "Not provided")}</p>

        <hr />

        <h3>Anything else</h3>
        <p>${formatMultiline(message || "Not provided")}</p>
      </div>
    `;

    const text = `
New custom build enquiry

CONTACT DETAILS
Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
Business name: ${businessName || "Not provided"}
Current website: ${currentWebsite || "Not provided"}

WEBSITE BRIEF
Websites they like:
${websitesLiked || "Not provided"}

Websites they dislike:
${websitesDisliked || "Not provided"}

Features needed:
${featuresNeeded || "Not provided"}

Already has images: ${hasImages || "Not provided"}
Needs help with wording: ${needsWording || "Not provided"}
Ideal launch date: ${launchDate || "Not provided"}
Estimated budget: ${budget || "Not provided"}

ANYTHING ELSE
${message || "Not provided"}
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

function pick(body, keys) {
  for (const key of keys) {
    if (typeof body[key] === "string" && body[key].trim()) {
      return body[key].trim();
    }

    if (typeof body[key] === "number") {
      return String(body[key]);
    }

    if (typeof body[key] === "boolean") {
      return body[key] ? "Yes" : "No";
    }
  }

  return "";
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
