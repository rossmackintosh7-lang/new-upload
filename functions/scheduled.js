const DEFAULT_PAGES = [
  "/",
  "/builder/",
  "/custom-build/",
  "/pricing/",
  "/contact/",
  "/about/",
  "/seo-agent/"
];

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : "";
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function calculateScore(data, issues) {
  let score = 100;

  for (const issue of issues) {
    if (issue.severity === "high") score -= 20;
    if (issue.severity === "medium") score -= 10;
    if (issue.severity === "low") score -= 5;
  }

  if (data.wordCount > 500) score += 5;

  if (
    data.title &&
    data.title.length >= 35 &&
    data.title.length <= 65
  ) {
    score += 5;
  }

  if (
    data.metaDescription &&
    data.metaDescription.length >= 120 &&
    data.metaDescription.length <= 160
  ) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function analysePage(url, html, statusCode) {
  const title = extractTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i);

  const metaDescription = extractTag(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );

  const h1Raw = extractTag(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = stripHtml(h1Raw);

  const canonical = extractTag(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i
  );

  const robots = extractTag(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i
  );

  const visibleText = stripHtml(html);
  const wordCount = countWords(visibleText);

  const h1Matches = html.match(/<h1[^>]*>/gi) || [];

  const issues = [];

  if (statusCode < 200 || statusCode >= 400) {
    issues.push({
      issue_type: "status_code",
      issue_text: `Page returned status code ${statusCode}.`,
      severity: "high"
    });
  }

  if (!title) {
    issues.push({
      issue_type: "missing_title",
      issue_text: "Page is missing a title tag.",
      severity: "high"
    });
  } else if (title.length < 30) {
    issues.push({
      issue_type: "short_title",
      issue_text: "Page title is quite short. Aim for around 35 to 65 characters.",
      severity: "medium"
    });
  } else if (title.length > 70) {
    issues.push({
      issue_type: "long_title",
      issue_text: "Page title may be too long. Aim for around 35 to 65 characters.",
      severity: "medium"
    });
  }

  if (!metaDescription) {
    issues.push({
      issue_type: "missing_meta_description",
      issue_text: "Page is missing a meta description.",
      severity: "high"
    });
  } else if (metaDescription.length < 100) {
    issues.push({
      issue_type: "short_meta_description",
      issue_text: "Meta description is short. Aim for around 120 to 160 characters.",
      severity: "medium"
    });
  } else if (metaDescription.length > 170) {
    issues.push({
      issue_type: "long_meta_description",
      issue_text: "Meta description may be too long. Aim for around 120 to 160 characters.",
      severity: "medium"
    });
  }

  if (!h1) {
    issues.push({
      issue_type: "missing_h1",
      issue_text: "Page is missing an H1 heading.",
      severity: "high"
    });
  }

  if (h1Matches.length > 1) {
    issues.push({
      issue_type: "multiple_h1",
      issue_text: "Page has more than one H1 heading.",
      severity: "medium"
    });
  }

  if (!canonical) {
    issues.push({
      issue_type: "missing_canonical",
      issue_text: "Page is missing a canonical URL.",
      severity: "medium"
    });
  }

  if (robots && robots.toLowerCase().includes("noindex")) {
    issues.push({
      issue_type: "noindex",
      issue_text: "Page is set to noindex, so Google may not show it in search.",
      severity: "high"
    });
  }

  if (wordCount < 250) {
    issues.push({
      issue_type: "thin_content",
      issue_text: "Page has low visible word count. Add useful content that explains the service clearly.",
      severity: "medium"
    });
  }

  const data = {
    url,
    title,
    metaDescription,
    h1,
    canonical,
    robots,
    wordCount,
    statusCode
  };

  const seoScore = calculateScore(data, issues);

  return {
    ...data,
    seoScore,
    issues
  };
}

async function savePageResult(db, analysed) {
  await db
    .prepare(`
      INSERT INTO seo_pages (
        url,
        title,
        meta_description,
        h1,
        canonical,
        robots,
        word_count,
        status_code,
        seo_score,
        last_checked
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        meta_description = excluded.meta_description,
        h1 = excluded.h1,
        canonical = excluded.canonical,
        robots = excluded.robots,
        word_count = excluded.word_count,
        status_code = excluded.status_code,
        seo_score = excluded.seo_score,
        last_checked = datetime('now')
    `)
    .bind(
      analysed.url,
      analysed.title,
      analysed.metaDescription,
      analysed.h1,
      analysed.canonical,
      analysed.robots,
      analysed.wordCount,
      analysed.statusCode,
      analysed.seoScore
    )
    .run();

  await db
    .prepare(`
      UPDATE seo_issues
      SET status = 'resolved'
      WHERE page_url = ?
      AND status = 'open'
    `)
    .bind(analysed.url)
    .run();

  for (const issue of analysed.issues) {
    await db
      .prepare(`
        INSERT INTO seo_issues (
          page_url,
          issue_type,
          issue_text,
          severity,
          status
        )
        VALUES (?, ?, ?, ?, 'open')
      `)
      .bind(
        analysed.url,
        issue.issue_type,
        issue.issue_text,
        issue.severity
      )
      .run();
  }
}

async function createWeeklyReport(db, results) {
  const totalPages = results.length;
  const totalIssues = results.reduce(
    (sum, page) => sum + page.issues.length,
    0
  );

  const averageScore = totalPages
    ? Math.round(
        results.reduce((sum, page) => sum + page.seoScore, 0) / totalPages
      )
    : 0;

  const highIssues = results.reduce(
    (sum, page) =>
      sum + page.issues.filter((issue) => issue.severity === "high").length,
    0
  );

  const mediumIssues = results.reduce(
    (sum, page) =>
      sum + page.issues.filter((issue) => issue.severity === "medium").length,
    0
  );

  const weakestPages = [...results]
    .sort((a, b) => a.seoScore - b.seoScore)
    .slice(0, 3)
    .map((page) => `${page.url} (${page.seoScore}/100)`)
    .join(", ");

  const summary = [
    `Weekly SEO scan completed.`,
    `Scanned ${totalPages} pages.`,
    `Average SEO score: ${averageScore}/100.`,
    `Open issues found: ${totalIssues}.`,
    `High issues: ${highIssues}.`,
    `Medium issues: ${mediumIssues}.`,
    weakestPages ? `Weakest pages: ${weakestPages}.` : ""
  ]
    .filter(Boolean)
    .join(" ");

  await db
    .prepare(`
      INSERT INTO seo_reports (
        report_date,
        total_pages,
        total_issues,
        average_score,
        summary
      )
      VALUES (
        date('now'),
        ?,
        ?,
        ?,
        ?
      )
    `)
    .bind(
      totalPages,
      totalIssues,
      averageScore,
      summary
    )
    .run();

  return {
    totalPages,
    totalIssues,
    averageScore,
    highIssues,
    mediumIssues,
    summary
  };
}

async function runSeoScan(env) {
  const db = env.DB;

  if (!db) {
    throw new Error("D1 binding DB is missing.");
  }

  const baseUrl =
    env.PBI_BASE_URL ||
    "https://www.purbeckbusinessinnovations.co.uk";

  const pages = env.PBI_SEO_PAGES
    ? env.PBI_SEO_PAGES.split(",").map((page) => page.trim()).filter(Boolean)
    : DEFAULT_PAGES;

  const results = [];

  for (const path of pages) {
    const fullUrl = path.startsWith("http")
      ? path
      : `${baseUrl}${path}`;

    let html = "";
    let statusCode = 0;

    try {
      const response = await fetch(fullUrl, {
        headers: {
          "User-Agent": "PBI-SEO-Agent/1.0 Scheduled Scanner"
        }
      });

      statusCode = response.status;
      html = await response.text();
    } catch (error) {
      statusCode = 0;
      html = "";
    }

    const analysed = analysePage(fullUrl, html, statusCode);

    await savePageResult(db, analysed);

    results.push(analysed);
  }

  const report = await createWeeklyReport(db, results);

  return {
    success: true,
    report,
    results
  };
}

/**
 * Cloudflare Pages scheduled function.
 *
 * This runs automatically when connected to a Cloudflare Cron Trigger.
 */
export async function onScheduled(event, env, ctx) {
  ctx.waitUntil(runSeoScan(env));
}

/**
 * Optional manual test endpoint.
 *
 * Visit:
 * /scheduled
 *
 * Or POST to:
 * /scheduled
 *
 * This is useful while testing deployment.
 */
export async function onRequest(context) {
  try {
    const result = await runSeoScan(context.env);

    return Response.json({
      success: true,
      message: "Scheduled SEO scan ran manually.",
      report: result.report
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message || "Scheduled SEO scan failed."
      },
      {
        status: 500
      }
    );
  }
}
