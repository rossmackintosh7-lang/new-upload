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

    const name = clean(body.name);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const businessName = clean(body.businessName);
    const currentWebsite = clean(body.currentWebsite);
    const projectType = clean(body.projectType);
    const budget = clean(body.budget);
    const timeframe = clean(body.timeframe);
    const message = clean(body.message);

    if (!name || !email || !message) {
      return json(
        {
          success: false,
          error: "Please complete your name, email and message.",
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
          error: "Email service is not configured.",
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
        <h2 style="margin-bottom: 10px;">New custom build enquiry</h2>

        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p>
        <p><strong>Business name:</strong> ${escapeHtml(
          businessName || "Not provided"
        )}</p>
        <p><strong>Current website:</strong> ${escapeHtml(
          currentWebsite || "Not provided"
        )}</p>
        <p><strong>Project type:</strong> ${escapeHtml(
          projectType || "Not provided"
        )}</p>
        <p><strong>Budget:</strong> ${escapeHtml(budget || "Not provided")}</p>
        <p><strong>Timeframe:</strong> ${escapeHtml(
          timeframe || "Not provided"
        )}</p>

        <hr style="margin: 24px 0;" />

        <h3>Message</h3>
        <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
      </div>
    `;

    const text = `
New custom build enquiry

Name: ${name}
Email: ${email}
Phone: ${phone || "Not provided"}
Business name: ${businessName || "Not provided"}
Current website: ${currentWebsite || "Not provided"}
Project type: ${projectType || "Not provided"}
Budget: ${budget || "Not provided"}
Timeframe: ${timeframe || "Not provided"}

Message:
${message}
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
          error: "The enquiry could not be sent. Please try again.",
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
