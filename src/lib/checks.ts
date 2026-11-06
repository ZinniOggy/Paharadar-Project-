import tls from "node:tls";
import { resolveMx, resolveTxt } from "node:dns/promises";
import type { Finding } from "./types";
import { safeFetch } from "./fetcher";

export type Main = Awaited<ReturnType<typeof safeFetch>> | null;

type Rule = { name: string; value: string; sev: "warn" | "info"; why: string; learn?: string };

const RULES: Rule[] = [
  { name: "Content-Security-Policy", value: "default-src 'self'", sev: "warn", learn: "csp",
    why: "Tells the browser which scripts may run. Without it, one injected script can read everything on the page." },
  { name: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains", sev: "warn", learn: "hsts",
    why: "Forces browsers to use HTTPS, which blocks downgrade attacks on public Wi-Fi." },
  { name: "X-Content-Type-Options", value: "nosniff", sev: "warn", learn: "nosniff",
    why: "Stops browsers from guessing file types, which can turn an upload into a script." },
  { name: "X-Frame-Options", value: "DENY", sev: "warn", learn: "clickjacking",
    why: "Prevents other sites from embedding yours in a hidden frame (clickjacking)." },
  { name: "Referrer-Policy", value: "strict-origin-when-cross-origin", sev: "info",
    why: "Limits how much of your URL leaks to other sites when users click links." },
  { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()", sev: "info",
    why: "Switches off browser features your site doesn’t use." },
];

const fixFor = (name: string, value: string) => [
  { label: "Nginx", code: `add_header ${name} "${value}" always;` },
  { label: "Apache", code: `Header always set ${name} "${value}"` },
  { label: "Next.js", code: `// next.config.ts → async headers()\n{ key: "${name}", value: "${value}" }` },
];

export function tlsInfo(host: string) {
  return new Promise<{ daysLeft: number; authorized: boolean; protocol: string }>((resolve, reject) => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 6000 }, () => {
      const c = s.getPeerCertificate();
      if (!c || !c.valid_to) { s.destroy(); reject(new Error("No certificate")); return; }
      resolve({
        daysLeft: Math.floor((new Date(c.valid_to).getTime() - Date.now()) / 864e5),
        authorized: s.authorized,
        protocol: s.getProtocol() ?? "TLS",
      });
      s.end();
    });
    s.on("error", reject);
    s.on("timeout", () => { s.destroy(); reject(new Error("TLS timeout")); });
  });
}

export function buildChecks(host: string, main: Main): (() => Promise<Finding[]>)[] {
  return [
    // 1. HTTP → HTTPS
    async (): Promise<Finding[]> => {
      const r = await safeFetch(`http://${host}`).catch(() => null);
      const ok = !!r?.finalUrl.startsWith("https://");
      return [{
        id: "https-redirect", title: "HTTP redirects to HTTPS", category: "transport", learn: "tls",
        severity: ok ? "pass" : "critical",
        found: ok ? "Plain HTTP requests are sent to HTTPS." : "Visiting http:// does not end up on https://.",
        why: "Without a redirect, visitors on shared networks can be served a tampered copy of your site.",
      }];
    },

    // 2. TLS certificate and protocol
    async (): Promise<Finding[]> => {
      const t = await tlsInfo(host).catch(() => null);
      if (!t) {
        return [{
          id: "tls", title: "TLS certificate", category: "transport", learn: "tls", severity: "critical",
          found: "Could not complete a secure connection.",
          why: "Visitors will see browser warnings or cannot connect at all.",
        }];
      }
      const oldProto = /^TLSv1(\.1)?$/.test(t.protocol);
      const severity = !t.authorized ? "critical" : oldProto || t.daysLeft < 14 ? "warn" : "pass";
      return [{
        id: "tls", title: "TLS certificate", category: "transport", learn: "tls", severity,
        found: !t.authorized
          ? "The certificate is not trusted by default."
          : `Valid, expires in ${t.daysLeft} days · ${t.protocol}`,
        why: "An invalid, expired or outdated TLS setup breaks trust and can block visitors.",
      }];
    },

    // 3. Security headers
    async (): Promise<Finding[]> => {
      if (!main) {
        return [{
          id: "https-load", title: "Site loads over HTTPS", category: "transport", severity: "critical",
          found: "The site could not be loaded over HTTPS.",
          why: "Without a working HTTPS site, none of the other protections can apply.",
        }];
      }
      return RULES.map((r): Finding => {
        const has = main.res.headers.has(r.name.toLowerCase());
        return {
          id: r.name.toLowerCase(), title: r.name, category: "headers", learn: r.learn,
          severity: has ? "pass" : r.sev,
          found: has ? "Header is present." : "Header is missing.",
          why: r.why,
          header: { name: r.name, value: r.value },
          fix: has ? undefined : fixFor(r.name, r.value),
          docs: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/${r.name}`,
        };
      });
    },

    // 4. Version disclosure: what the server *announces* (headers can be hidden or spoofed)
    async (): Promise<Finding[]> => {
      if (!main) return [];
      const announced = [main.res.headers.get("server"), main.res.headers.get("x-powered-by")]
        .filter((v): v is string => !!v && /\d+\.\d+/.test(v));
      if (!announced.length) {
        return [{
          id: "disclosure", title: "Software version disclosure", category: "exposure", learn: "disclosure",
          severity: "pass", found: "No version numbers announced in headers.",
          why: "Hiding versions makes targeted attacks slightly harder.",
        }];
      }
      const php = announced.join(" ").match(/PHP\/(\d+)\.(\d+)/i);
      // Check the cut-off at php.net/supported-versions before you quote it in your video
      const old = !!php && (Number(php[1]) < 8 || (Number(php[1]) === 8 && Number(php[2]) < 2));
      return [{
        id: "disclosure", title: "Software version disclosure", category: "exposure", learn: "disclosure",
        severity: old ? "critical" : "warn",
        found: `Server announces: ${announced.join(", ")}`,
        why: old
          ? "The announced PHP version no longer receives security fixes. Headers can be spoofed, so confirm on the server."
          : "Announcing exact versions helps attackers pick known exploits.",
      }];
    },

    // 5. CORS: does the site trust any origin?
    async (): Promise<Finding[]> => {
      if (!main) return [];
      const origin = "https://paharadar-probe.invalid";
      const r = await safeFetch(main.finalUrl, { headers: { origin } }).catch(() => null);
      if (!r) return [];
      const acao = r.res.headers.get("access-control-allow-origin");
      const creds = r.res.headers.get("access-control-allow-credentials") === "true";
      let severity: Finding["severity"] = "pass";
      let found = "No cross-origin access is granted to unknown sites.";
      if (acao === origin) {
        severity = creds ? "critical" : "warn";
        found = creds ? "The site trusts any origin and allows credentials." : "The site echoes back any origin it is asked about.";
      } else if (acao === "*") {
        severity = "info";
        found = "Any website may read responses from this site (Access-Control-Allow-Origin: *).";
      }
      return [{
        id: "cors", title: "CORS policy", category: "exposure", learn: "cors", severity, found,
        why: "If a site trusts every origin, a malicious page can read data on behalf of a logged-in visitor.",
      }];
    },

    // 6. Cookie flags
    async (): Promise<Finding[]> => {
      if (!main) return [];
      const cookies = main.res.headers.getSetCookie();
      if (!cookies.length) return [];
      const weak = cookies.filter((c) => !/;\s*secure/i.test(c) || !/;\s*httponly/i.test(c));
      const noSite = cookies.filter((c) => !/;\s*samesite/i.test(c));
      const severity = weak.length ? "warn" : noSite.length ? "info" : "pass";
      return [{
        id: "cookies", title: "Cookie flags", category: "sessions", learn: "cookies", severity,
        found: weak.length
          ? `${weak.length} cookie(s) missing Secure or HttpOnly.`
          : noSite.length ? `${noSite.length} cookie(s) missing SameSite.` : "Cookies set Secure, HttpOnly and SameSite.",
        why: "Without these flags, cookies can be read by scripts, sent insecurely or attached to cross-site requests.",
      }];
    },

    // 7. Email spoofing protection (SPF + DMARC)
    async (): Promise<Finding[]> => {
      const txt = async (n: string) => (await resolveTxt(n).catch(() => [] as string[][])).map((r) => r.join(""));
      const [mx, root, dm] = await Promise.all([resolveMx(host).catch(() => []), txt(host), txt(`_dmarc.${host}`)]);
      const spf = root.find((t) => /^v=spf1/i.test(t));
      const dmarc = dm.find((t) => /^v=DMARC1/i.test(t));
      const sends = mx.length > 0;
      const weakDmarc = !!dmarc && /p=none/i.test(dmarc);
      return [
        {
          id: "spf", title: "SPF record", category: "email", learn: "email",
          severity: spf ? "pass" : sends ? "warn" : "info",
          found: spf ? "An SPF record is published."
            : sends ? "This domain receives mail but publishes no SPF record."
            : "No SPF record. With no mail servers, a strict one is still worth publishing.",
          why: "SPF lists which servers may send email as your domain, so spoofed messages are easier to reject.",
          fix: spf ? undefined : [{ label: "DNS TXT", code: sends
            ? `${host}  TXT  "v=spf1 include:_spf.your-mail-provider.com ~all"`
            : `${host}  TXT  "v=spf1 -all"` }],
        },
        {
          id: "dmarc", title: "DMARC policy", category: "email", learn: "email",
          severity: !dmarc ? (sends ? "warn" : "info") : weakDmarc ? "info" : "pass",
          found: !dmarc ? "No DMARC record found." : weakDmarc ? "DMARC exists but only monitors (p=none)." : "A DMARC policy is enforced.",
          why: "DMARC tells receivers what to do with email that fails SPF or DKIM, which limits phishing sent in your name.",
          fix: dmarc && !weakDmarc ? undefined
            : [{ label: "DNS TXT", code: `_dmarc.${host}  TXT  "v=DMARC1; p=quarantine; rua=mailto:you@${host}"` }],
        },
      ];
    },

    // 8. security.txt (must be plain text; many sites answer 200 for every path)
    async (): Promise<Finding[]> => {
      const r = await safeFetch(`https://${host}/.well-known/security.txt`).catch(() => null);
      const ok = r?.res.status === 200 && /text\/plain/i.test(r.res.headers.get("content-type") ?? "");
      return [{
        id: "security-txt", title: "security.txt", category: "process",
        severity: ok ? "pass" : "info",
        found: ok ? "A security contact is published." : "No security.txt found.",
        why: "It tells researchers how to report a vulnerability to you.",
        docs: "https://securitytxt.org",
      }];
    },
  ];
}