import fs from "node:fs";

let code = fs.readFileSync("src/lib/checks.ts", "utf8");
const target = 'const scoreImpact = severity === "warn" ? -8 : 0;';
const repl = `const scoreImpact = severity === "warn" ? -8 : 0;
      const protoLabel = primaryTls.protocol === "TLSv1.3" ? "TLS 1.3 (Modern)" : primaryTls.protocol === "TLSv1.2" ? "TLS 1.2 (Secure Industry Standard)" : primaryTls.protocol || "TLS";`;
code = code.replace(target, repl);
fs.writeFileSync("src/lib/checks.ts", code, "utf8");
console.log("Fixed protoLabel in checks.ts");
