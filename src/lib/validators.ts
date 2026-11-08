/**
 * Specialized RFC protocol validators for Paharadar.
 * - RFC 6797 (HSTS)
 * - RFC 9116 (security.txt)
 * - RFC 7489 (DMARC)
 * - RFC 7208 (SPF)
 * - W3C CSP Level 3 Quality Analysis
 */

export interface HstsValidationResult {
  valid: boolean;
  severity: "pass" | "warn" | "info";
  scoreImpact: number;
  found: string;
  reason: string;
  hasDuplicates: boolean;
  maxAge?: number;
}

/**
 * Validates Strict-Transport-Security header according to RFC 6797 Section 6.1.
 * RFC 6797 Section 6.1 mandates:
 * - max-age directive is REQUIRED.
 * - A given directive MUST NOT appear more than once.
 * - Multiple STS headers or concatenated duplicate directives invalidate HSTS in standard UAs.
 */
export function validateHstsHeader(rawHeader: string | undefined, hasTls: boolean): HstsValidationResult {
  if (!hasTls) {
    return {
      valid: false,
      severity: "info",
      scoreImpact: 0,
      found: "HSTS header is absent (Requires HTTPS to be operational).",
      reason: "Browsers ignore HSTS headers sent over plain HTTP. Enable HTTPS first, then deploy HSTS.",
      hasDuplicates: false,
    };
  }

  if (!rawHeader || !rawHeader.trim()) {
    return {
      valid: false,
      severity: "warn",
      scoreImpact: -8,
      found: "Header is missing from HTTP response.",
      reason: "Server omitted 'Strict-Transport-Security' header from response. Severity: WARN (-8 pts).",
      hasDuplicates: false,
    };
  }

  const raw = rawHeader.trim();

  // 1. Detect duplicate directives (e.g. "max-age=31536000, max-age=31536000")
  const maxAgeMatches = raw.match(/\bmax-age\s*=/gi);
  if (maxAgeMatches && maxAgeMatches.length > 1) {
    return {
      valid: false,
      severity: "warn",
      scoreImpact: -4,
      found: `Malformed HSTS header: duplicate 'max-age' directive detected ('${raw}').`,
      reason: "RFC 6797 Section 6.1 strictly prohibits duplicate directives. When upstream CDNs or proxies duplicate HSTS, browsers treat the header as invalid and void transport security.",
      hasDuplicates: true,
    };
  }

  // 2. Parse and validate max-age numeric value
  const match = raw.match(/\bmax-age\s*=\s*(\d+)/i);
  if (!match) {
    return {
      valid: false,
      severity: "warn",
      scoreImpact: -8,
      found: `Malformed HSTS header: missing or non-numeric max-age value ('${raw}').`,
      reason: "RFC 6797 requires a numeric max-age directive specifying cache duration in seconds.",
      hasDuplicates: false,
    };
  }

  const maxAge = parseInt(match[1], 10);
  if (maxAge === 0) {
    return {
      valid: false,
      severity: "warn",
      scoreImpact: -6,
      found: `HSTS max-age is set to 0 ('${raw}'). This explicitly clears browser HSTS protections.`,
      reason: "A max-age of 0 instructs user agents to delete the domain from the HSTS pin list.",
      hasDuplicates: false,
      maxAge: 0,
    };
  }

  if (maxAge < 10368000) {
    return {
      valid: true,
      severity: "warn",
      scoreImpact: -2,
      found: `HSTS max-age (${maxAge}s) is shorter than recommended 120 days: '${raw}'`,
      reason: "Industry baseline (Mozilla/NIST) recommends at least 10368000 seconds (120 days) or 31536000 seconds (1 year).",
      hasDuplicates: false,
      maxAge,
    };
  }

  const subdomains = /includesubdomains/i.test(raw);
  const preload = /preload/i.test(raw);

  return {
    valid: true,
    severity: "pass",
    scoreImpact: 0,
    found: `Header is present: ${raw}`,
    reason: `Valid HSTS header with max-age of ${maxAge}s (${Math.round(maxAge / 86400)} days)${
      subdomains ? " and includeSubDomains" : ""
    }${preload ? " with preload" : ""}.`,
    hasDuplicates: false,
    maxAge,
  };
}

export type SecurityTxtClassification = "valid" | "expired" | "malformed" | "unrelated_html" | "missing";

export interface SecurityTxtValidationResult {
  classification: SecurityTxtClassification;
  severity: "pass" | "info";
  scoreImpact: number;
  found: string;
  reason: string;
  contact?: string;
  expires?: string;
}

export function validateSecurityTxt(
  status: number | undefined,
  contentType: string | undefined,
  body: string
): SecurityTxtValidationResult {
  if (status !== 200) {
    return {
      classification: "missing",
      severity: "info",
      scoreImpact: 0,
      found: `No security.txt contact file found (HTTP ${status || 404}).`,
      reason: "Missing security.txt is an informational RFC 9116 recommendation. Zero score penalty.",
    };
  }

  const ct = (contentType || "").toLowerCase();
  const trimmedBody = (body || "").trim();

  if (
    ct.includes("text/html") ||
    ct.includes("application/xhtml") ||
    trimmedBody.startsWith("<!DOCTYPE") ||
    trimmedBody.startsWith("<!doctype") ||
    trimmedBody.startsWith("<html") ||
    trimmedBody.includes("<head>")
  ) {
    return {
      classification: "unrelated_html",
      severity: "info",
      scoreImpact: 0,
      found: "Server returned HTTP 200 with HTML content, not a plain-text security.txt file.",
      reason: "The server or SPA framework returned an HTML webpage for /.well-known/security.txt (likely a custom 404 or catch-all route). RFC 9116 Section 2.2 requires media type 'text/plain'.",
    };
  }

  if (!ct.includes("text/plain")) {
    return {
      classification: "malformed",
      severity: "info",
      scoreImpact: 0,
      found: `security.txt returned with non-plaintext Content-Type '${contentType}'.`,
      reason: "RFC 9116 Section 2.2 specifies that security.txt files MUST be served with media type 'text/plain'.",
    };
  }

  const lines = trimmedBody.split(/\r?\n/);
  const directives: Record<string, string[]> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim().toLowerCase();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (!directives[key]) directives[key] = [];
      directives[key].push(val);
    }
  }

  const contacts = directives["contact"] || [];
  const expiresList = directives["expires"] || [];

  if (contacts.length === 0) {
    return {
      classification: "malformed",
      severity: "info",
      scoreImpact: 0,
      found: "security.txt file is published as text/plain but is missing the mandatory 'Contact:' field.",
      reason: "RFC 9116 Section 2.5.3 mandates at least one 'Contact:' directive specifying a sanctioned vulnerability reporting channel.",
    };
  }

  if (expiresList.length === 0) {
    return {
      classification: "malformed",
      severity: "info",
      scoreImpact: 0,
      found: "security.txt file is published as text/plain but is missing the mandatory 'Expires:' field.",
      reason: "RFC 9116 Section 2.5.5 mandates an 'Expires:' directive indicating when disclosure policies expire.",
    };
  }

  const expiresStr = expiresList[0];
  const expiresDate = new Date(expiresStr);

  if (isNaN(expiresDate.getTime())) {
    return {
      classification: "malformed",
      severity: "info",
      scoreImpact: 0,
      found: `security.txt file contains an invalid 'Expires:' timestamp ('${expiresStr}').`,
      reason: "RFC 9116 Section 2.5.5 requires Expires to be formatted according to RFC 3339 / ISO 8601.",
    };
  }

  if (expiresDate.getTime() < Date.now()) {
    return {
      classification: "expired",
      severity: "info",
      scoreImpact: 0,
      found: `security.txt policy expired on ${expiresDate.toISOString().slice(0, 10)}.`,
      reason: "The security.txt file has expired per RFC 9116 Section 2.5.5 and should be refreshed with an updated expiration date.",
      contact: contacts[0],
      expires: expiresStr,
    };
  }

  return {
    classification: "valid",
    severity: "pass",
    scoreImpact: 0,
    found: `Valid RFC 9116 security.txt published at /.well-known/security.txt (Contact: ${contacts[0]} · Expires: ${expiresDate.toISOString().slice(0, 10)}).`,
    reason: "File strictly complies with RFC 9116 with verified Contact URI and active Expires date.",
    contact: contacts[0],
    expires: expiresStr,
  };
}

export interface DmarcAnalysisResult {
  hasRecord: boolean;
  policy: "none" | "quarantine" | "reject" | "unknown";
  subdomainPolicy?: "none" | "quarantine" | "reject";
  percentage?: number;
  rua?: string;
  isEnforced: boolean;
  severity: "pass" | "warn" | "info";
  scoreImpact: number;
  found: string;
  reason: string;
}

/**
 * Accurately parses RFC 7489 DMARC records with proper tag boundaries.
 * Distinguishes organizational policy (p=) from subdomain policy (sp=).
 * Fixes false 'p=none' detection caused by substring matching on 'sp=none'.
 */
export function parseDmarcRecord(
  rawDmarc: string | undefined,
  sendsMail: boolean,
  dmarcHost: string
): DmarcAnalysisResult {
  if (!rawDmarc || !rawDmarc.trim()) {
    return {
      hasRecord: false,
      policy: "unknown",
      isEnforced: false,
      severity: sendsMail ? "warn" : "info",
      scoreImpact: sendsMail ? -8 : 0,
      found: "No DMARC record found in DNS.",
      reason: sendsMail
        ? "Domain receives email (MX configured) but has no DMARC policy to protect against spoofing (-8 pts)."
        : "Domain has no mail exchangers. DMARC recommendation is informational (0 score penalty).",
    };
  }

  const raw = rawDmarc.trim();

  // Parse RFC 7489 key=value tags separated by semicolons
  const extractTag = (tag: string): string | undefined => {
    // Require delimiter (^ or ;) and word boundary before tag to never confuse sp= with p=
    const re = new RegExp(`(?:^|;)\\s*${tag}\\s*=\\s*([^;\\s]+)`, "i");
    const m = raw.match(re);
    return m ? m[1].trim() : undefined;
  };

  const pRaw = extractTag("p")?.toLowerCase();
  const spRaw = extractTag("sp")?.toLowerCase();
  const pctRaw = extractTag("pct");
  const ruaRaw = extractTag("rua");

  const policy: DmarcAnalysisResult["policy"] =
    pRaw === "reject" ? "reject" : pRaw === "quarantine" ? "quarantine" : pRaw === "none" ? "none" : "unknown";

  const subdomainPolicy: DmarcAnalysisResult["subdomainPolicy"] =
    spRaw === "reject" ? "reject" : spRaw === "quarantine" ? "quarantine" : spRaw === "none" ? "none" : undefined;

  const percentage = pctRaw ? parseInt(pctRaw, 10) : 100;
  const isEnforced = policy === "reject" || policy === "quarantine";

  let severity: "pass" | "warn" | "info" = "pass";
  let scoreImpact = 0;
  let found = "";
  let reason = "";

  if (policy === "reject") {
    severity = "pass";
    scoreImpact = 0;
    found = subdomainPolicy
      ? `DMARC Policy: Organizational Domain (p=reject · Active Enforcement) · Subdomains (sp=${subdomainPolicy}) on ${dmarcHost}.`
      : `DMARC Policy: Organizational Domain (p=reject · Active Enforcement) on ${dmarcHost}.`;
    reason = subdomainPolicy && subdomainPolicy !== "reject"
      ? `Organizational domain strictly rejects unauthenticated emails failing SPF/DKIM alignment. Subdomains specify 'sp=${subdomainPolicy}'.`
      : `Maximum email spoofing protection: receiving mail transfer agents (MTAs) will reject messages failing SPF/DKIM alignment across organizational domain and subdomains.`;
  } else if (policy === "quarantine") {
    severity = "pass";
    scoreImpact = 0;
    found = subdomainPolicy
      ? `DMARC Policy: Organizational Domain (p=quarantine · Active Enforcement) · Subdomains (sp=${subdomainPolicy}${subdomainPolicy === "none" ? " · Monitor-Only Mode" : ""}) on ${dmarcHost}.`
      : `DMARC Policy: Organizational Domain (p=quarantine · Active Enforcement) on ${dmarcHost}.`;
    reason = subdomainPolicy === "none"
      ? `The organizational domain (${dmarcHost}) has active quarantine enforcement (mail failing SPF/DKIM is redirected to spam), while subdomains operate under a monitor-only policy (sp=none) where reports are generated but unauthenticated emails are not quarantined.`
      : `Strong email defense: mail failing SPF/DKIM alignment is quarantined into spam folders across domain and subdomains.`;
  } else if (policy === "none") {
    severity = sendsMail ? "warn" : "info";
    scoreImpact = sendsMail ? -4 : 0;
    found = subdomainPolicy
      ? `DMARC Policy: Organizational Domain (p=none · Monitor-Only Mode) · Subdomains (sp=${subdomainPolicy}) on ${dmarcHost}.`
      : `DMARC Policy: Organizational Domain (p=none · Monitor-Only Mode) on ${dmarcHost}.`;
    reason = `DMARC 'p=none' monitors spoofing reports via rua but does not block or quarantine unauthorized emails. Upgrade to 'p=quarantine' or 'p=reject' for active protection.`;
  } else {
    severity = "info";
    scoreImpact = 0;
    found = `DMARC record present with unparsed policy on ${dmarcHost}: '${raw}'`;
    reason = "DMARC record was detected but contains an unrecognized policy tag format.";
  }

  return {
    hasRecord: true,
    policy,
    subdomainPolicy,
    percentage,
    rua: ruaRaw,
    isEnforced,
    severity,
    scoreImpact,
    found,
    reason,
  };
}

export interface CspQualityResult {
  hasHeader: boolean;
  isStrong: boolean;
  severity: "pass" | "warn" | "info";
  scoreImpact: number;
  hasUnsafeInline: boolean;
  hasUnsafeEval: boolean;
  hasWildcard: boolean;
  hasInsecureScheme: boolean;
  found: string;
  reason: string;
}

/**
 * Evaluates Content-Security-Policy presence and qualitative strength.
 * Distinguishes strong restrictive policies from permissive ones (unsafe-inline, unsafe-eval, wildcards).
 */
export function assessCspQuality(rawCsp: string | undefined): CspQualityResult {
  if (!rawCsp || !rawCsp.trim()) {
    return {
      hasHeader: false,
      isStrong: false,
      severity: "warn",
      scoreImpact: -8,
      hasUnsafeInline: false,
      hasUnsafeEval: false,
      hasWildcard: false,
      hasInsecureScheme: false,
      found: "Header is missing from HTTP response.",
      reason: "Server omitted 'Content-Security-Policy' header from response. Severity: WARN (-8 pts).",
    };
  }

  const raw = rawCsp.trim();
  const hasUnsafeInline = /'unsafe-inline'/i.test(raw);
  const hasUnsafeEval = /'unsafe-eval'/i.test(raw);
  const hasWildcard = /(?:script-src|default-src)[^;]*\s+\*\s*/i.test(raw) || /(?:script-src|default-src)[^;]*\s+\*;/i.test(raw);
  const hasInsecureScheme = /(?:^|;)[^;]*\bhttp:\/\//i.test(raw) || /(?:^|;)[^;]*\s+http:\s*/i.test(raw);

  const weaknesses: string[] = [];
  if (hasUnsafeInline) weaknesses.push("'unsafe-inline' (allows inline script execution)");
  if (hasUnsafeEval) weaknesses.push("'unsafe-eval' (allows eval and dynamic script synthesis)");
  if (hasWildcard) weaknesses.push("wildcard source '*' (permits script loading from any origin)");
  if (hasInsecureScheme) weaknesses.push("unencrypted 'http:' sources allowed");

  const isStrong = weaknesses.length === 0;

  if (isStrong) {
    return {
      hasHeader: true,
      isStrong: true,
      severity: "pass",
      scoreImpact: 0,
      hasUnsafeInline,
      hasUnsafeEval,
      hasWildcard,
      hasInsecureScheme,
      found: `Strict Content-Security-Policy active without permissive directives: ${raw.slice(0, 90)}${raw.length > 90 ? "..." : ""}`,
      reason: "CSP enforces restrictive resource boundaries without 'unsafe-inline' or 'unsafe-eval'.",
    };
  }

  return {
    hasHeader: true,
    isStrong: false,
    severity: "info",
    scoreImpact: 0,
    hasUnsafeInline,
    hasUnsafeEval,
    hasWildcard,
    hasInsecureScheme,
    found: `Content-Security-Policy: PRESENT — WEAK POLICY. Header is active but includes permissive directives: ${weaknesses.join(", ")}.`,
    reason: `CSP is deployed, but permissive directives (${weaknesses.slice(0, 2).join(" and ")}) relax script execution boundaries, commonly needed for third-party scripts, ad tags, or legacy analytics. Note: This assessment evaluates configuration robustness, not proof of an exploitable vulnerability. Assigned 0 score penalty.`,
  };
}

export interface SpfAssessmentResult {
  hasRecord: boolean;
  qualifier: "-all" | "~all" | "?all" | "+all" | "missing";
  severity: "pass" | "warn" | "info";
  scoreImpact: number;
  found: string;
  reason: string;
}

/**
 * Assesses SPF record presence and enforcement qualifier (-all HardFail vs ~all SoftFail).
 */
export function assessSpfRecord(spfRecord: string | undefined, sendsMail: boolean, spfHost: string): SpfAssessmentResult {
  if (!spfRecord || !spfRecord.trim()) {
    return {
      hasRecord: false,
      qualifier: "missing",
      severity: sendsMail ? "warn" : "info",
      scoreImpact: sendsMail ? -8 : 0,
      found: sendsMail
        ? `Domain receives email (MX configured) but has no SPF record published on ${spfHost}.`
        : "No SPF record published. (Domain has no mail servers configured; an SPF record is still recommended).",
      reason: sendsMail
        ? "Domain has active MX records but lacks an SPF policy to authorize senders (-8 pts)."
        : "Domain has no MX records configured. Missing SPF is an informational recommendation with 0 score penalty.",
    };
  }

  const raw = spfRecord.trim();
  let qualifier: SpfAssessmentResult["qualifier"] = "missing";

  if (/\s-all\b/i.test(raw)) qualifier = "-all";
  else if (/\s~all\b/i.test(raw)) qualifier = "~all";
  else if (/\s\?all\b/i.test(raw)) qualifier = "?all";
  else if (/\s\+all\b/i.test(raw)) qualifier = "+all";

  let found = "";
  let reason = "";

  if (qualifier === "-all") {
    found = `SPF record published with strict HardFail enforcement (-all) on ${spfHost}: '${raw}'`;
    reason = "Valid SPF policy with strict HardFail (-all). Unauthorized sending servers will be rejected outright by receiving mail transfer agents.";
  } else if (qualifier === "~all") {
    found = `SPF record published with SoftFail enforcement (~all) on ${spfHost}: '${raw}'`;
    reason = "Valid SPF policy with SoftFail (~all). Messages from unauthorized servers are accepted and flagged/scrutinized rather than rejected. Note: SPF record presence alone does not guarantee anti-spoofing without DMARC enforcement.";
  } else if (qualifier === "+all") {
    found = `Permissive SPF record (+all) published on ${spfHost}: '${raw}'`;
    reason = "SPF '+all' directive authorizes the entire Internet to send mail on behalf of this domain. This completely undermines email protection.";
  } else {
    found = `SPF record published on ${spfHost}: '${raw}'`;
    reason = "SPF policy is active in DNS TXT records.";
  }

  return {
    hasRecord: true,
    qualifier,
    severity: qualifier === "+all" ? "warn" : "pass",
    scoreImpact: qualifier === "+all" ? -8 : 0,
    found,
    reason,
  };
}
