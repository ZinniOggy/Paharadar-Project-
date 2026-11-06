import { lookup } from "node:dns/promises";
import net from "node:net";

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v = ip.toLowerCase();
  return (
    v === "::1" || v === "::" ||
    v.startsWith("fc") || v.startsWith("fd") ||
    v.startsWith("fe80") || v.startsWith("::ffff:")
  );
}

export function normalizeHost(input: string): string {
  const text = input.trim();
  let host: string;
  try {
    const u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    host = u.hostname.toLowerCase();
  } catch {
    throw new Error("Enter a valid domain, like example.com.");
  }
  if (!host.includes(".") || host.length > 253) {
    throw new Error("Enter a valid domain, like example.com.");
  }
  return host;
}

export async function assertPublicHost(host: string) {
  if (net.isIP(host)) throw new Error("Please enter a domain name, not an IP address.");
  const addrs = await lookup(host, { all: true }).catch(() => null);
  if (!addrs) throw new Error("We couldn’t find that domain. Check the spelling.");
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) {
    throw new Error("That address isn’t publicly reachable.");
  }
}