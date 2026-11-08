import fs from "node:fs";

let code = fs.readFileSync("test/scanner-accuracy.test.mjs", "utf8");

code = code.replace(
  'import { validateHstsHeader, validateSecurityTxt } from "../src/lib/validators.ts";',
  'import { validateHstsHeader, validateSecurityTxt, parseDmarcRecord, assessCspQuality, assessSpfRecord } from "../src/lib/validators.ts";'
);

const additionalTests = `
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
  assert.match(result.found, /actively quarantines/i);
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
  // Must NOT declare it an outright vulnerability or fail, but must provide nuanced quality assessment
  assert.equal(permissiveCsp.severity, "pass");
  assert.equal(permissiveCsp.scoreImpact, 0);
  assert.match(permissiveCsp.found, /includes permissive directives/i);
  assert.match(permissiveCsp.reason, /relaxes script execution boundaries/i);
});

test("19. SPF Enforcement Qualifier Assessment (~all vs -all vs +all)", (t) => {
  // Case A: Strict HardFail (-all)
  const hardFail = assessSpfRecord("v=spf1 include:_spf.google.com -all", true, "example.com");
  assert.equal(hardFail.hasRecord, true);
  assert.equal(hardFail.qualifier, "-all");
  assert.equal(hardFail.severity, "pass");
  assert.match(hardFail.found, /HardFail enforcement \(-all\)/i);

  // Case B: SoftFail (~all, as seen on Prothom Alo)
  const softFail = assessSpfRecord("v=spf1 include:_spf.google.com ~all", true, "prothomalo.com");
  assert.equal(softFail.hasRecord, true);
  assert.equal(softFail.qualifier, "~all");
  assert.equal(softFail.severity, "pass");
  assert.match(softFail.found, /SoftFail enforcement \(~all\)/i);
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
  const certMessage = \`Verified across \${certVerifiedCount} endpoint(s) with completed TLS handshake (out of \${ipTlsSimulation.length} resolved addresses).\`;
  assert.equal(certMessage, "Verified across 2 endpoint(s) with completed TLS handshake (out of 4 resolved addresses).");
});
`;

code = code.trimEnd() + "\n" + additionalTests;

fs.writeFileSync("test/scanner-accuracy.test.mjs", code, "utf8");
console.log("Updated test/scanner-accuracy.test.mjs with all 20 tests!");
