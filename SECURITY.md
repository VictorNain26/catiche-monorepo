# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |

## Reporting a Vulnerability

1. **Do NOT** open a public GitHub issue
2. Use [GitHub's private security advisory](https://github.com/VictorNain26/tomai-monorepo/security/advisories/new)
3. Include: description, reproduction steps, potential impact

We will acknowledge within 48 hours and provide a fix timeline within 7 days.

## Security Measures

- Dependency updates opened by Renovate (`.github/renovate.json`: minor/patch auto-merged
  once CI is green after a 3-day release age, majors reviewed by a human); Dependabot
  only raises vulnerability alerts
- GitHub secret scanning with push protection
- The security jobs of the CI, on every pull request and push to `main`: `.github/workflows/ci.yml`
- Non-root server image (the base image's `bun` user)
- Security headers on the landing page (`apps/landing/Caddyfile`: HSTS and a redirect to HTTPS,
  nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy, `frame-ancestors`) and the server. The
  landing has a hash-based CSP (`security.csp` in `apps/landing/astro.config.mjs`); the web app
  (`apps/web`, served by the server) gets its own in lot 3
