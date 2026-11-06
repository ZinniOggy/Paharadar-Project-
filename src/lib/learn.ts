export type Article = {
  slug: string; title: string; tag: string; minutes: number;
  lead: string; what: string; why: string; how: string[]; pitfalls: string[]; docs: string;
};

export const ARTICLES: Article[] = [
  {
    slug: "hsts", title: "HSTS: always use HTTPS", tag: "Transport", minutes: 3,
    lead: "One header that tells browsers never to talk to your site over plain HTTP.",
    what: "Strict-Transport-Security (HSTS) is a response header. After a browser sees it once, it upgrades every future visit to HTTPS for the time you specify.",
    why: "Without it, someone on the same café or office Wi-Fi can interfere with the first plain-HTTP request and quietly serve visitors a fake copy of your site.",
    how: ["Make sure your whole site, and every subdomain you care about, loads correctly over HTTPS.", "Start with a short lifetime: Strict-Transport-Security: max-age=300.", "When nothing breaks, raise it to one year: max-age=31536000.", "Add includeSubDomains only once every subdomain supports HTTPS."],
    pitfalls: ["A long max-age on a site with broken HTTPS can lock visitors out until it expires.", "The preload option is hard to undo, so use it only when you are certain."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security",
  },
  {
    slug: "csp", title: "Content-Security-Policy", tag: "Browser", minutes: 5,
    lead: "An allow-list that decides which scripts, styles and images your pages may load.",
    what: "CSP is a header that lists the sources your page is allowed to load content from. Anything else is blocked by the browser.",
    why: "If an attacker manages to inject a script into one of your pages, a good policy stops it from running or from sending data away.",
    how: ["Start with Content-Security-Policy-Report-Only so you can see what would break without breaking it.", "Begin with default-src 'self' and add only the sources you really use.", "Avoid 'unsafe-inline' for scripts. Use nonces or hashes instead.", "Switch from report-only to enforcing once the reports are quiet."],
    pitfalls: ["Copying a strict policy blindly can break analytics, fonts and inline scripts.", "A policy full of wildcards gives a false sense of safety."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP",
  },
  {
    slug: "clickjacking", title: "Clickjacking and X-Frame-Options", tag: "Browser", minutes: 2,
    lead: "Stop other websites from putting yours inside an invisible frame.",
    what: "X-Frame-Options (and the newer CSP frame-ancestors) tell browsers whether your pages may be shown inside a frame on another site.",
    why: "In clickjacking, a hidden copy of your page sits under a fake button. The visitor thinks they are clicking one thing and actually clicks yours.",
    how: ["Send X-Frame-Options: DENY if nothing needs to embed your pages.", "Use SAMEORIGIN if only your own pages embed each other.", "Modern option: Content-Security-Policy: frame-ancestors 'none'."],
    pitfalls: ["Legitimate embeds, like a payment widget on your own site, need SAMEORIGIN or an allow-list."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options",
  },
  {
    slug: "nosniff", title: "X-Content-Type-Options", tag: "Browser", minutes: 2,
    lead: "Make browsers trust the file type you declare instead of guessing.",
    what: "With nosniff, a browser will not second-guess the Content-Type you send. A file declared as an image stays an image.",
    why: "Without it, a user-uploaded file disguised as a picture could be treated as a script and run in your visitors’ browsers.",
    how: ["Add the header X-Content-Type-Options: nosniff to every response.", "Serve the correct Content-Type for each file."],
    pitfalls: ["If your server sends wrong file types, nosniff will make browsers block them. That is a sign to fix the types."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options",
  },
  {
    slug: "cookies", title: "Cookie flags: Secure, HttpOnly, SameSite", tag: "Sessions", minutes: 3,
    lead: "Three small attributes that protect your visitors’ logins.",
    what: "Cookies carry login sessions. Flags on the Set-Cookie header control who can read them and when they are sent.",
    why: "Without HttpOnly, an injected script can steal the session. Without Secure, it can travel over plain HTTP. Without SameSite, other sites can trigger requests with it.",
    how: ["Add Secure so the cookie is only sent over HTTPS.", "Add HttpOnly so scripts cannot read it.", "Add SameSite=Lax (or Strict) so it is not sent on most cross-site requests.", "Example: Set-Cookie: session=abc; Secure; HttpOnly; SameSite=Lax; Path=/"],
    pitfalls: ["SameSite=None only works together with Secure.", "Cookies that JavaScript must read cannot be HttpOnly, so keep those free of secrets."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies",
  },
  {
    slug: "tls", title: "HTTPS and certificates", tag: "Transport", minutes: 4,
    lead: "Encryption and identity for every visit, and keeping them from expiring.",
    what: "HTTPS encrypts traffic between visitors and your server, and a certificate proves the server really belongs to your domain.",
    why: "Without it, anyone on the network path can read or change what your visitors send and receive. Expired certificates also trigger scary browser warnings.",
    how: ["Use a certificate from a trusted authority. Many hosts and Let’s Encrypt provide them free.", "Automate renewal so nobody has to remember.", "Redirect all http:// requests to https:// with a permanent redirect.", "Turn off old TLS versions your server still offers."],
    pitfalls: ["Forgetting a renewal is the most common cause of outages.", "Redirect loops behind a proxy or CDN usually mean the proxy is not forwarding the original protocol."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security",
  },
  {
    slug: "disclosure", title: "Version disclosure", tag: "Exposure", minutes: 3,
    lead: "Why your server shouldn’t announce exactly what it is running.",
    what: "Headers like Server and X-Powered-By can reveal software and version numbers, such as PHP/7.4.",
    why: "Attackers match announced versions against lists of known vulnerabilities. Hiding the version does not fix a problem, but it stops advertising it.",
    how: ["PHP: set expose_php = Off.", "Nginx: server_tokens off;", "Apache: ServerTokens Prod", "Most important: keep the software on a supported version, and check php.net/supported-versions for PHP."],
    pitfalls: ["Hiding versions is not a substitute for patching.", "Headers can be changed or faked, so a scan only shows what the server chooses to say."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server",
  },
  {
    slug: "email", title: "SPF and DMARC: stop email spoofing", tag: "Email", minutes: 4,
    lead: "DNS records that make it harder to send scam emails in your name.",
    what: "SPF lists the servers allowed to send email for your domain. DMARC tells receiving servers what to do with messages that fail the checks, and where to send reports.",
    why: "Scammers can fake the From address of any domain. Phishing that appears to come from a real organisation hurts the people who trust it.",
    how: ["Publish an SPF record listing your real mail senders.", "Turn on DKIM signing at your email provider.", "Publish DMARC starting with p=none and a reporting address.", "After reading the reports, move to p=quarantine, then p=reject."],
    pitfalls: ["Going strict before every legitimate sender is listed will block real email.", "SPF is limited to 10 DNS lookups, so many services can break it."],
    docs: "https://dmarc.org/overview/",
  },
  {
    slug: "cors", title: "CORS: who may read your responses", tag: "Exposure", minutes: 3,
    lead: "A browser rule that is easy to misconfigure into a data leak.",
    what: "Cross-Origin Resource Sharing decides which other websites may read responses from yours using a visitor’s browser.",
    why: "If you trust every origin and also allow credentials, a malicious page can read a logged-in visitor’s private data from your site.",
    how: ["Allow only exact, known origins.", "Never combine Access-Control-Allow-Origin: * with credentials.", "Do not echo the Origin header back without checking it against an allow-list."],
    pitfalls: ["* is fine for truly public data, such as an open API.", "CORS is not authentication. It only controls what browsers share."],
    docs: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS",
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);