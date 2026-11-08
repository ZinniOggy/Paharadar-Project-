export type Severity = "pass" | "info" | "warn" | "critical" | "inconclusive";
export type Category = "transport" | "headers" | "exposure" | "email" | "sessions" | "process";

export interface IpDetail {
  ip: string;
  type: "ipv4" | "ipv6-native" | "nat64";
  status: string;
}

export interface ResolverEvidence {
  resolver: string;
  status: string;
  ipv4: string[];
  ipv6: string[];
  durationMs?: number;
  error?: string;
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

export interface Evidence {
  test: string;                      // Specific technical test performed
  status?: number | string;          // e.g. 200, 301, "ECONNREFUSED", "ETIMEDOUT"
  url?: string;                      // Probe target URL
  endpoint?: string;                 // Specific endpoint tested (e.g. for CORS / API route)
  headers?: Record<string, string>;  // Raw response headers captured
  resolvedIps?: string[];            // All resolved A and AAAA IP addresses tested
  ipDetails?: IpDetail[];            // Categorized IP endpoints (IPv4, Native IPv6, NAT64)
  dnsResolvers?: ResolverEvidence[]; // Multi-resolver DNS query evidence
  dnsLookups?: DnsLookupRecord[];    // Granular per-query DNS lookups with response codes
  dnsRecords?: string[];             // DNS answers returned (A, AAAA, MX, TXT)
  timestamp: string;                 // ISO 8601 audit timestamp
  dataFreshness?: "fresh-live-probe" | "cached"; // Fresh scan vs historical cache indication
  reason: string;                    // Technical justification for assigned severity
}

export interface Finding {
  id: string;
  title: string;
  category: Category;
  severity: Severity;
  scoreImpact?: number;             // Score deduction (e.g. -20, -8, 0)
  found: string;
  why: string;
  evidence?: Evidence;
  header?: { name: string; value: string }; // used by Fix kit
  fix?: { label: string; code: string }[];
  learn?: string;                           // slug of /learn guide
  docs?: string;
}
