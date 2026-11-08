import fs from "node:fs";

let content = fs.readFileSync("src/lib/checks.ts", "utf8");

// 1. Update check 1 for unreachable target -> inconclusive
const targetOldCheck1 = `      const httpRedirectsToHttps = !!http?.finalUrl?.startsWith("https://");

      if (!anyIpTlsOk && !https?.status) {`;

const replacementCheck1 = `      const httpReachable = typeof http?.status === "number" && http.status > 0;
      const httpRedirectsToHttps = !!http?.finalUrl?.startsWith("https://");

      if (!anyIpTlsOk && !https?.status) {
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
      } else if (!allIpsTlsOk) {`;

// Replace check 1
content = content.replace(
  /const httpRedirectsToHttps =[\s\S]*?\} else if \(!allIpsTlsOk\) \{/,
  replacementCheck1
);

// 2. Add dnsLookups and dataFreshness to Check 1 evidence
content = content.replace(
  "dnsResolvers: resolverEvidence,",
  `dnsResolvers: resolverEvidence,
            dnsLookups: dns.lookups,
            dataFreshness: "fresh-live-probe",`
);

// 3. Add dnsLookups and dataFreshness to Check 2 evidence
content = content.replace(
  "reason: `Target server did not complete a TLS handshake",
  `dnsLookups: dns.lookups,
              dataFreshness: "fresh-live-probe",
              reason: \`Target server did not complete a TLS handshake`
);

// 4. Update Check 7 (SPF & DMARC) with orgDomain awareness
const oldCheck7Regex = /\/\/ 7\. Email Spoofing Defense[\s\S]*?\/\/ 8\. RFC 9116/;

const newCheck7 = `// 7. Email Spoofing Defense (SPF & DMARC) - Accurate, Organizational-Domain-Aware
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
    },

    // 8. RFC 9116`;

content = content.replace(oldCheck7Regex, newCheck7);

fs.writeFileSync("src/lib/checks.ts", content, "utf8");
console.log("Successfully updated src/lib/checks.ts!");
