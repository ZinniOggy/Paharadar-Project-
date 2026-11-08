import fs from "node:fs";

let code = fs.readFileSync("src/lib/checks.ts", "utf8");

// 1. Add imports for validators
code = code.replace(
  'import { safeFetch } from "./fetcher";',
  'import { safeFetch } from "./fetcher";\nimport { validateHstsHeader, validateSecurityTxt } from "./validators";'
);

// 2. Update Check 2 (TLS Certificate & Cryptography)
const oldCheck2Proto = `      const oldProto = !!primaryTls.protocol && /^TLSv1(\.1)?$/.test(primaryTls.protocol);
      const daysLeft = primaryTls.daysLeft ?? 90;
      const expiringSoon = daysLeft < 15;
      const severity = oldProto || expiringSoon ? "warn" : "pass";
      const scoreImpact = severity === "warn" ? -8 : 0;

      return [
        {
          id: "tls",
          title: "TLS Certificate & Cryptography",
          category: "transport",
          learn: "tls",
          severity,
          scoreImpact,
          found: \`Valid certificate (\${daysLeft} days remaining) · Protocol: \${primaryTls.protocol} · Verified across \${totalIpsTested} native endpoint(s).\`,
          why: "A modern, valid TLS certificate authenticates the domain and establishes encrypted communication.",
          evidence: {
            test: \`TLS handshake to tested native endpoints on port 443: [\${dns.allIps.join(", ")}]\`,
            status: primaryTls.protocol || "TLS OK",
            resolvedIps: dns.allIps,
            ipDetails: dns.ipDetails,
            dnsResolvers: resolverEvidence,
            timestamp,
            reason: oldProto
              ? "Target negotiated legacy protocol (TLS 1.0 or 1.1) which lacks modern cipher security (-8 pts)."
              : \`Valid certificate chain. Target negotiated modern \${primaryTls.protocol} transport encryption across tested native endpoints.\`,
          },
        },
      ];`;

const newCheck2Proto = `      const isLegacyProto = !!primaryTls.protocol && /^TLSv1(\.1)?$/.test(primaryTls.protocol);
      const isModernTls = primaryTls.protocol === "TLSv1.3" || primaryTls.protocol === "TLSv1.2";
      const daysLeft = primaryTls.daysLeft ?? 90;
      const expiringSoon = daysLeft < 15;
      const severity = isLegacyProto || expiringSoon ? "warn" : "pass";
      const scoreImpact = severity === "warn" ? -8 : 0;
      const protoLabel = primaryTls.protocol === "TLSv1.3" ? "TLS 1.3 (Modern)" : primaryTls.protocol === "TLSv1.2" ? "TLS 1.2 (Secure Industry Standard)" : primaryTls.protocol || "TLS";

      return [
        {
          id: "tls",
          title: "TLS Certificate & Cryptography",
          category: "transport",
          learn: "tls",
          severity,
          scoreImpact,
          found: \`Valid certificate (\${daysLeft} days remaining) · Protocol: \${protoLabel} · Verified across \${totalIpsTested} native endpoint(s).\`,
          why: "A modern, valid TLS certificate authenticates the domain and establishes encrypted communication.",
          evidence: {
            test: \`TLS handshake to tested native endpoints on port 443: [\${dns.allIps.join(", ")}]\`,
            status: primaryTls.protocol || "TLS OK",
            resolvedIps: dns.allIps,
            ipDetails: dns.ipDetails,
            dnsResolvers: resolverEvidence,
            timestamp,
            reason: isLegacyProto
              ? "Target negotiated legacy protocol (TLS 1.0 or 1.1) which lacks modern cipher security (-8 pts)."
              : \`Valid certificate chain. Target negotiated \${protoLabel}. Both TLS 1.3 and TLS 1.2 are recognized as secure cryptographic transport protocols with zero score penalty.\`,
          },
        },
      ];`;

code = code.replace(oldCheck2Proto, newCheck2Proto);

// 3. Update Check 3 (Security Headers -> HSTS with duplicate detection)
const oldHstsCheck = `        // If site is plain HTTP only, HSTS cannot be enforced (RFC 6797 requirement)
        if (r.name === "Strict-Transport-Security" && !anyIpTlsOk) {
          return {
            id: r.name.toLowerCase(),
            title: r.name,
            category: "headers",
            learn: r.learn,
            severity: "info",
            scoreImpact: 0,
            found: "HSTS header is absent (Requires HTTPS to be operational).",
            why: "Browsers ignore HSTS headers sent over plain HTTP. Enable HTTPS first, then deploy HSTS.",
            evidence: {
              test: \`Check for \${r.name} in response headers\`,
              status: activeProbe.status ?? 200,
              url: activeProbe.finalUrl,
              headers: { [r.name]: "Not set" },
              timestamp,
              reason: "HSTS requires active TLS transport to take effect per RFC 6797. Zero score penalty.",
            },
            fix: fixFor(r.name, r.value),
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
          why: r.why,
          evidence: {
            test: \`Check for \${r.name} in response headers\`,
            status: activeProbe.status ?? 200,
            url: activeProbe.finalUrl,
            headers: isPresent ? { [r.name]: rawValue } : { [r.name]: "Header Missing" },
            timestamp,
            reason: isPresent
              ? \`Server correctly returns '\${r.name}: \${rawValue}'.\`
              : \`Server omitted '\${r.name}' header from response. Severity: \${r.sev.toUpperCase()} (\${r.scoreImpact} pts).\`,
          },
          header: { name: r.name, value: r.value },
          fix: isPresent ? undefined : fixFor(r.name, r.value),
          docs: \`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/\${r.name}\`,
        };`;

const newHstsCheck = `        if (r.name === "Strict-Transport-Security") {
          const hsts = validateHstsHeader(rawValue, anyIpTlsOk);
          return {
            id: r.name.toLowerCase(),
            title: r.name,
            category: "headers",
            learn: r.learn,
            severity: hsts.severity,
            scoreImpact: hsts.scoreImpact,
            found: hsts.found,
            why: r.why,
            evidence: {
              test: "Check Strict-Transport-Security header for RFC 6797 compliance",
              status: activeProbe.status ?? 200,
              url: activeProbe.finalUrl,
              headers: rawValue ? { [r.name]: rawValue } : { [r.name]: "Header Missing" },
              timestamp,
              reason: hsts.reason,
            },
            header: { name: r.name, value: r.value },
            fix: hsts.valid ? undefined : fixFor(r.name, r.value),
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
          why: r.why,
          evidence: {
            test: \`Check for \${r.name} in response headers\`,
            status: activeProbe.status ?? 200,
            url: activeProbe.finalUrl,
            headers: isPresent ? { [r.name]: rawValue } : { [r.name]: "Header Missing" },
            timestamp,
            reason: isPresent
              ? \`Server correctly returns '\${r.name}: \${rawValue}'.\`
              : \`Server omitted '\${r.name}' header from response. Severity: \${r.sev.toUpperCase()} (\${r.scoreImpact} pts).\`,
          },
          header: { name: r.name, value: r.value },
          fix: isPresent ? undefined : fixFor(r.name, r.value),
          docs: \`https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/\${r.name}\`,
        };`;

code = code.replace(oldHstsCheck, newHstsCheck);

// 4. Update Check 8 (RFC 9116 security.txt)
const oldCheck8 = `    // 8. RFC 9116 security.txt (Always INFO, 0 score impact)
    async (): Promise<Finding[]> => {
      const targetUrl = \`https://\${host}/.well-known/security.txt\`;
      const fallbackUrl = \`http://\${host}/.well-known/security.txt\`;

      let r = await safeFetch(targetUrl).catch(() => null);
      if (!r || r.res.status !== 200) {
        r = await safeFetch(fallbackUrl).catch(() => null);
      }

      const isPlaintext = /text\\/plain/i.test(r?.res.headers.get("content-type") ?? "");
      const ok = r?.res.status === 200 && isPlaintext;

      return [
        {
          id: "security-txt",
          title: "RFC 9116 security.txt Disclosure",
          category: "process",
          severity: ok ? "pass" : "info",
          scoreImpact: 0,
          found: ok
            ? "A valid plain-text security contact file is published at /.well-known/security.txt."
            : "No security.txt contact file found.",
          why: "RFC 9116 gives ethical security researchers a sanctioned contact channel to report discovered vulnerabilities.",
          evidence: {
            test: \`GET \${targetUrl}\`,
            status: r?.res.status ?? 404,
            url: r?.finalUrl || targetUrl,
            headers: r ? headersToRecord(r.res.headers) : { status: "404 Not Found" },
            timestamp,
            reason: ok
              ? "security.txt is published as text/plain."
              : "Missing security.txt is an informational RFC best-practice recommendation. Zero score penalty.",
          },
          docs: "https://securitytxt.org",
        },
      ];
    },`;

const newCheck8 = `    // 8. RFC 9116 security.txt (Always INFO or PASS, 0 score impact)
    async (): Promise<Finding[]> => {
      const targetUrl = \`https://\${host}/.well-known/security.txt\`;
      const fallbackUrl = \`http://\${host}/.well-known/security.txt\`;

      let r = await safeFetch(targetUrl, { readBody: true }).catch(() => null);
      if (!r || r.res.status !== 200) {
        r = await safeFetch(fallbackUrl, { readBody: true }).catch(() => null);
      }

      const contentType = r?.res.headers.get("content-type") ?? "";
      const validation = validateSecurityTxt(r?.res.status, contentType, r?.body ?? "");

      return [
        {
          id: "security-txt",
          title: "RFC 9116 security.txt Disclosure",
          category: "process",
          severity: validation.severity,
          scoreImpact: 0,
          found: validation.found,
          why: "RFC 9116 gives ethical security researchers a sanctioned contact channel to report discovered vulnerabilities.",
          evidence: {
            test: \`GET \${targetUrl}\`,
            status: r?.res.status ?? 404,
            url: r?.finalUrl || targetUrl,
            headers: r ? headersToRecord(r.res.headers) : { status: "404 Not Found" },
            timestamp,
            reason: validation.reason,
          },
          docs: "https://securitytxt.org",
        },
      ];
    },`;

code = code.replace(oldCheck8, newCheck8);

fs.writeFileSync("src/lib/checks.ts", code, "utf8");
console.log("Updated checks.ts with HSTS duplicate directive detection and RFC 9116 security.txt validation!");
