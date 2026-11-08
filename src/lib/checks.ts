import tls from "node:tls";
import { Resolver } from "node:dns/promises";
import type { Finding, Evidence, IpDetail, ResolverEvidence, DnsLookupRecord } from "./types";
import { safeFetch } from "./fetcher";
import { validateHstsHeader, validateSecurityTxt, parseDmarcRecord, assessCspQuality, assessSpfRecord } from "./validators";
import {
  classifyIp,
  isNat64Address,
  classifyNetworkError,
  queryMultipleResolvers,
  getOrganizationalDomain,
  performGranularLookup,
  type ResolverTelemetry,
  type ClassifiedNetworkError,
} from "./network";

export type IpTlsResult = {
  ip: string;
  type: "ipv4" | "ipv6-native" | "nat64";
  ok: boolean;
  protocol?: string;
  authorized?: boolean;
  daysLeft?: number;
  error?: string;
  classifiedError?: ClassifiedNetworkError;
};

export type ProtocolProbe = {
  host: string;
  orgDomain: string;
  timestamp: string;
  dataFreshness: "fresh-live-probe" | "cached";
  dns: {
    ipv4: string[];
    ipv6Native: string[];
    nat64: string[];
    allIps: string[];
    ipDetails: IpDetail[];
    resolvers: ResolverTelemetry[];
    lookups: DnsLookupRecord[];
    mx: string[];
    spf: string[];
    dmarc: string[];
    spfHost: string;
    dmarcHost: string;
  };
  http: { status?: number; finalUrl?: string; headers: Record<string, string>; error?: string } | null;
  https: { status?: number; finalUrl?: string; headers: Record<string, string>; error?: string } | null;
  ipTls: IpTlsResult[];
};

type Rule = {
  name: string;
  value: string;
  sev: "warn" | "info";
  scoreImpact: number;
  why: string;
  learn?: string;
};

const RULES: Rule[] = [
  {
    name: "Content-Security-Policy",
    value: "default-src 'self'",
    sev: "warn",
    scoreImpact: -8,
    learn: "csp",
    why: "Restricts resource origins to prevent Cross-Site Scripting (XSS) and data injection.",
  },
  {
    name: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
    sev: "warn",
    scoreImpact: -8,
    learn: "hsts",
    why: "Forces browsers to exclusively connect over HTTPS, preventing SSL-stripping and MITM attacks.",
  },
  {
    name: "X-Content-Type-Options",
    value: "nosniff",
    sev: "warn",
    scoreImpact: -6,
    learn: "nosniff",
    why: "Prevents MIME-sniffing vulnerabilities where browsers execute non-executable files as scripts.",
  },
  {
    name: "X-Frame-Options",
    value: "DENY",
    sev: "warn",
    scoreImpact: -6,
    learn: "clickjacking",
    why: "Blocks unauthorized framing of your pages to eliminate UI redressing and clickjacking.",
  },
  {
    name: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
    sev: "info",
    scoreImpact: -1,
    why: "Protects sensitive query parameters and URL tokens from leaking across origin boundaries.",
  },
  {
    name: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
    sev: "info",
    scoreImpact: -1,
    why: "Disables unnecessary browser hardware APIs (camera, microphone, geolocation) by default.",
  },
];

const fixFor = (name: string, value: string) => [
  { label: "Nginx", code: `add_header ${name} "${value}" always;` },
  { label: "Apache", code: `Header always set ${name} "${value}"` },
  { label: "Next.js", code: `// next.config.ts → async headers()\n{ key: "${name}", value: "${value}" }` },
  { label: "Cloudflare", code: `// Transform Rules → Modify Response Header\nSet static: "${name}" = "${value}"` },
];

function headersToRecord(headers: Headers): Record<string, string> {
  const r: Record<string, string> = {};
  headers.forEach((val, key) => {
    r[key.toLowerCase()] = val;
  });
  return r;
}

async function probeSingleIpTls(ip: string, host: string): Promise<IpTlsResult> {
  const ipType = classifyIp(ip);

  const attemptConnect = (timeoutMs: number): Promise<IpTlsResult> =>
    new Promise((resolve) => {
      const s = tls.connect({ host: ip, servername: host, port: 443, timeout: timeoutMs }, () => {
        const c = s.getPeerCertificate();
        const proto = s.getProtocol() ?? "TLS";
        const auth = s.authorized;
        const daysLeft = c?.valid_to
          ? Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 864e5)
          : 0;
        s.end();
        resolve({
          ip,
          type: ipType,
          ok: true,
          protocol: proto,
          authorized: auth,
          daysLeft,
        });
      });

      s.on("error", (err: any) => {
        const classified = classifyNetworkError(err);
        resolve({
          ip,
          type: ipType,
          ok: false,
          error: classified.humanMessage,
          classifiedError: classified,
        });
      });

      s.on("timeout", () => {
        s.destroy();
        const classified: ClassifiedNetworkError = {
          category: "TIMED_OUT",
          code: "ETIMEDOUT",
          humanMessage: "Connection timed out (Host did not respond or packets dropped)",
        };
        resolve({
          ip,
          type: ipType,
          ok: false,
          error: classified.humanMessage,
          classifiedError: classified,
        });
      });
    });

  const firstAttempt = await attemptConnect(4500);
  if (firstAttempt.ok) return firstAttempt;

  // If port 443 actively rejected the connection (RST), the host is alive and confirmed closed
  if (firstAttempt.classifiedError?.category === "CONNECTION_REFUSED") {
    return firstAttempt;
  }

  // For timeouts or network errors, retry once to verify it is genuinely down (not a transient blip)
  const secondAttempt = await attemptConnect(3500);
  return secondAttempt;
}

export async function probeTarget(host: string): Promise<ProtocolProbe> {
  const timestamp = new Date().toISOString();
  const orgDomain = getOrganizationalDomain(host);

  // 1. Query Multiple Independent DNS Resolvers for A & AAAA
  const resolverTelemetry = await queryMultipleResolvers(host);
  const lookups: DnsLookupRecord[] = resolverTelemetry.flatMap((r) => r.lookups || []);

  // System resolver for MX, TXT (SPF), and DMARC
  const sysResolver = new Resolver({ timeout: 4000, tries: 1 });

  // Query MX on host, and if orgDomain !== host, also on orgDomain
  const hostMxLookup = await performGranularLookup(host, "MX", "System Default", sysResolver);
  lookups.push(hostMxLookup);

  let orgMxLookup: DnsLookupRecord | null = null;
  if (orgDomain !== host) {
    orgMxLookup = await performGranularLookup(orgDomain, "MX", "System Default", sysResolver);
    lookups.push(orgMxLookup);
  }

  // Query TXT (SPF) on host, and if orgDomain !== host, also on orgDomain
  const hostTxtLookup = await performGranularLookup(host, "TXT", "System Default", sysResolver);
  lookups.push(hostTxtLookup);

  let orgTxtLookup: DnsLookupRecord | null = null;
  if (orgDomain !== host) {
    orgTxtLookup = await performGranularLookup(orgDomain, "TXT", "System Default", sysResolver);
    lookups.push(orgTxtLookup);
  }

  // Query DMARC on _dmarc.host, and if orgDomain !== host, on _dmarc.orgDomain (RFC 7489 Section 6.6.3 fallback)
  const hostDmarcLookup = await performGranularLookup(`_dmarc.${host}`, "TXT", "System Default", sysResolver);
  lookups.push(hostDmarcLookup);

  let orgDmarcLookup: DnsLookupRecord | null = null;
  if (orgDomain !== host) {
    orgDmarcLookup = await performGranularLookup(`_dmarc.${orgDomain}`, "TXT", "System Default", sysResolver);
    lookups.push(orgDmarcLookup);
  }

  // Aggregate IPv4 and IPv6 records across all querying resolvers
  const rawIpv4 = [...new Set(resolverTelemetry.flatMap((r) => r.ipv4))];
  const rawIpv6 = [...new Set(resolverTelemetry.flatMap((r) => r.ipv6))];

  // Distinguish native IPv6 from NAT64 translated addresses (RFC 6052: 64:ff9b::/96)
  const ipv6Native: string[] = [];
  const nat64: string[] = [];

  for (const ip of rawIpv6) {
    if (isNat64Address(ip)) {
      nat64.push(ip);
    } else {
      ipv6Native.push(ip);
    }
  }

  // Actual unique routable endpoints to test (Native IPv4 + Native IPv6)
  const allIps = [...rawIpv4, ...ipv6Native];

  // SPF resolution: check host first, fallback to organizational domain
  const hostSpf = hostTxtLookup.answers.filter((t) => /^v=spf1/i.test(t));
  const orgSpf = orgTxtLookup?.answers.filter((t) => /^v=spf1/i.test(t)) || [];

  let spf: string[] = [];
  let spfHost = host;
  if (hostSpf.length > 0) {
    spf = hostSpf;
    spfHost = host;
  } else if (orgSpf.length > 0) {
    spf = orgSpf;
    spfHost = orgDomain;
  }

  // DMARC resolution per RFC 7489 Section 6.6.3 fallback algorithm:
  const hostDmarc = hostDmarcLookup.answers.filter((t) => /^v=DMARC1/i.test(t));
  const orgDmarc = orgDmarcLookup?.answers.filter((t) => /^v=DMARC1/i.test(t)) || [];

  let dmarc: string[] = [];
  let dmarcHost = host;
  if (hostDmarc.length > 0) {
    dmarc = hostDmarc;
    dmarcHost = host;
  } else if (orgDmarc.length > 0) {
    dmarc = orgDmarc;
    dmarcHost = orgDomain;
  }

  // Combined MX records (from host or organizational domain)
  const mxRecords = hostMxLookup.answers.length > 0 ? hostMxLookup.answers : (orgMxLookup?.answers || []);

  // 2. Parallel HTTP and HTTPS probes
  const [httpRes, httpsRes] = await Promise.all([
    safeFetch(`http://${host}`)
      .then((r) => ({
        status: r.res.status,
        finalUrl: r.finalUrl,
        headers: headersToRecord(r.res.headers),
      }))
      .catch((e: Error) => ({
        status: undefined,
        finalUrl: undefined,
        headers: {},
        error: e.message || "Connection failed",
      })),
    safeFetch(`https://${host}`)
      .then((r) => ({
        status: r.res.status,
        finalUrl: r.finalUrl,
        headers: headersToRecord(r.res.headers),
      }))
      .catch((e: Error) => ({
        status: undefined,
        finalUrl: undefined,
        headers: {},
        error: e.message || "HTTPS connection failed",
      })),
  ]);

  // 3. Test every actual IPv4 and native IPv6 address separately on Port 443
  const endpointsToTest = allIps.length > 0 ? allIps.slice(0, 6) : [host];
  const ipTls = await Promise.all(endpointsToTest.map((ip) => probeSingleIpTls(ip, host)));

  // Build IP details for evidence, preserving NAT64 addresses separately
  const ipDetails: IpDetail[] = [
    ...rawIpv4.map((ip): IpDetail => {
      const match = ipTls.find((t) => t.ip === ip);
      return { ip, type: "ipv4", status: match?.ok ? `${match.protocol} (Valid)` : match?.error || "Untested" };
    }),
    ...ipv6Native.map((ip): IpDetail => {
      const match = ipTls.find((t) => t.ip === ip);
      return { ip, type: "ipv6-native", status: match?.ok ? `${match.protocol} (Valid)` : match?.error || "Untested" };
    }),
    ...nat64.map((ip): IpDetail => ({
      ip,
      type: "nat64",
      status: "NAT64 Synthesized (RFC 6052 64:ff9b::/96 prefix detected; excluded from native IPv6 tally)",
    })),
  ];

  return {
    host,
    orgDomain,
    timestamp,
    dataFreshness: "fresh-live-probe",
    dns: {
      ipv4: rawIpv4,
      ipv6Native,
      nat64,
      allIps,
      ipDetails,
      resolvers: resolverTelemetry,
      lookups,
      mx: mxRecords,
      spf,
      dmarc,
      spfHost,
      dmarcHost,
    },
    http: httpRes,
    https: httpsRes,
    ipTls,
  };
}

export function buildChecks(probe: ProtocolProbe): (() => Promise<Finding[]>)[] {
  const { host, timestamp, dns, http, https, ipTls } = probe;
  // Security headers (especially HSTS) must be evaluated against the final HTTPS response!
  const finalHttpsProbe = https?.status ? https : http?.finalUrl?.startsWith("https://") ? http : null;
  const activeProbe = finalHttpsProbe ?? (http?.status ? http : null);
  const headers = activeProbe?.headers ?? {};

  const successfulTlsIps = ipTls.filter((r) => r.ok);
  const failedTlsIps = ipTls.filter((r) => !r.ok);
  const totalIpsTested = ipTls.length;
  const anyIpTlsOk = successfulTlsIps.length > 0;
  const allIpsTlsOk = totalIpsTested > 0 && failedTlsIps.length === 0;

  // Detailed endpoint report
  const ipSummary = ipTls
    .map((r) => `[${r.type.toUpperCase()}] ${r.ip}: ${r.ok ? `${r.protocol} (Valid)` : r.classifiedError?.code || r.error}`)
    .join(" | ");

  // Formatted resolver evidence
  const resolverEvidence: ResolverEvidence[] = dns.resolvers.map((r) => ({
    resolver: r.resolver,
    status: r.status === "ok" ? `OK (${r.durationMs}ms)` : `Error: ${r.error}`,
    ipv4: r.ipv4,
    ipv6: r.ipv6,
    durationMs: r.durationMs,
    error: r.error,
  }));

  return [
    // 1. Transport Layer Security & HTTPS Redirection (Multi-IP, NAT64-aware, precise phrasing)
    async (): Promise<Finding[]> => {
      let severity: Finding["severity"] = "pass";
      let scoreImpact = 0;
      let found = `HTTPS connection successfully established across tested endpoints. Plain HTTP automatically redirects to HTTPS.`;
      let reason = `Verified transport encryption. Probed ${totalIpsTested} native endpoint(s) on port 443; all negotiated TLS. HTTP redirects to HTTPS.`;

            const httpReachable = typeof http?.status === "number" && http.status > 0;
      const httpRedirectsToHttps = !!http?.finalUrl?.startsWith("https://");

      // Distinguish scanner-side network limitations (ENETUNREACH) from remote server failures
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
          reason = `Neither port 80 nor port 443 completed a connection (${ipSummary}). Target may be offline, rate-limiting, or firewalling probe requests. Inconclusive scan with 0 score penalty.`;
        } else {
          severity = "critical";
          scoreImpact = -20;
          found = "HTTPS connection could not be established on the tested IP addresses during this probe. Plain HTTP (port 80) was accessible.";
          reason = `Probed ${totalIpsTested} native endpoint(s) on port 443: all failed (${ipSummary}). Plain HTTP on port 80 answered with status ${http?.status}. Note: This assessment reflects external network reachability during the probe window and does not evaluate internal network topologies.`;
        }
      } else if (hasRemoteFailure) {
        severity = "warn";
        scoreImpact = -10;
        found = `Inconsistent infrastructure detected: ${successfulTlsIps.length} of ${totalIpsTested} tested endpoint(s) accepted HTTPS, while others failed remotely (${ipSummary}).`;
        reason = "Partial TLS deployment: some backend edge nodes accept port 443 while others refuse or drop connections.";
      } else if (!httpRedirectsToHttps) {
        severity = "warn";
        scoreImpact = -8;
        found = `HTTPS is operational across ${successfulTlsIps.length} reachable endpoint(s), but plain HTTP does not automatically redirect to HTTPS.`;
        reason = `HTTP request ended at ${http?.finalUrl || "http://" + host} with status ${http?.status || 200}. Visitors can inadvertently browse without encryption.`;
      } else {
        found = `HTTPS connection successfully established across ${successfulTlsIps.length} reachable native endpoint(s). Plain HTTP automatically redirects to HTTPS.`;
        reason = `Verified transport encryption. Probed ${successfulTlsIps.length} native endpoint(s) on port 443; all negotiated TLS. HTTP redirects to HTTPS.${localUnreachIps.length > 0 ? ` (Note: ${localUnreachIps.length} IPv6 endpoint(s) encountered scanner-side ENETUNREACH route limitations; target service was not penalized).` : ""}`;
      }

      return [
        {
          id: "https-redirect",
          title: "Transport Layer Security (HTTPS)",
          category: "transport",
          learn: "tls",
          severity,
          scoreImpact,
          found,
          why: "Unencrypted HTTP allows attackers on the same network to intercept session cookies, credentials, and page content.",
          evidence: {
            test: `Probed port 80 and port 443 across ${totalIpsTested} native IP endpoint(s) and 3 DNS resolvers`,
            status: anyIpTlsOk ? (http?.status ?? 200) : ipTls[0]?.classifiedError?.code || "PORT_443_UNAVAILABLE",
            url: http?.finalUrl || `http://${host}`,
            resolvedIps: dns.allIps,
            ipDetails: dns.ipDetails,
            dnsResolvers: resolverEvidence,
            dnsLookups: dns.lookups,
            dataFreshness: "fresh-live-probe",
            headers: http?.headers,
            dnsRecords: [
              ...dns.ipv4.map((ip) => `${ip} (Native IPv4 A)`),
              ...dns.ipv6Native.map((ip) => `${ip} (Native IPv6 AAAA)`),
              ...(dns.nat64.length ? dns.nat64.map((ip) => `${ip} (NAT64 RFC 6052 Translated)`) : []),
            ],
            timestamp,
            reason,
          },
        },
      ];
    },

    // 2. TLS Certificate & Cryptography (Granular Error Taxonomy: Refused vs Timeout vs Cert)
    async (): Promise<Finding[]> => {
      // If port 443 is refused or unreachable across all endpoints, mark INCONCLUSIVE without double-penalty
      if (!anyIpTlsOk) {
        const primaryErr = ipTls[0]?.classifiedError;
        return [
          {
            id: "tls",
            title: "TLS Certificate & Cryptography",
            category: "transport",
            learn: "tls",
            severity: "inconclusive",
            scoreImpact: 0,
            found: `Unable to verify TLS certificate: ${primaryErr?.humanMessage || ipTls[0]?.error || "Port 443 not reachable"}.`,
            why: "Port 443 is not accepting connections. Certificate validation cannot be completed and is consolidated under the primary transport finding.",
            evidence: {
              test: `TLS handshake to tested native endpoints on port 443: [${dns.allIps.join(", ")}]`,
              status: primaryErr?.code || ipTls[0]?.error || "ECONNREFUSED",
              resolvedIps: dns.allIps,
              ipDetails: dns.ipDetails,
              timestamp,
              dnsLookups: dns.lookups,
              dataFreshness: "fresh-live-probe",
              reason: `Target server did not complete a TLS handshake on any tested endpoint (${ipSummary}). Zero score penalty assigned.`,
            },
          },
        ];
      }

      const primaryTls = successfulTlsIps[0];
      if (!primaryTls?.authorized) {
        return [
          {
            id: "tls",
            title: "TLS Certificate & Cryptography",
            category: "transport",
            learn: "tls",
            severity: "critical",
            scoreImpact: -20,
            found: "TLS certificate is self-signed, invalid, or expired.",
            why: "Visitors will see browser security warnings, and the connection is vulnerable to interception.",
            evidence: {
              test: `TLS Certificate verification for ${host}:443`,
              status: "Certificate Untrusted",
              resolvedIps: dns.allIps,
              ipDetails: dns.ipDetails,
              timestamp,
              reason: "Certificate validation chain failed. Target presents an untrusted, expired, or mismatched certificate.",
            },
          },
        ];
      }

      const oldProto = !!primaryTls.protocol && /^TLSv1(\.1)?$/.test(primaryTls.protocol);
      const daysLeft = primaryTls.daysLeft ?? 90;
      const expiringSoon = daysLeft < 15;
      const severity = oldProto || expiringSoon ? "warn" : "pass";
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
          found: `Valid certificate (${daysLeft} days remaining) · Protocol: ${protoLabel} · Verified across ${successfulTlsIps.length} endpoint(s) with completed TLS handshake (out of ${totalIpsTested} resolved addresses).`,
          why: "A modern, valid TLS certificate authenticates the domain and establishes encrypted communication.",
          evidence: {
            test: `TLS Certificate Verification via port 443 across reachable endpoints: [${successfulTlsIps.map((s) => s.ip).join(", ")}]`,
            status: "Valid Certificate",
            resolvedIps: dns.allIps,
            ipDetails: dns.ipDetails,
            timestamp,
            reason: `Certificate is trusted by root CAs. Protocol negotiated: ${primaryTls.protocol}. Validity: ${daysLeft} days.`,
          },
        },
      ];
    },

    // 3. Security Headers (Inspected from active response, whether HTTPS or HTTP)
    async (): Promise<Finding[]> => {
      if (!activeProbe) {
        return [
          {
            id: "headers-offline",
            title: "HTTP Response Headers",
            category: "headers",
            severity: "inconclusive",
            scoreImpact: 0,
            found: "Target web server is offline or unreachable across both HTTP and HTTPS.",
            why: "Could not retrieve HTTP response headers.",
            evidence: {
              test: `HTTP GET http://${host} / https://${host}`,
              status: "Host Unreachable",
              timestamp,
              reason: "Server timed out or dropped incoming connection packets.",
            },
          },
        ];
      }

      return RULES.map((r): Finding => {
        const headerName = r.name.toLowerCase();
        const rawValue = headers[headerName];
        const isPresent = !!rawValue;

        if (r.name === "Strict-Transport-Security") {
          // RFC 6797 Section 8.1: HSTS MUST be delivered over HTTPS.
          // Never conclude HSTS is missing based only on an HTTP response.
          if (!finalHttpsProbe) {
            return {
              id: r.name.toLowerCase(),
              title: r.name,
              category: "headers",
              learn: r.learn,
              severity: "inconclusive",
              scoreImpact: 0,
              found: "HSTS header could not be verified because HTTPS endpoint did not respond to probe requests.",
              why: r.why,
              evidence: {
                test: "Check Strict-Transport-Security header for RFC 6797 compliance",
                status: "HTTPS_UNINSPECTED",
                url: `https://${host}`,
                headers: {},
                timestamp,
                reason:
                  "RFC 6797 Section 8.1 requires HSTS headers to be delivered exclusively over an encrypted HTTPS connection. Because an HTTPS response could not be inspected during this probe window, HSTS compliance cannot be determined. Zero score penalty assigned.",
              },
              header: { name: r.name, value: r.value },
              docs: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${r.name}`,
            };
          }

          const hstsHeaderValue = finalHttpsProbe.headers["strict-transport-security"];
          const hsts = validateHstsHeader(hstsHeaderValue, anyIpTlsOk);
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
              status: finalHttpsProbe.status ?? 200,
              url: finalHttpsProbe.finalUrl,
              headers: hstsHeaderValue ? { [r.name]: hstsHeaderValue } : { [r.name]: "Header Missing" },
              timestamp,
              reason: hsts.reason,
            },
            header: { name: r.name, value: r.value },
            fix: hsts.valid ? undefined : fixFor(r.name, r.value),
            docs: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${r.name}`,
          };
        }

        if (r.name === "Content-Security-Policy") {
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
            docs: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${r.name}`,
          };
        }

        return {
          id: r.name.toLowerCase(),
          title: r.name,
          category: "headers",
          learn: r.learn,
          severity: isPresent ? "pass" : r.sev,
          scoreImpact: isPresent ? 0 : r.scoreImpact,
          found: isPresent ? `Header is present: ${rawValue}` : "Header is missing from HTTP response.",
          why: r.why,
          evidence: {
            test: `Check for ${r.name} in response headers`,
            status: activeProbe.status ?? 200,
            url: activeProbe.finalUrl,
            headers: isPresent ? { [r.name]: rawValue } : { [r.name]: "Header Missing" },
            timestamp,
            reason: isPresent
              ? `Server correctly returns '${r.name}: ${rawValue}'.`
              : `Server omitted '${r.name}' header from response. Severity: ${r.sev.toUpperCase()} (${r.scoreImpact} pts).`,
          },
          header: { name: r.name, value: r.value },
          fix: isPresent ? undefined : fixFor(r.name, r.value),
          docs: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${r.name}`,
        };
      });
    },

    // 4. Software Version Disclosure (CALIBRATED: WARNING / INFO, NOT CRITICAL)
    async (): Promise<Finding[]> => {
      if (!activeProbe) return [];
      const server = headers["server"];
      const poweredBy = headers["x-powered-by"];

      const announced = [server, poweredBy].filter((v): v is string => !!v && /\d+\.\d+/.test(v));

      if (!announced.length) {
        return [
          {
            id: "disclosure",
            title: "Software Version Disclosure",
            category: "exposure",
            learn: "disclosure",
            severity: "pass",
            scoreImpact: 0,
            found: server
              ? `Server identity is masked: '${server}' (no specific version numbers exposed).`
              : "No server version banners announced in response headers.",
            why: "Masking exact server versions limits automated vulnerability reconnaissance.",
            evidence: {
              test: "Inspect Server and X-Powered-By response headers",
              status: activeProbe.status ?? 200,
              url: activeProbe.finalUrl,
              headers: {
                server: server || "Omitted",
                "x-powered-by": poweredBy || "Omitted",
              },
              timestamp,
              reason: "No outdated software versions or specific patch levels were disclosed.",
            },
          },
        ];
      }

      // Check whether the announced runtime is officially End-of-Life (e.g. PHP 7.4 reached EOL Nov 28, 2022)
      const phpMatch = announced.join(" ").match(/PHP\/(\d+)\.(\d+)(\.\d+)?/i);
      const isEolPhp =
        !!phpMatch &&
        (Number(phpMatch[1]) < 8 || (Number(phpMatch[1]) === 8 && Number(phpMatch[2]) < 2));

      return [
        {
          id: "disclosure",
          title: isEolPhp ? "Software Version Disclosure (Outdated EOL Runtime)" : "Software Version Disclosure",
          category: "exposure",
          learn: "disclosure",
          severity: isEolPhp ? "warn" : "info",
          scoreImpact: isEolPhp ? -8 : -1,
          found: `Server announces: ${announced.join(", ")}`,
          why: isEolPhp
            ? `The announced runtime (${phpMatch ? phpMatch[0] : "PHP"}) reached official End-of-Life (Nov 28, 2022) and no longer receives security fixes. Information disclosure assists attackers in selecting targeted exploits.`
            : "Announcing specific software versions helps attackers look up targeted CVEs.",
          evidence: {
            test: "Examine HTTP response headers for version banners",
            status: activeProbe.status ?? 200,
            url: activeProbe.finalUrl,
            headers: {
              server: server || "Omitted",
              "x-powered-by": poweredBy || "Omitted",
            },
            timestamp,
            reason: isEolPhp
              ? `Outdated EOL software exposed in 'x-powered-by' header (${phpMatch ? phpMatch[0] : "PHP"}). Classified as WARNING (-8 pts) rather than Critical because passive header disclosure is an advisory risk, not confirmed exploitation.`
              : `Server exposes version banner in response headers: ${announced.join(", ")}. Classified as INFO (-1 pt).`,
          },
        },
      ];
    },

    // 5. CORS Cross-Origin Policy (ENDPOINT-SPECIFIC per requirement #7)
    async (): Promise<Finding[]> => {
      if (!activeProbe) return [];
      const probeOrigin = "https://paharadar-security-probe.invalid";
      const targetUrl = https?.finalUrl || http?.finalUrl || `http://${host}`;

      const r = await safeFetch(targetUrl, { headers: { origin: probeOrigin } }).catch(() => null);
      const acao = r?.res.headers.get("access-control-allow-origin");
      const creds = r?.res.headers.get("access-control-allow-credentials") === "true";

      let severity: Finding["severity"] = "pass";
      let scoreImpact = 0;
      let found = `CORS probe against endpoint '${targetUrl}' did not reflect arbitrary origins.`;
      let reason = `Evaluated origin reflection on tested endpoint. Server did not return Access-Control-Allow-Origin for arbitrary caller '${probeOrigin}'. Note: CORS headers are evaluated per-endpoint and may differ across other API routes.`;

      if (acao === probeOrigin) {
        severity = creds ? "critical" : "warn";
        scoreImpact = creds ? -20 : -8;
        found = creds
          ? `Critical CORS misconfiguration on tested endpoint: server echoes back arbitrary origins AND allows credentials.`
          : `Server reflects arbitrary caller origins on tested endpoint '${targetUrl}'.`;
        reason = `Tested endpoint returned 'Access-Control-Allow-Origin: ${probeOrigin}'.`;
      } else if (acao === "*") {
        severity = "info";
        scoreImpact = 0;
        found = `Public resource sharing enabled on tested endpoint (Access-Control-Allow-Origin: *).`;
        reason = `Tested endpoint allows any origin to read public response data.`;
      }

      return [
        {
          id: "cors",
          title: "CORS Cross-Origin Policy (Tested Endpoint)",
          category: "exposure",
          learn: "cors",
          severity,
          scoreImpact,
          found,
          why: "Permissive CORS policies can allow untrusted external websites to make authenticated requests on behalf of a user.",
          evidence: {
            test: `Send probe Origin header '${probeOrigin}' to ${targetUrl}`,
            status: r?.res.status ?? 200,
            url: targetUrl,
            endpoint: targetUrl,
            headers: {
              "access-control-allow-origin": acao || "None",
              "access-control-allow-credentials": creds ? "true" : "false",
            },
            timestamp,
            reason,
          },
        },
      ];
    },

    // 6. Cookie Security Flags
    async (): Promise<Finding[]> => {
      if (!activeProbe) return [];
      const setCookie = headers["set-cookie"];
      if (!setCookie) return [];

      const cookies = setCookie.split(/,(?=\s*[^;=]+=[^;=]+)/);
      const weak = cookies.filter((c) => !/;\s*secure/i.test(c) || !/;\s*httponly/i.test(c));
      const noSite = cookies.filter((c) => !/;\s*samesite/i.test(c));

      const severity: Finding["severity"] = weak.length ? "warn" : noSite.length ? "info" : "pass";
      const scoreImpact = weak.length ? -8 : noSite.length ? -1 : 0;

      return [
        {
          id: "cookies",
          title: "Cookie Security Flags",
          category: "sessions",
          learn: "cookies",
          severity,
          scoreImpact,
          found: weak.length
            ? `${weak.length} cookie(s) missing Secure or HttpOnly flags.`
            : noSite.length
            ? `${noSite.length} cookie(s) missing SameSite attribute.`
            : "All session cookies enforce Secure, HttpOnly, and SameSite.",
          why: "HttpOnly prevents XSS theft of cookies, Secure prevents plaintext leakage, and SameSite blocks CSRF attacks.",
          evidence: {
            test: "Inspect Set-Cookie headers in response",
            status: activeProbe.status ?? 200,
            url: activeProbe.finalUrl,
            headers: { "set-cookie": setCookie },
            timestamp,
            reason: weak.length
              ? `Found cookies without Secure or HttpOnly: ${weak.join("; ")}.`
              : "Cookies configured with security attributes.",
          },
        },
      ];
    },

    // 7. Email Spoofing Defense (SPF & DMARC) - Accurate, Organizational-Domain-Aware
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
            test: `DNS TXT and MX query for ${host}${orgDomain !== host ? ` and ${orgDomain}` : ""}`,
            dnsRecords: [
              ...dns.mx.map((m) => `MX: ${m}`),
              ...(dns.spf.length ? dns.spf.map((s) => `TXT: ${s} (at ${dns.spfHost})`) : ["No SPF TXT records returned"]),
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
                    ? `${dns.spfHost}  TXT  "v=spf1 include:_spf.your-mail-provider.com ~all"`
                    : `${dns.spfHost}  TXT  "v=spf1 -all"`,
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
            test: `DNS TXT query for _dmarc.${host}${orgDomain !== host ? ` and _dmarc.${orgDomain} (RFC 7489 Section 6.6.3 fallback)` : ""}`,
            dnsRecords: dns.dmarc.length ? dns.dmarc.map((d) => `TXT: ${d} (at _dmarc.${dns.dmarcHost})`) : ["No DMARC TXT record found"],
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
                  code: `_dmarc.${dns.dmarcHost}  TXT  "v=DMARC1; p=quarantine; rua=mailto:security@${dns.dmarcHost}"`,
                },
              ],
        },
      ];
    },

    // 8. RFC 9116 security.txt (Always INFO or PASS, 0 score impact)
    async (): Promise<Finding[]> => {
      const targetUrl = `https://${host}/.well-known/security.txt`;
      const fallbackUrl = `http://${host}/.well-known/security.txt`;

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
            test: `GET ${targetUrl}`,
            status: r?.res.status ?? 404,
            url: r?.finalUrl || targetUrl,
            headers: r ? headersToRecord(r.res.headers) : { status: "404 Not Found" },
            timestamp,
            reason: validation.reason,
          },
          docs: "https://securitytxt.org",
        },
      ];
    },
  ];
}
