# Security policy

Please report vulnerabilities privately by email to **security@heidrich-digital.de**. Do not open a public issue.

Include what you found, how to reproduce it, the affected version or commit, and the impact you expect. You will get an answer within five working days. We will agree on a disclosure date with you and credit you in the release notes if you want.

In scope: the server (`src/`), the MCP endpoints, the CLI, the checker (including the browser sandbox and the egress proxy), exports and launch checks. Areas we care about most: authentication and sessions, capability URLs, SSRF and DNS rebinding through capture or checks, stored pages escaping their sandbox, path traversal in theme import and export.

Out of scope: findings that need a compromised host or an attacker who already holds `KK_TOKEN` or `KK_PASSWORD`, missing hardening headers without an exploit, and denial of service by resource exhaustion on an instance you run yourself.

Supported versions: the latest release and `main`.
