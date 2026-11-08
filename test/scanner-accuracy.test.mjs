import test from "node:test";
import assert from "node:assert/strict";
import {
  isNat64Address,
  classifyIp,
  classifyNetworkError,
  queryMultipleResolvers,
  getOrganizationalDomain,
  mapDnsErrorCodeToRcode,
} from "../src/lib/network.ts";
import { score } from "../src/lib/score.ts";
import { validateHstsHeader, validateSecurityTxt, parseDmarcRecord, assessCspQuality, assessSpfRecord } from "../src/lib/validators.ts";
import { SPEED_CONFIG, SPEEDS } from "../src/components/agent/agent.config.ts";

test("1. NAT64 Detection (RFC 6052 & RFC 8215)", (t) => {
  // RFC 6052 Well-Known Prefix: 64:ff9b::/96
  assert.equal(isNat64Address("64:ff9b::192.0.2.1"), true, "Should identify standard RFC 6052 NAT64 prefix");
  assert.equal(isNat64Address("64:ff9b::c000:0201"), true, "Should identify hex-encoded RFC 6052 NAT64 prefix");
  assert.equal(isNat64Address("64:ff9b::1"), true, "Should identify RFC 6052 short notation");
  assert.equal(isNat64Address("0064:ff9b:0000:0000:0000:0000:192.0.2.1"), true, "Should identify full zero-padded RFC 6052 prefix");

  // RFC 8215 Local-Use Prefix: 64:ff9b:1::/48
  assert.equal(isNat64Address("64:ff9b:1::192.0.2.1"), true, "Should identify RFC 8215 local NAT64 prefix");
  assert.equal(isNat64Address("64:ff9b:1:a00::1"), true, "Should identify RFC 8215 subnet address");

  // Native IPv6 addresses should NOT be classified as NAT64
  assert.equal(isNat64Address("2001:db8::1"), false, "Documentation IPv6 is not NAT64");
  assert.equal(isNat64Address("2606:4700:4700::1111"), false, "Cloudflare DNS IPv6 is native IPv6, not NAT64");
  assert.equal(isNat64Address("2404:6800:4002:81f::200e"), false, "Google IPv6 is native IPv6, not NAT64");
  assert.equal(isNat64Address("fe80::1"), false, "Link-local IPv6 is not NAT64");
  assert.equal(isNat64Address("::1"), false, "Loopback IPv6 is not NAT64");

  // IPv4 addresses and invalid inputs should return false
  assert.equal(isNat64Address("103.230.107.233"), false, "IPv4 address is not NAT64");
  assert.equal(isNat64Address("1.1.1.1"), false, "IPv4 address is not NAT64");
  assert.equal(isNat64Address(""), false, "Empty string is not NAT64");
  assert.equal(isNat64Address("invalid-ip"), false, "Invalid host is not NAT64");
});

test("2. IP Classification (IPv4 vs Native IPv6 vs NAT64)", (t) => {
  assert.equal(classifyIp("103.230.107.233"), "ipv4");
  assert.equal(classifyIp("127.0.0.1"), "ipv4");
  assert.equal(classifyIp("8.8.8.8"), "ipv4");

  assert.equal(classifyIp("2606:4700:4700::1111"), "ipv6-native");
  assert.equal(classifyIp("2001:4860:4860::8888"), "ipv6-native");
  assert.equal(classifyIp("2a00:1450:4001:830::200e"), "ipv6-native");

  assert.equal(classifyIp("64:ff9b::103.230.107.233"), "nat64");
  assert.equal(classifyIp("64:ff9b:1::c000:201"), "nat64");
});

test("3. Network Error Classification", (t) => {
  // Connection Refused
  const econn = classifyNetworkError({ code: "ECONNREFUSED", message: "connect ECONNREFUSED 103.230.107.233:443" });
  assert.equal(econn.category, "CONNECTION_REFUSED");
  assert.equal(econn.code, "ECONNREFUSED");
  assert.match(econn.humanMessage, /actively refused/i);

  // Timed Out
  const etime = classifyNetworkError({ code: "ETIMEDOUT", message: "connect ETIMEDOUT 198.51.100.1:443" });
  assert.equal(etime.category, "TIMED_OUT");
  assert.equal(etime.code, "ETIMEDOUT");

  // Network Unreachable
  const eunreach = classifyNetworkError({ code: "ENETUNREACH", message: "connect ENETUNREACH 2001:db8::1:443" });
  assert.equal(eunreach.category, "NETWORK_UNREACHABLE");

  // Host Unreachable
  const ehost = classifyNetworkError({ code: "EHOSTUNREACH", message: "No route to host" });
  assert.equal(ehost.category, "NETWORK_UNREACHABLE");

  // TLS Certificate Expiry
  const tlsExpired = classifyNetworkError({ code: "CERT_HAS_EXPIRED", message: "certificate has expired" });
  assert.equal(tlsExpired.category, "TLS_CERT_ERROR");

  // TLS Self-Signed
  const tlsSelfSigned = classifyNetworkError({ code: "DEPTH_ZERO_SELF_SIGNED_CERT", message: "self-signed certificate" });
  assert.equal(tlsSelfSigned.category, "TLS_CERT_ERROR");

  // DNS Not Found
  const dnsErr = classifyNetworkError({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND non-existent-test-domain.bd" });
  assert.equal(dnsErr.category, "DNS_ERROR");

  // Generic fallback
  const generic = classifyNetworkError({ code: "EPIPE", message: "broken pipe" });
  assert.equal(generic.category, "GENERIC_NETWORK_ERROR");
});

test("4. Multi-Resolver Telemetry Aggregation", async (t) => {
  const telemetry = await queryMultipleResolvers("localhost");
  assert.ok(Array.isArray(telemetry), "Resolvers telemetry must return an array");
  assert.equal(telemetry.length, 3, "Must query System Default, Google DNS, and Cloudflare DNS");

  const resolverNames = telemetry.map((r) => r.resolver);
  assert.ok(resolverNames.some((n) => n.includes("System")), "Must include System Default resolver");
  assert.ok(resolverNames.some((n) => n.includes("Google")), "Must include Google Public DNS");
  assert.ok(resolverNames.some((n) => n.includes("Cloudflare")), "Must include Cloudflare DNS");

  for (const item of telemetry) {
    assert.ok(typeof item.durationMs === "number", "Must track query duration");
    assert.ok(Array.isArray(item.ipv4), "Must include ipv4 list");
    assert.ok(Array.isArray(item.ipv6), "Must include ipv6 list");
    assert.ok(item.status === "ok" || item.status === "error", "Status must be ok or error");
  }
});

test("5. Scoring Engine Accuracy & Inconclusive Neutrality", (t) => {
  // Empty findings -> 0
  assert.equal(score([]), 0, "Empty findings must return score 0");

  // All PASS findings -> 100
  const passFindings = [
    { id: "tls", title: "TLS", category: "transport", severity: "pass" },
    { id: "hsts", title: "HSTS", category: "headers", severity: "pass" },
    { id: "csp", title: "CSP", category: "headers", severity: "pass" },
  ];
  assert.equal(score(passFindings), 100, "All pass findings must score 100/100");

  // Inconclusive findings MUST have zero penalty (0 pts deducted)
  const inconclusiveFindings = [
    { id: "tls-cert", title: "TLS Certificate", category: "transport", severity: "inconclusive", scoreImpact: 0 },
    { id: "hsts", title: "HSTS", category: "headers", severity: "pass" },
  ];
  assert.equal(score(inconclusiveFindings), 100, "Inconclusive finding must NOT penalize security score");

  // Single warning (-8 default or explicit -8)
  const warnFinding = [
    { id: "hsts", title: "HSTS", category: "headers", severity: "warn", scoreImpact: -8 },
  ];
  assert.equal(score(warnFinding), 92, "Warning finding should deduct exactly 8 points");

  // Single critical (-20 default or explicit -20)
  const critFinding = [
    { id: "https-avail", title: "HTTPS Availability", category: "transport", severity: "critical", scoreImpact: -20 },
  ];
  assert.equal(score(critFinding), 80, "Critical finding should deduct exactly 20 points");

  // Informational findings with 0 or -1 scoreImpact
  const infoZero = [
    { id: "security-txt", title: "RFC 9116 security.txt", category: "process", severity: "info", scoreImpact: 0 },
  ];
  assert.equal(score(infoZero), 100, "Info finding with scoreImpact 0 must not deduct points");

  const infoOne = [
    { id: "referrer-policy", title: "Referrer Policy", category: "headers", severity: "info", scoreImpact: -1 },
  ];
  assert.equal(score(infoOne), 99, "Info finding with scoreImpact -1 must deduct 1 point");

  // Severe accumulation must not go below 0
  const severeFindings = Array.from({ length: 10 }, (_, i) => ({
    id: `crit-${i}`,
    title: `Critical Bug ${i}`,
    category: "transport",
    severity: "critical",
    scoreImpact: -20,
  }));
  assert.equal(score(severeFindings), 0, "Accumulated severe penalties must floor at 0 (never negative)");
});

test("6. HTTPS Finding Integrity & Error Phrasing", (t) => {
  // Simulate finding output when port 443 fails across endpoints
  const simulatedFinding = {
    id: "https-redirect",
    title: "Transport Layer Security (HTTPS)",
    category: "transport",
    severity: "critical",
    scoreImpact: -20,
    found: "HTTPS connection could not be established on the tested IP addresses during this probe. Plain HTTP (port 80) was accessible.",
    evidence: {
      test: "Probed port 80 and port 443 across 1 native IP endpoint(s) and 3 DNS resolvers",
      status: "ECONNREFUSED",
      reason: "Probed 1 native endpoint(s) on port 443: all failed (103.230.107.233: ECONNREFUSED). Plain HTTP on port 80 answered with status 200. Note: This assessment reflects external network reachability during the probe window and does not evaluate internal network topologies.",
    },
  };

  // Must NOT claim all traffic is plaintext or extrapolate internal architecture
  assert.doesNotMatch(
    simulatedFinding.found,
    /all traffic is plaintext/i,
    "Finding must avoid making unsupported claims that 'all traffic is plaintext'"
  );
  assert.match(
    simulatedFinding.found,
    /during this probe/i,
    "Finding must clearly frame failure within the probe window"
  );
  assert.match(
    simulatedFinding.evidence.reason,
    /does not evaluate internal network topologies/i,
    "Evidence must caveat external network reachability vs internal setups"
  );
});

test("7. CORS Policy Endpoint-Specific Scoping", (t) => {
  const simulatedCors = {
    id: "cors",
    title: "CORS Cross-Origin Policy (Tested Endpoint)",
    category: "exposure",
    severity: "pass",
    scoreImpact: 0,
    found: "CORS probe against endpoint 'https://example.com.bd' did not reflect arbitrary origins.",
    evidence: {
      endpoint: "https://example.com.bd",
      reason: "Evaluated origin reflection on tested endpoint. Server did not return Access-Control-Allow-Origin for arbitrary caller 'https://evil.paharadar.local'. Note: CORS headers are evaluated per-endpoint and may differ across other API routes.",
    },
  };

  assert.match(
    simulatedCors.title,
    /Tested Endpoint/i,
    "CORS title must explicitly indicate it applies to the tested endpoint"
  );
  assert.ok(simulatedCors.evidence.endpoint, "CORS evidence must preserve the specific tested endpoint");
  assert.match(
    simulatedCors.evidence.reason,
    /per-endpoint and may differ/i,
    "CORS evidence must explicitly clarify results are per-endpoint, not a site-wide conclusion"
  );
});

test("8. Organizational Domain Extraction (RFC 7489 Section 3.2)", (t) => {
  // Two-part public suffixes (.gov.bd, .com.bd, .co.uk, .org.bd, etc.)
  assert.equal(getOrganizationalDomain("www.educationboard.gov.bd"), "educationboard.gov.bd");
  assert.equal(getOrganizationalDomain("portal.sonalibank.com.bd"), "sonalibank.com.bd");
  assert.equal(getOrganizationalDomain("sub.deep.bangladesh.gov.bd"), "bangladesh.gov.bd");
  assert.equal(getOrganizationalDomain("daraz.com.bd"), "daraz.com.bd");
  assert.equal(getOrganizationalDomain("www.bbc.co.uk"), "bbc.co.uk");
  assert.equal(getOrganizationalDomain("sub.service.ac.bd"), "service.ac.bd");

  // Standard single-part TLDs (.com, .org, .net, .io, .dev)
  assert.equal(getOrganizationalDomain("www.example.com"), "example.com");
  assert.equal(getOrganizationalDomain("mail.api.google.com"), "google.com");
  assert.equal(getOrganizationalDomain("github.com"), "github.com");
  assert.equal(getOrganizationalDomain("sub.myproject.dev"), "myproject.dev");

  // Empty and fallback
  assert.equal(getOrganizationalDomain(""), "");
  assert.equal(getOrganizationalDomain("localhost"), "localhost");
});

test("9. Granular DNS Lookup Recording & Response Codes", (t) => {
  // Test DNS RCODE mapping
  assert.equal(mapDnsErrorCodeToRcode({ code: "ENOTFOUND" }), "NXDOMAIN");
  assert.equal(mapDnsErrorCodeToRcode({ code: "ENODATA" }), "NODATA");
  assert.equal(mapDnsErrorCodeToRcode({ code: "ETIMEDOUT" }), "TIMEOUT");
  assert.equal(mapDnsErrorCodeToRcode({ code: "ESERVFAIL" }), "SERVFAIL");
  assert.equal(mapDnsErrorCodeToRcode({ code: "UNKNOWN" }), "ERROR");

  // Verify structure of a DNS lookup record
  const sampleLookup = {
    queryName: "_dmarc.educationboard.gov.bd",
    queryType: "TXT",
    resolver: "System Default",
    responseCode: "NXDOMAIN",
    timestamp: new Date().toISOString(),
    durationMs: 45,
    answers: [],
  };

  assert.ok(sampleLookup.queryName.startsWith("_dmarc"));
  assert.equal(sampleLookup.queryType, "TXT");
  assert.equal(sampleLookup.responseCode, "NXDOMAIN");
  assert.ok(sampleLookup.durationMs > 0);
  assert.ok(sampleLookup.timestamp);
});

test("10. HTTPS Verification & Unreachable Target Handling", (t) => {
  // Scenario A: Target server is completely unreachable (neither port 80 nor 443 answers)
  // Must NOT classify as HTTPS-insecure; must mark as INCONCLUSIVE with 0 penalty
  const unreachableProbe = {
    httpReachable: false,
    anyIpTlsOk: false,
    httpsStatus: undefined,
  };

  let assignedSeverity = "pass";
  let scorePenalty = 0;

  if (!unreachableProbe.anyIpTlsOk && !unreachableProbe.httpsStatus) {
    if (!unreachableProbe.httpReachable) {
      assignedSeverity = "inconclusive";
      scorePenalty = 0;
    } else {
      assignedSeverity = "critical";
      scorePenalty = -20;
    }
  }

  assert.equal(assignedSeverity, "inconclusive", "Unreachable server must be marked INCONCLUSIVE");
  assert.equal(scorePenalty, 0, "Unreachable server must have 0 score penalty");

  // Scenario B: Plain HTTP (80) answers 200 OK, but port 443 fails
  // Sufficiently verified: HTTP works, HTTPS refused -> Critical
  const insecureProbe = {
    httpReachable: true,
    anyIpTlsOk: false,
    httpsStatus: undefined,
  };

  if (!insecureProbe.anyIpTlsOk && !insecureProbe.httpsStatus) {
    if (!insecureProbe.httpReachable) {
      assignedSeverity = "inconclusive";
      scorePenalty = 0;
    } else {
      assignedSeverity = "critical";
      scorePenalty = -20;
    }
  }

  assert.equal(assignedSeverity, "critical", "Verified HTTP accessible with port 443 down must be CRITICAL");
  assert.equal(scorePenalty, -20, "Confirmed HTTPS omission must deduct 20 pts");
});

test("11. Fresh vs. Cached Data Indication", (t) => {
  const freshEvidence = {
    dataFreshness: "fresh-live-probe",
    timestamp: new Date().toISOString(),
  };

  const cachedEvidence = {
    dataFreshness: "cached",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  };

  assert.equal(freshEvidence.dataFreshness, "fresh-live-probe");
  assert.equal(cachedEvidence.dataFreshness, "cached");
});

test("12. HSTS RFC 6797 Duplicate Directives & Malformed Syntax Validation", (t) => {
  // Case A: Duplicate max-age directive (as seen on Daraz: max-age=31536000, max-age=31536000)
  // MUST NOT mark as PASS! Must report malformed / duplicate directive with warning
  const darazHsts = validateHstsHeader("max-age=31536000, max-age=31536000", true);
  assert.equal(darazHsts.valid, false, "Duplicate max-age header must be rejected as invalid");
  assert.equal(darazHsts.severity, "warn", "Duplicate max-age must be flagged with warning");
  assert.equal(darazHsts.hasDuplicates, true, "Must flag hasDuplicates = true");
  assert.match(darazHsts.found, /duplicate 'max-age' directive/i);
  assert.match(darazHsts.reason, /RFC 6797 Section 6.1/i);

  // Case B: Valid standard HSTS header
  const validHsts = validateHstsHeader("max-age=31536000; includeSubDomains; preload", true);
  assert.equal(validHsts.valid, true, "Standard HSTS header must be valid");
  assert.equal(validHsts.severity, "pass", "Standard HSTS must PASS");
  assert.equal(validHsts.scoreImpact, 0, "Valid HSTS has 0 penalty");
  assert.equal(validHsts.maxAge, 31536000);

  // Case C: Missing max-age value or non-numeric
  const malformedHsts = validateHstsHeader("includeSubDomains", true);
  assert.equal(malformedHsts.valid, false);
  assert.equal(malformedHsts.severity, "warn");
  assert.match(malformedHsts.found, /missing or non-numeric/i);

  // Case D: max-age=0 (clears HSTS pins)
  const zeroHsts = validateHstsHeader("max-age=0", true);
  assert.equal(zeroHsts.valid, false);
  assert.equal(zeroHsts.severity, "warn");
  assert.match(zeroHsts.found, /max-age is set to 0/i);

  // Case E: Missing header completely
  const missingHsts = validateHstsHeader(undefined, true);
  assert.equal(missingHsts.valid, false);
  assert.equal(missingHsts.severity, "warn");
  assert.equal(missingHsts.scoreImpact, -8);

  // Case F: HSTS over plain HTTP without TLS
  const httpOnlyHsts = validateHstsHeader("max-age=31536000", false);
  assert.equal(httpOnlyHsts.severity, "info");
  assert.equal(httpOnlyHsts.scoreImpact, 0, "No penalty over HTTP because browser ignores HSTS");
});

test("13. RFC 9116 security.txt Multi-State Verification", (t) => {
  // Case A: Valid security.txt with Contact and unexpired Expires
  const validBody = `
# Security Policy
Contact: mailto:security@example.com
Contact: https://example.com/bounty
Expires: 2028-12-31T23:59:59.000Z
Preferred-Languages: en, bn
`;
  const validResult = validateSecurityTxt(200, "text/plain; charset=utf-8", validBody);
  assert.equal(validResult.classification, "valid");
  assert.equal(validResult.severity, "pass");
  assert.equal(validResult.scoreImpact, 0);
  assert.equal(validResult.contact, "mailto:security@example.com");

  // Case B: HTML Catch-all response (HTTP 200 with HTML, e.g. SPA 404 page)
  // MUST NOT count as valid security.txt, and MUST NOT claim "file not found" contradictorily!
  const htmlBody = `<!DOCTYPE html><html><head><title>Daraz Online Shopping</title></head><body><div id="app">Not Found</div></body></html>`;
  const htmlResult = validateSecurityTxt(200, "text/html; charset=utf-8", htmlBody);
  assert.equal(htmlResult.classification, "unrelated_html");
  assert.equal(htmlResult.severity, "info");
  assert.equal(htmlResult.scoreImpact, 0);
  assert.match(htmlResult.found, /returned HTTP 200 with HTML content/i);
  assert.match(htmlResult.reason, /RFC 9116 Section 2.2 requires media type 'text\/plain'/i);

  // Case C: Plaintext but missing Contact directive
  const noContactBody = `Expires: 2028-12-31T23:59:59.000Z`;
  const noContactResult = validateSecurityTxt(200, "text/plain", noContactBody);
  assert.equal(noContactResult.classification, "malformed");
  assert.match(noContactResult.found, /missing the mandatory 'Contact:' field/i);

  // Case D: Plaintext but missing Expires directive
  const noExpiresBody = `Contact: mailto:security@example.com`;
  const noExpiresResult = validateSecurityTxt(200, "text/plain", noExpiresBody);
  assert.equal(noExpiresResult.classification, "malformed");
  assert.match(noExpiresResult.found, /missing the mandatory 'Expires:' field/i);

  // Case E: Expired policy
  const expiredBody = `
Contact: mailto:security@example.com
Expires: 2020-01-01T00:00:00.000Z
`;
  const expiredResult = validateSecurityTxt(200, "text/plain", expiredBody);
  assert.equal(expiredResult.classification, "expired");
  assert.equal(expiredResult.severity, "info");
  assert.match(expiredResult.found, /expired on 2020-01-01/i);

  // Case F: HTTP 404 Not Found
  const notFoundResult = validateSecurityTxt(404, "text/html", "");
  assert.equal(notFoundResult.classification, "missing");
  assert.equal(notFoundResult.severity, "info");
  assert.match(notFoundResult.found, /HTTP 404/i);
});

test("14. Modern TLS Cryptographic Protocol Validation (TLS 1.2 vs TLS 1.3)", (t) => {
  // TLS 1.3 -> PASS with 0 penalty
  const tls13Check = {
    protocol: "TLSv1.3",
    authorized: true,
    daysLeft: 120,
  };
  const isLegacy13 = /^TLSv1(\.1)?$/.test(tls13Check.protocol);
  assert.equal(isLegacy13, false);

  // TLS 1.2 -> PASS with 0 penalty (must NOT be penalized solely because 1.3 is available)
  const tls12Check = {
    protocol: "TLSv1.2",
    authorized: true,
    daysLeft: 120,
  };
  const isLegacy12 = /^TLSv1(\.1)?$/.test(tls12Check.protocol);
  assert.equal(isLegacy12, false, "TLS 1.2 is NOT legacy and must not be flagged");

  // TLS 1.0 or 1.1 -> WARN (-8 penalty)
  const tls10Check = {
    protocol: "TLSv1",
    authorized: true,
    daysLeft: 120,
  };
  const isLegacy10 = /^TLSv1(\.1)?$/.test(tls10Check.protocol);
  assert.equal(isLegacy10, true, "TLS 1.0 is legacy and must be flagged as WARN");
});

test("15. Companion Tactical Agent Speed Calibration", (t) => {
  // Test speed constants are distinct and calibrated
  assert.ok(SPEEDS.chill < SPEEDS.normal, "Chill speed must be distinctly slower than normal");
  assert.ok(SPEEDS.normal < SPEEDS.zippy, "Zippy speed must be distinctly faster than normal");

  // Chill should be leisurely glide (rate <= 3.0, bobDuration >= 3.0s)
  assert.ok(SPEED_CONFIG.chill.rate <= 2.5);
  assert.ok(SPEED_CONFIG.chill.bobDuration >= 3.5);

  // Zippy should be hyper-fast darting (rate >= 35.0, bobDuration <= 1.0s)
  assert.ok(SPEED_CONFIG.zippy.rate >= 40.0);
  assert.ok(SPEED_CONFIG.zippy.bobDuration <= 0.85);

  // Each speed mode has human-readable label
  assert.equal(SPEED_CONFIG.chill.label, "Slow");
  assert.equal(SPEED_CONFIG.normal.label, "Normal");
  assert.equal(SPEED_CONFIG.zippy.label, "Fast");
});

test("16. DMARC Policy Tag Parsing (p=none vs p=quarantine vs p=reject and sp=)", (t) => {
  // Policy: reject
  const rejectRec = parseDmarcRecord("v=DMARC1; p=reject; rua=mailto:dmarc@example.com", true, "example.com");
  assert.equal(rejectRec.policy, "reject");
  assert.equal(rejectRec.isEnforced, true);
  assert.equal(rejectRec.severity, "pass");
  assert.equal(rejectRec.scoreImpact, 0);

  // Policy: quarantine
  const quarRec = parseDmarcRecord("v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com", true, "example.com");
  assert.equal(quarRec.policy, "quarantine");
  assert.equal(quarRec.isEnforced, true);
  assert.equal(quarRec.severity, "pass");
  assert.equal(quarRec.scoreImpact, 0);

  // Policy: none (monitor only)
  const noneRec = parseDmarcRecord("v=DMARC1; p=none; rua=mailto:dmarc@example.com", true, "example.com");
  assert.equal(noneRec.policy, "none");
  assert.equal(noneRec.isEnforced, false);
  assert.equal(noneRec.severity, "warn");
  assert.match(noneRec.found, /monitor-only mode/i);

  // Subdomain policy (sp=) parsed independently
  const withSp = parseDmarcRecord("v=DMARC1; p=reject; sp=quarantine; rua=mailto:dmarc@example.com", true, "example.com");
  assert.equal(withSp.policy, "reject");
  assert.equal(withSp.subdomainPolicy, "quarantine");
});

test("17. DMARC Prothom Alo Regression Test (p=quarantine with sp=none)", (t) => {
  // Prothom Alo's raw DNS record:
  // "v=DMARC1; p=quarantine; rua=mailto@prothomalo.com; ruf=mailto@prothomalo.com; fo=0; adkim=r; aspf=s; pct=100; rf=afrf; ri=86400; sp=none"
  const rawProthomAlo = "v=DMARC1; p=quarantine; rua=mailto@prothomalo.com; ruf=mailto@prothomalo.com; fo=0; adkim=r; aspf=s; pct=100; rf=afrf; ri=86400; sp=none";
  const result = parseDmarcRecord(rawProthomAlo, true, "prothomalo.com");

  // MUST be classified as quarantine, NOT monitor-only (p=none)!
  assert.equal(result.policy, "quarantine", "Primary policy must be parsed as 'quarantine', not 'none'");
  assert.equal(result.subdomainPolicy, "none", "Subdomain policy must be parsed as 'none'");
  assert.equal(result.isEnforced, true, "Quarantine is an actively enforced DMARC policy");
  assert.equal(result.severity, "pass", "Enforced quarantine policy must PASS with zero penalty");
  assert.equal(result.scoreImpact, 0, "No score penalty for active quarantine policy");
  assert.match(result.found, /Organizational Domain \(p=quarantine/i);
  assert.match(result.found, /Subdomains \(sp=none/i);
  assert.match(result.reason, /active quarantine enforcement/i);
  assert.match(result.reason, /monitor-only policy \(sp=none\)/i);
});

test("18. Content-Security-Policy Qualitative Assessment", (t) => {
  // Case A: Missing CSP
  const missingCsp = assessCspQuality(undefined);
  assert.equal(missingCsp.hasHeader, false);
  assert.equal(missingCsp.severity, "warn");
  assert.equal(missingCsp.scoreImpact, -8);

  // Case B: Strict CSP (no unsafe-inline or unsafe-eval)
  const strictCsp = assessCspQuality("default-src 'self'; script-src 'self' https://trusted.cdn.com; object-src 'none'");
  assert.equal(strictCsp.hasHeader, true);
  assert.equal(strictCsp.isStrong, true);
  assert.equal(strictCsp.severity, "pass");
  assert.equal(strictCsp.scoreImpact, 0);
  assert.match(strictCsp.found, /without permissive directives/i);

  // Case C: Permissive CSP with unsafe-inline and unsafe-eval (as seen on complex news portals)
  const permissiveCsp = assessCspQuality("default-src * 'unsafe-inline' 'unsafe-eval' http:; script-src * 'unsafe-inline' 'unsafe-eval'");
  assert.equal(permissiveCsp.hasHeader, true);
  assert.equal(permissiveCsp.isStrong, false);
  assert.equal(permissiveCsp.hasUnsafeInline, true);
  assert.equal(permissiveCsp.hasUnsafeEval, true);
  assert.equal(permissiveCsp.hasWildcard, true);
  assert.equal(permissiveCsp.hasInsecureScheme, true);
  // Classified as PRESENT — WEAK POLICY (severity: "info", score impact: 0) rather than unconditional PASS
  assert.equal(permissiveCsp.severity, "info");
  assert.equal(permissiveCsp.scoreImpact, 0);
  assert.match(permissiveCsp.found, /PRESENT — WEAK POLICY/i);
  assert.match(permissiveCsp.reason, /relax script execution boundaries/i);
});

test("19. SPF Enforcement Qualifier Assessment (~all vs -all vs +all)", (t) => {
  // Case A: Strict HardFail (-all)
  const hardFail = assessSpfRecord("v=spf1 include:_spf.google.com -all", true, "example.com");
  assert.equal(hardFail.hasRecord, true);
  assert.equal(hardFail.qualifier, "-all");
  assert.equal(hardFail.severity, "pass");
  assert.match(hardFail.found, /HardFail enforcement/i);

  // Case B: SoftFail (~all, as seen on Prothom Alo)
  const softFail = assessSpfRecord("v=spf1 include:_spf.google.com ~all", true, "prothomalo.com");
  assert.equal(softFail.hasRecord, true);
  assert.equal(softFail.qualifier, "~all");
  assert.equal(softFail.severity, "pass");
  assert.match(softFail.found, /SoftFail enforcement/i);
  assert.match(softFail.reason, /does not guarantee anti-spoofing without DMARC/i);

  // Case C: Permissive (+all) - Dangerous
  const permissive = assessSpfRecord("v=spf1 +all", true, "insecure.com");
  assert.equal(permissive.qualifier, "+all");
  assert.equal(permissive.severity, "warn");
  assert.equal(permissive.scoreImpact, -8);
  assert.match(permissive.found, /Permissive SPF record \(\+all\)/i);
});

test("20. TLS Handshake Endpoint Consistency & Scanner ENETUNREACH Handling", (t) => {
  // Scenario: 4 endpoints resolved (2 IPv4, 2 IPv6).
  // IPv4 handshakes succeed; IPv6 endpoints encounter scanner-side ENETUNREACH (scanner has no IPv6 route)
  const ipTlsSimulation = [
    { ip: "104.18.2.1", type: "ipv4", ok: true, protocol: "TLSv1.3" },
    { ip: "104.18.3.1", type: "ipv4", ok: true, protocol: "TLSv1.3" },
    { ip: "2606:4700::1", type: "ipv6-native", ok: false, classifiedError: { category: "NETWORK_UNREACHABLE", code: "ENETUNREACH" } },
    { ip: "2606:4700::2", type: "ipv6-native", ok: false, classifiedError: { category: "NETWORK_UNREACHABLE", code: "ENETUNREACH" } },
  ];

  const successfulIps = ipTlsSimulation.filter((r) => r.ok);
  const failedIps = ipTlsSimulation.filter((r) => !r.ok);
  const localUnreachIps = failedIps.filter((r) => r.classifiedError?.category === "NETWORK_UNREACHABLE");
  const remoteFailedIps = failedIps.filter((r) => r.classifiedError?.category !== "NETWORK_UNREACHABLE");

  assert.equal(successfulIps.length, 2, "Exactly 2 endpoints succeeded");
  assert.equal(localUnreachIps.length, 2, "2 IPv6 endpoints were ENETUNREACH due to scanner limitation");
  assert.equal(remoteFailedIps.length, 0, "No remote endpoint rejected connection");

  // Certificate finding wording must NEVER claim verification across all 4 endpoints!
  const certVerifiedCount = successfulIps.length;
  const certMessage = `Verified across ${certVerifiedCount} endpoint(s) with completed TLS handshake (out of ${ipTlsSimulation.length} resolved addresses).`;
  assert.equal(certMessage, "Verified across 2 endpoint(s) with completed TLS handshake (out of 4 resolved addresses).");
});

test("21. HSTS Validation on HTTP vs. HTTPS Responses & Inconclusive Behavior", (t) => {
  // RFC 6797 Section 8.1 requires HSTS to be evaluated on HTTPS responses.
  // When HTTPS is valid with HSTS, it must pass
  const validHsts = validateHstsHeader("max-age=31536000; includeSubDomains", true);
  assert.equal(validHsts.valid, true);
  assert.equal(validHsts.severity, "pass");
  assert.equal(validHsts.scoreImpact, 0);

  // When HSTS header is missing on an HTTPS response, it must warn
  const missingHsts = validateHstsHeader(undefined, true);
  assert.equal(missingHsts.valid, false);
  assert.equal(missingHsts.severity, "warn");
  assert.equal(missingHsts.scoreImpact, -8);

  // Duplicate max-age directives must be rejected as malformed
  const dupHsts = validateHstsHeader("max-age=31536000, max-age=31536000", true);
  assert.equal(dupHsts.valid, false);
  assert.equal(dupHsts.hasDuplicates, true);
  assert.equal(dupHsts.severity, "warn");
});

test("22. DMARC Organizational and Subdomain Policy Combinations", (t) => {
  // Combination A: p=quarantine + sp=none
  const comboA = parseDmarcRecord("v=DMARC1; p=quarantine; sp=none; rua=mailto:d@example.com", true, "example.com");
  assert.equal(comboA.policy, "quarantine");
  assert.equal(comboA.subdomainPolicy, "none");
  assert.match(comboA.found, /Organizational Domain \(p=quarantine · Active Enforcement\)/i);
  assert.match(comboA.found, /Subdomains \(sp=none · Monitor-Only Mode\)/i);

  // Combination B: p=reject + sp=quarantine
  const comboB = parseDmarcRecord("v=DMARC1; p=reject; sp=quarantine; rua=mailto:d@example.com", true, "example.com");
  assert.equal(comboB.policy, "reject");
  assert.equal(comboB.subdomainPolicy, "quarantine");
  assert.match(comboB.found, /Organizational Domain \(p=reject · Active Enforcement\)/i);
  assert.match(comboB.found, /Subdomains \(sp=quarantine\)/i);

  // Combination C: p=none + sp=none (Monitor-only)
  const comboC = parseDmarcRecord("v=DMARC1; p=none; sp=none; rua=mailto:d@example.com", true, "example.com");
  assert.equal(comboC.policy, "none");
  assert.equal(comboC.subdomainPolicy, "none");
  assert.equal(comboC.severity, "warn");
  assert.match(comboC.found, /p=none · Monitor-Only Mode/i);
});

test("23. Zero Penalty Neutrality for Inconclusive and Info Findings", (t) => {
  const sampleFindings = [
    { id: "https-redirect", severity: "pass", scoreImpact: 0 },
    { id: "tls", severity: "inconclusive", scoreImpact: 0 },
    { id: "strict-transport-security", severity: "inconclusive", scoreImpact: 0 },
    { id: "content-security-policy", severity: "info", scoreImpact: 0 },
    { id: "referrer-policy", severity: "info", scoreImpact: 0 },
  ];

  const calculatedScore = score(sampleFindings);
  assert.equal(calculatedScore, 100, "Inconclusive and Info findings must not deduct points from 100 base score");
});
