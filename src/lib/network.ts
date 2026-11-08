import dns from "node:dns";
import { Resolver } from "node:dns/promises";

/**
 * Classifies an IP address into IPv4, Native IPv6, or NAT64-translated address.
 * RFC 6052 specifies the Well-Known Prefix for NAT64: 64:ff9b::/96
 * RFC 8215 specifies local-use NAT64 prefixes: 64:ff9b:1::/48
 */
export function isNat64Address(ip: string): boolean {
  if (!ip || !ip.includes(":")) return false;
  const normalized = ip.trim().toLowerCase();

  // Match 64:ff9b::/96 (Well-Known Prefix)
  if (normalized.startsWith("64:ff9b::") || normalized.startsWith("0064:ff9b:0000:0000:0000:0000:")) {
    return true;
  }

  // Match 64:ff9b:1::/48 (Local-use Prefix)
  if (normalized.startsWith("64:ff9b:1:") || normalized.startsWith("0064:ff9b:0001:")) {
    return true;
  }

  // Handle embedded IPv4 notation e.g., 64:ff9b::192.0.2.33
  const parts = normalized.split(":");
  if (parts.length >= 2 && parts[0] === "64" && parts[1] === "ff9b") {
    return true;
  }

  return false;
}

export function classifyIp(ip: string): "ipv4" | "ipv6-native" | "nat64" {
  if (!ip.includes(":")) {
    return "ipv4";
  }
  if (isNat64Address(ip)) {
    return "nat64";
  }
  return "ipv6-native";
}

export type NetworkErrorCategory =
  | "CONNECTION_REFUSED"
  | "TIMED_OUT"
  | "NETWORK_UNREACHABLE"
  | "TLS_CERT_ERROR"
  | "DNS_ERROR"
  | "GENERIC_NETWORK_ERROR";

export interface ClassifiedNetworkError {
  category: NetworkErrorCategory;
  code: string;
  humanMessage: string;
}

export function classifyNetworkError(err: any): ClassifiedNetworkError {
  const code = String(err?.code || err?.name || "").toUpperCase();
  const msg = String(err?.message || "").toLowerCase();

  // 1. Connection Refused (Server host active, but port closed/dropped RST)
  if (code === "ECONNREFUSED" || msg.includes("econnrefused") || msg.includes("connection refused")) {
    return {
      category: "CONNECTION_REFUSED",
      code: "ECONNREFUSED",
      humanMessage: "Connection actively refused by host (Port 443 closed or RST sent)",
    };
  }

  // 2. Timed Out (Firewall drop or host unreachable without response)
  if (
    code === "ETIMEDOUT" ||
    code === "ESOCKETTIMEDOUT" ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  ) {
    return {
      category: "TIMED_OUT",
      code: "ETIMEDOUT",
      humanMessage: "Connection timed out (Host did not respond or packets dropped)",
    };
  }

  // 3. Network / Host Unreachable (Routing or gateway failure)
  if (
    code === "ENETUNREACH" ||
    code === "EHOSTUNREACH" ||
    code === "ENETDOWN" ||
    msg.includes("unreachable") ||
    msg.includes("network is down")
  ) {
    return {
      category: "NETWORK_UNREACHABLE",
      code: code || "ENETUNREACH",
      humanMessage: "Network or route unreachable (Routing path unavailable)",
    };
  }

  // 4. Specific TLS Certificate Validation Errors
  if (
    code.includes("CERT") ||
    code.includes("DEPTH_ZERO") ||
    code.includes("SELF_SIGNED") ||
    code.includes("UNABLE_TO_VERIFY") ||
    code.includes("ERR_TLS") ||
    msg.includes("certificate") ||
    msg.includes("self signed") ||
    msg.includes("expired")
  ) {
    return {
      category: "TLS_CERT_ERROR",
      code: code || "TLS_CERT_ERROR",
      humanMessage: `TLS certificate verification error (${code || err?.message})`,
    };
  }

  // 5. DNS Errors
  if (code.startsWith("ENOTFOUND") || code.startsWith("ENODATA") || msg.includes("getaddrinfo")) {
    return {
      category: "DNS_ERROR",
      code: code || "ENOTFOUND",
      humanMessage: `DNS resolution failed (${code})`,
    };
  }

  return {
    category: "GENERIC_NETWORK_ERROR",
    code: code || "UNKNOWN",
    humanMessage: err?.message || "Unknown network error",
  };
}

export interface ResolverTelemetry {
  resolver: string;
  status: "ok" | "error";
  ipv4: string[];
  ipv6: string[];
  durationMs: number;
  error?: string;
  lookups?: DnsLookupRecord[];
}

export interface DnsLookupRecord {
  queryName: string;
  queryType: "A" | "AAAA" | "MX" | "TXT";
  resolver: string;
  responseCode: "NOERROR" | "NXDOMAIN" | "NODATA" | "SERVFAIL" | "TIMEOUT" | "ERROR";
  timestamp: string;
  durationMs: number;
  answers: string[];
  error?: string;
}

/**
 * Extracts the Organizational Domain from a host string according to RFC 7489 (DMARC) Section 3.2.
 * E.g.:
 *   "www.educationboard.gov.bd" -> "educationboard.gov.bd"
 *   "portal.sonalibank.com.bd" -> "sonalibank.com.bd"
 *   "www.example.com"          -> "example.com"
 *   "sub.mail.service.org.uk"  -> "service.org.uk"
 *   "daraz.com.bd"             -> "daraz.com.bd"
 *   "example.com"              -> "example.com"
 */
export function getOrganizationalDomain(host: string): string {
  if (!host) return "";
  const clean = host.trim().toLowerCase().replace(/^www\./, "");
  const parts = clean.split(".").filter(Boolean);
  if (parts.length <= 2) return clean;

  // Recognized 2-part public suffixes (ccTLD second levels)
  const twoPartSuffixes = new Set([
    "gov.bd", "com.bd", "edu.bd", "ac.bd", "org.bd", "net.bd", "mil.bd",
    "co.uk", "org.uk", "me.uk", "ac.uk", "gov.uk",
    "com.au", "net.au", "org.au", "edu.au", "gov.au",
    "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in", "nic.in", "ac.in", "edu.in", "gov.in",
    "co.nz", "net.nz", "org.nz", "govt.nz", "ac.nz",
    "com.sg", "net.sg", "org.sg", "gov.sg", "edu.sg",
    "co.za", "org.za", "net.za", "ac.za", "gov.za",
    "co.jp", "ne.jp", "or.jp", "ac.jp", "go.jp",
    "com.br", "org.br", "net.br", "gov.br", "edu.br",
  ]);

  const lastTwo = parts.slice(-2).join(".");
  if (twoPartSuffixes.has(lastTwo)) {
    // If domain ends with a 2-part suffix, the organizational domain includes the preceding label (3 parts total)
    return parts.slice(-3).join(".");
  }

  // Standard 1-part TLD (e.g. .com, .org, .net, .edu, .gov, .io, .dev, etc.)
  return parts.slice(-2).join(".");
}

export function mapDnsErrorCodeToRcode(err: any): DnsLookupRecord["responseCode"] {
  const code = String(err?.code || "").toUpperCase();
  const msg = String(err?.message || "").toLowerCase();

  if (code === "ENOTFOUND" || msg.includes("not found")) return "NXDOMAIN";
  if (code === "ENODATA" || msg.includes("no data")) return "NODATA";
  if (code === "ETIMEOUT" || code === "ETIMEDOUT" || msg.includes("timeout")) return "TIMEOUT";
  if (code === "ESERVFAIL" || msg.includes("servfail")) return "SERVFAIL";
  return "ERROR";
}

/**
 * Executes a granular DNS query and records its query name, resolver, response code, timestamp, and answers.
 */
export async function performGranularLookup(
  queryName: string,
  queryType: "A" | "AAAA" | "MX" | "TXT",
  resolverName: string,
  resolverInstance: Resolver
): Promise<DnsLookupRecord> {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  try {
    let answers: string[] = [];
    if (queryType === "A") {
      const res = await resolverInstance.resolve4(queryName);
      answers = [...new Set(res)];
    } else if (queryType === "AAAA") {
      const res = await resolverInstance.resolve6(queryName);
      answers = [...new Set(res)];
    } else if (queryType === "MX") {
      const res = await resolverInstance.resolveMx(queryName);
      answers = res.map((m) => `${m.exchange} (priority ${m.priority})`);
    } else if (queryType === "TXT") {
      const res = await resolverInstance.resolveTxt(queryName);
      answers = res.map((parts) => parts.join(""));
    }

    return {
      queryName,
      queryType,
      resolver: resolverName,
      responseCode: "NOERROR",
      timestamp,
      durationMs: Date.now() - start,
      answers,
    };
  } catch (err: any) {
    return {
      queryName,
      queryType,
      resolver: resolverName,
      responseCode: mapDnsErrorCodeToRcode(err),
      timestamp,
      durationMs: Date.now() - start,
      answers: [],
      error: err?.code || err?.message || "DNS query failed",
    };
  }
}

/**
 * Queries multiple DNS resolvers (System default, Google 8.8.8.8, Cloudflare 1.1.1.1)
 * to prevent single-resolver bias and capture multi-perspective DNS telemetry.
 */
export async function queryMultipleResolvers(host: string): Promise<ResolverTelemetry[]> {
  const resolversToQuery = [
    { name: "System Default", ips: [] as string[] },
    { name: "Google Public DNS (8.8.8.8)", ips: ["8.8.8.8"] },
    { name: "Cloudflare DNS (1.1.1.1)", ips: ["1.1.1.1"] },
  ];

  const results = await Promise.all(
    resolversToQuery.map(async (r): Promise<ResolverTelemetry> => {
      const start = Date.now();
      try {
        const res = new Resolver({ timeout: 3500, tries: 1 });
        if (r.ips.length > 0) {
          res.setServers(r.ips);
        }

        const [aLookup, aaaaLookup] = await Promise.all([
          performGranularLookup(host, "A", r.name, res),
          performGranularLookup(host, "AAAA", r.name, res),
        ]);

        return {
          resolver: r.name,
          status: aLookup.responseCode === "NOERROR" || aaaaLookup.responseCode === "NOERROR" ? "ok" : "error",
          ipv4: aLookup.answers,
          ipv6: aaaaLookup.answers,
          durationMs: Date.now() - start,
          lookups: [aLookup, aaaaLookup],
          error: aLookup.error && aaaaLookup.error ? aLookup.error : undefined,
        };
      } catch (err: any) {
        return {
          resolver: r.name,
          status: "error",
          ipv4: [],
          ipv6: [],
          durationMs: Date.now() - start,
          error: err?.code || err?.message || "Resolver query failed",
          lookups: [],
        };
      }
    })
  );

  return results;
}
