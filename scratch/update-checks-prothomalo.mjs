import fs from "node:fs";

let code = fs.readFileSync("src/lib/checks.ts", "utf8");

// 1. Update validators import
code = code.replace(
  'import { validateHstsHeader, validateSecurityTxt } from "./validators";',
  'import { validateHstsHeader, validateSecurityTxt, parseDmarcRecord, assessCspQuality, assessSpfRecord } from "./validators";'
);

// 2. Prioritize final HTTPS response in buildChecks
const oldProbeExtraction = `  const { host, timestamp, dns, http, https, ipTls } = probe;
  const activeProbe = https?.status ? https : http?.status ? http : null;
  const headers = activeProbe?.headers ?? {};`;

const newProbeExtraction = `  const { host, timestamp, dns, http, https, ipTls } = probe;
  // Security headers (especially HSTS) must be evaluated against the final HTTPS response!
  const finalHttpsProbe = https?.status ? https : http?.finalUrl?.startsWith("https://") ? http : null;
  const activeProbe = finalHttpsProbe ?? (http?.status ? http : null);
  const headers = activeProbe?.headers ?? {};`;

code = code.replace(oldProbeExtraction, newProbeExtraction);

// 3. Update Check 1 (HTTPS Transport) to distinguish ENETUNREACH scanner limitations
const oldCheck1Logic = `      if (!anyIpTlsOk && !https?.status) {
        if (!httpReachable) {
          // If BOTH HTTP (80) and HTTPS (443) failed/timed out, target is unreachable from scanner.
          // Inconclusive scan with ZERO score impact!
          severity = "inconclusive";
          scoreImpact = 0;
          found = "Unable to verify target reachability: both HTTP (port 80) and HTTPS (port 443) failed to respond during this probe window.";
          reason = \`Neither port 80 nor port 443 completed a connection (\${ipSummary}). Target may be offline, rate-limiting, or firewalling probe requests. Inconclusive scan with 0 score penalty.\`;
        } else {
          // HTTP is verified accessible, but port 443 failed across all tested native IPs after dual verification.
          severity = "critical";
          scoreImpact = -20;
          found = "HTTPS connection could not be established on the tested IP addresses during this probe. Plain HTTP (port 80) was accessible.";
          reason = \`Probed \${totalIpsTested} native endpoint(s) on port 443: all failed (\${ipSummary}). Plain HTTP on port 80 answered with status \${http?.status}. Note: This assessment reflects external network reachability during the probe window and does not evaluate internal network topologies.\`;
        }
      } else if (!allIpsTlsOk) {
        severity = "warn";
        scoreImpact = -10;
        found = \`Inconsistent infrastructure detected: \${successfulTlsIps.length} of \${totalIpsTested} tested endpoint(s) accepted HTTPS, while others failed (\${ipSummary}).\`;
        reason = "Partial TLS deployment: some backend edge nodes accept port 443 while others refuse or drop connections.";
      } else if (!httpRedirectsToHttps) {
        severity = "warn";
        scoreImpact = -8;
        found = \`HTTPS is operational across all \${totalIpsTested} tested endpoint(s), but plain HTTP does not automatically redirect to HTTPS.\`;
        reason = \`HTTP request ended at \${http?.finalUrl || "http://" + host} with status \${http?.status || 200}. Visitors can inadvertently browse without encryption.\`;
      }`;

const newCheck1Logic = `      // Distinguish scanner-side network limitations (ENETUNREACH) from remote server failures
      const localUnreachIps = failedTlsIps.filter(
        (r) => r.classifiedError?.category === "NETWORK_UNREACHABLE"
      );
      const remoteFailedIps = failedTlsIps.filter(
        (r) => r.classifiedError?.category !== "NETWORK_UNREACHABLE"
      );
      const hasRemoteFailure = remoteFailedIps.length > 0;

      if (!anyIpTlsOk && !https?.status) {
        if (!httpReachable) {
          severity = "inconclusive";
          scoreImpact = 0;
          found = "Unable to verify target reachability: both HTTP (port 80) and HTTPS (port 443) failed to respond during this probe window.";
          reason = \`Neither port 80 nor port 443 completed a connection (\${ipSummary}). Target may be offline, rate-limiting, or firewalling probe requests. Inconclusive scan with 0 score penalty.\`;
        } else {
          severity = "critical";
          scoreImpact = -20;
          found = "HTTPS connection could not be established on the tested IP addresses during this probe. Plain HTTP (port 80) was accessible.";
          reason = \`Probed \${totalIpsTested} native endpoint(s) on port 443: all failed (\${ipSummary}). Plain HTTP on port 80 answered with status \${http?.status}. Note: This assessment reflects external network reachability during the probe window and does not evaluate internal network topologies.\`;
        }
      } else if (hasRemoteFailure) {
        severity = "warn";
        scoreImpact = -10;
        found = \`Inconsistent infrastructure detected: \${successfulTlsIps.length} of \${totalIpsTested} tested endpoint(s) accepted HTTPS, while others failed remotely (\${ipSummary}).\`;
        reason = "Partial TLS deployment: some backend edge nodes accept port 443 while others refuse or drop connections.";
      } else if (!httpRedirectsToHttps) {
        severity = "warn";
        scoreImpact = -8;
        found = \`HTTPS is operational across \${successfulTlsIps.length} reachable endpoint(s), but plain HTTP does not automatically redirect to HTTPS.\`;
        reason = \`HTTP request ended at \${http?.finalUrl || "http://" + host} with status \${http?.status || 200}. Visitors can inadvertently browse without encryption.\`;
      } else {
        found = \`HTTPS connection successfully established across \${successfulTlsIps.length} reachable native endpoint(s). Plain HTTP automatically redirects to HTTPS.\`;
        reason = \`Verified transport encryption. Probed \${successfulTlsIps.length} native endpoint(s) on port 443; all negotiated TLS. HTTP redirects to HTTPS.\${localUnreachIps.length > 0 ? \` (Note: \${localUnreachIps.length} IPv6 endpoint(s) encountered scanner-side ENETUNREACH route limitations; target service was not penalized).\` : ""}\`;
      }`;

code = code.replace(oldCheck1Logic, newCheck1Logic);

// 4. Update Check 2 (TLS Certificate) to report only endpoints where TLS actually succeeded
const oldCheck2Found = "found: `Valid certificate (${daysLeft} days remaining) · Protocol: ${primaryTls.protocol} · Verified across ${totalIpsTested} native endpoint(s).`,";
const newCheck2Found = "found: `Valid certificate (${daysLeft} days remaining) · Protocol: ${protoLabel} · Verified across ${successfulTlsIps.length} endpoint(s) with completed TLS handshake (out of ${totalIpsTested} resolved addresses).`,";
code = code.replace(oldCheck2Found, newCheck2Found);

code = code.replace(
  "test: `TLS Certificate Verification via port 443 on ${primaryTls.ip}`,",
  "test: `TLS Certificate Verification via port 443 across reachable endpoints: [${successfulTlsIps.map((s) => s.ip).join(\", \")}]`,"
);

// 5. Update Check 3 (Security Headers -> Add CSP Quality Assessment)
const oldCspBranch = `        return {
          id: r.name.toLowerCase(),
          title: r.name,
          category: "headers",
          learn: r.learn,
          severity: isPresent ? "pass" : r.sev,
          scoreImpact: isPresent ? 0 : r.scoreImpact,
          found: isPresent ? \`Header is present: \${rawValue}\` : "Header is missing from HTTP response.",
          why: r.why,`;

const newCspBranch = `        if (r.name === "Content-Security-Policy") {
          const csp = assessCspQuality(rawValue);
          return {
            id: "content-security-policy",
            title: "Content-Security-Policy",
            category: "headers",
            learn: r.learn,
            severity: csp.severity,
            scoreImpact: csp.scoreImpact,
            found: csp.found,
            why: r.why,
            evidence: {
              test: "Inspect Content-Security-Policy header and assess directive quality",
              status: activeProbe.status ?? 200,
              url: activeProbe.finalUrl,
              headers: rawValue ? { [r.name]: rawValue } : { [r.name]: "Header Missing" },
              timestamp,
              reason: csp.reason,
            },
            header: { name: r.name, value: r.value },
            fix: csp.hasHeader ? undefined : fixFor(r.name, r.value),
            docs: \`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/\${r.name}\`,
          };
        }

        return {
          id: r.name.toLowerCase(),
          title: r.name,
          category: "headers",
          learn: r.learn,
          severity: isPresent ? "pass" : r.sev,
          scoreImpact: isPresent ? 0 : r.scoreImpact,
          found: isPresent ? \`Header is present: \${rawValue}\` : "Header is missing from HTTP response.",
          why: r.why,`;

code = code.replace(oldCspBranch, newCspBranch);

// 6. Update Check 7 (Email Spoofing Defense -> parseDmarcRecord and assessSpfRecord)
const oldEmailCheck = `// 7. Email Spoofing Defense (SPF & DMARC) - Accurate, Organizational-Domain-Aware
    async (): Promise<Finding[]> => {
      const sendsMail = dns.mx.length > 0;
      const spfRecord = dns.spf[0];
      const dmarcRecord = dns.dmarc[0];
      const weakDmarc = !!dmarcRecord && /p=none/i.test(dmarcRecord);
      const orgDomain = probe.orgDomain;

      return [
        {
          id: "spf",
          title: "SPF Email Spoofing Record",
          category: "email",
          learn: "email",
          severity: spfRecord ? "pass" : sendsMail ? "warn" : "info",
          scoreImpact: spfRecord ? 0 : sendsMail ? -8 : 0,
          found: spfRecord
            ? \`SPF record published (\${dns.spfHost === host ? "Host" : \`Organizational Domain '\${dns.spfHost}'\`}): '\${spfRecord}'\`
            : sendsMail
            ? \`Domain receives email (MX configured) but has no SPF record published on \${host} or \${dns.spfHost}.\`
            : "No SPF record published. (Domain has no mail servers configured; an SPF record is still recommended).",
          why: "Sender Policy Framework (SPF) lists authorized sending mail servers to protect your domain reputation from spoofing.",
          evidence: {
            test: \`DNS TXT and MX query for \${host}\${orgDomain !== host ? \` and \${orgDomain}\` : ""}\`,
            dnsRecords: [
              ...dns.mx.map((m) => \`MX: \${m}\`),
              ...(dns.spf.length ? dns.spf.map((s) => \`TXT: \${s} (at \${dns.spfHost})\`) : ["No SPF TXT records returned"]),
            ],
            dnsLookups: dns.lookups.filter((l) => l.queryType === "TXT" || l.queryType === "MX"),
            dataFreshness: "fresh-live-probe",
            timestamp,
            reason: spfRecord
              ? \`Valid SPF policy found in DNS TXT records (\${dns.spfHost === host ? host : \`inherited from organizational domain \${dns.spfHost}\`}).\`
              : sendsMail
              ? "Domain has active MX records but lacks an SPF policy to authorize senders (-8 pts)."
              : "Domain has no MX records configured. Missing SPF is an informational finding with 0 score penalty.",
          },
          fix: spfRecord
            ? undefined
            : [
                {
                  label: "DNS TXT",
                  code: sendsMail
                    ? \`\${dns.spfHost}  TXT  "v=spf1 include:_spf.your-mail-provider.com ~all"\`
                    : \`\${dns.spfHost}  TXT  "v=spf1 -all"\`,
                },
              ],
        },
        {
          id: "dmarc",
          title: "DMARC Phishing Protection",
          category: "email",
          learn: "email",
          severity: !dmarcRecord ? (sendsMail ? "warn" : "info") : weakDmarc ? "info" : "pass",
          scoreImpact: !dmarcRecord ? (sendsMail ? -8 : 0) : weakDmarc ? 0 : 0,
          found: !dmarcRecord
            ? \`No DMARC record found for \${host} or organizational domain \${orgDomain}.\`
            : weakDmarc
            ? \`DMARC policy exists in monitor-only mode (p=none) on \${dns.dmarcHost}: '\${dmarcRecord}'\`
            : \`DMARC policy is actively enforced on \${dns.dmarcHost}: '\${dmarcRecord}'\`,
          why: "DMARC instructs receiving mail servers how to treat spoofed messages that fail SPF or DKIM authentication.",
          evidence: {
            test: \`DNS TXT query for _dmarc.\${host}\${orgDomain !== host ? \` and _dmarc.\${orgDomain} (RFC 7489 Section 6.6.3 fallback)\` : ""}\`,
            dnsRecords: dns.dmarc.length ? dns.dmarc.map((d) => \`TXT: \${d} (at _dmarc.\${dns.dmarcHost})\`) : ["No DMARC TXT record found"],
            dnsLookups: dns.lookups.filter((l) => l.queryName.startsWith("_dmarc")),
            dataFreshness: "fresh-live-probe",
            timestamp,
            reason: !dmarcRecord
              ? sendsMail
                ? "Domain lacks a DMARC policy while having active mail exchangers (-8 pts)."
                : "Domain has no mail exchangers. DMARC recommendation is informational (0 score penalty)."
              : weakDmarc
              ? \`DMARC 'p=none' at \${dns.dmarcHost} only monitors and does not reject or quarantine spoofed emails.\`
              : \`DMARC policy specifies quarantine or reject (verified at \${dns.dmarcHost}).\`,
          },
          fix:
            dmarcRecord && !weakDmarc
              ? undefined
              : [
                  {
                    label: "DNS TXT",
                    code: \`_dmarc.\${dns.dmarcHost}  TXT  "v=DMARC1; p=quarantine; rua=mailto:security@\${dns.dmarcHost}"\`,
                  },
                ],
        },
      ];
    },`;

const newEmailCheck = `// 7. Email Spoofing Defense (SPF & DMARC) - Accurate, Organizational-Domain-Aware
    async (): Promise<Finding[]> => {
      const sendsMail = dns.mx.length > 0;
      const spfResult = assessSpfRecord(dns.spf[0], sendsMail, dns.spfHost);
      const dmarcResult = parseDmarcRecord(dns.dmarc[0], sendsMail, dns.dmarcHost);
      const orgDomain = probe.orgDomain;

      return [
        {
          id: "spf",
          title: "SPF Email Spoofing Record",
          category: "email",
          learn: "email",
          severity: spfResult.severity,
          scoreImpact: spfResult.scoreImpact,
          found: spfResult.found,
          why: "Sender Policy Framework (SPF) lists authorized sending mail servers to protect your domain reputation from spoofing.",
          evidence: {
            test: \`DNS TXT and MX query for \${host}\${orgDomain !== host ? \` and \${orgDomain}\` : ""}\`,
            dnsRecords: [
              ...dns.mx.map((m) => \`MX: \${m}\`),
              ...(dns.spf.length ? dns.spf.map((s) => \`TXT: \${s} (at \${dns.spfHost})\`) : ["No SPF TXT records returned"]),
            ],
            dnsLookups: dns.lookups.filter((l) => l.queryType === "TXT" || l.queryType === "MX"),
            dataFreshness: "fresh-live-probe",
            timestamp,
            reason: spfResult.reason,
          },
          fix: spfResult.hasRecord
            ? undefined
            : [
                {
                  label: "DNS TXT",
                  code: sendsMail
                    ? \`\${dns.spfHost}  TXT  "v=spf1 include:_spf.your-mail-provider.com ~all"\`
                    : \`\${dns.spfHost}  TXT  "v=spf1 -all"\`,
                },
              ],
        },
        {
          id: "dmarc",
          title: "DMARC Phishing Protection",
          category: "email",
          learn: "email",
          severity: dmarcResult.severity,
          scoreImpact: dmarcResult.scoreImpact,
          found: dmarcResult.found,
          why: "DMARC instructs receiving mail servers how to treat spoofed messages that fail SPF or DKIM authentication.",
          evidence: {
            test: \`DNS TXT query for _dmarc.\${host}\${orgDomain !== host ? \` and _dmarc.\${orgDomain} (RFC 7489 Section 6.6.3 fallback)\` : ""}\`,
            dnsRecords: dns.dmarc.length ? dns.dmarc.map((d) => \`TXT: \${d} (at _dmarc.\${dns.dmarcHost})\`) : ["No DMARC TXT record found"],
            dnsLookups: dns.lookups.filter((l) => l.queryName.startsWith("_dmarc")),
            dataFreshness: "fresh-live-probe",
            timestamp,
            reason: dmarcResult.reason,
          },
          fix: dmarcResult.isEnforced
            ? undefined
            : [
                {
                  label: "DNS TXT",
                  code: \`_dmarc.\${dns.dmarcHost}  TXT  "v=DMARC1; p=quarantine; rua=mailto:security@\${dns.dmarcHost}"\`,
                },
              ],
        },
      ];
    },`;

code = code.replace(oldEmailCheck, newEmailCheck);

fs.writeFileSync("src/lib/checks.ts", code, "utf8");
console.log("Successfully updated checks.ts with DMARC, CSP, SPF, and TLS consistency enhancements!");
