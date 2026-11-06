import type { Finding } from "./types";

export type Kit = { label: string; file: string; code: string };

export function buildKits(findings: Finding[]): Kit[] {
  const hs = findings.filter((f) => f.header && f.severity !== "pass").map((f) => f.header!);
  if (!hs.length) return [];

  const nginx = hs.map((h) => `add_header ${h.name} "${h.value}" always;`).join("\n");
  const apache = `<IfModule mod_headers.c>\n${hs.map((h) => `  Header always set ${h.name} "${h.value}"`).join("\n")}\n</IfModule>`;
  const next = `// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
${hs.map((h) => `          { key: "${h.name}", value: "${h.value}" },`).join("\n")}
        ],
      },
    ];
  },
};
export default nextConfig;`;
  const vercel = JSON.stringify(
    { headers: [{ source: "/(.*)", headers: hs.map((h) => ({ key: h.name, value: h.value })) }] },
    null,
    2
  );
  const netlify = `/*\n${hs.map((h) => `  ${h.name}: ${h.value}`).join("\n")}`;

  return [
    { label: "Nginx", file: "nginx-headers.conf", code: nginx },
    { label: "Apache", file: ".htaccess", code: apache },
    { label: "Next.js", file: "next.config.ts", code: next },
    { label: "Vercel", file: "vercel.json", code: vercel },
    { label: "Netlify", file: "_headers", code: netlify },
  ];
}