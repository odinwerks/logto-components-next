# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

This project is currently in early development (pre-1.0). Breaking changes may occur between minor versions.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **GitHub Security Advisory** (preferred):
   - Go to the [Security tab](https://github.com/odinwerks/logto-components-next/security) in the repository
   - Click "Report a vulnerability"
   - Fill out the form with details about the vulnerability

2. **Email**:
   - Send an email to the repository maintainers
   - Include "SECURITY" in the subject line
   - Provide a detailed description of the vulnerability

### What to Include

Please provide the following information:

- **Description**: A clear description of the vulnerability
- **Steps to reproduce**: Step-by-step instructions to reproduce the issue
- **Impact**: What an attacker could accomplish by exploiting this vulnerability
- **Affected versions**: Which versions are affected
- **Possible fix**: If you have suggestions for fixing the issue

### Response Timeline

- **Initial response**: Within 48 hours
- **Vulnerability confirmation**: Within 7 days
- **Fix development**: Depends on severity, typically 1-14 days
- **Disclosure**: After a fix is released

### Disclosure Policy

- We follow responsible disclosure practices
- We will credit researchers who report vulnerabilities (unless anonymity is requested)
- We request that you do not disclose the vulnerability publicly until a fix is available

## Security Considerations

This application handles sensitive authentication data. Key security features include:

### Token Handling

- Access tokens and ID tokens are handled securely
- Tokens are never logged (debug mode excludes sensitive values)
- Token introspection is performed server-side for protected actions

### Authentication

- OAuth 2.0 / OIDC flow via Logto
- Session management with secure cookies
- CSRF protection via Logto SDK

### Protected Actions API

- Token validation via OIDC introspection
- Organization membership verification
- Permission-based access control (RBAC)

### Data Protection

- User tokens are never exposed in client-side code (except in dev tab with DEBUG=true)
- Session data is stored securely
- Custom data persistence is handled through Logto's API

## Security Best Practices for Contributors

When contributing to this project:

1. **Never commit secrets**: No API keys, tokens, or credentials
2. **Sanitize user input**: Always validate and sanitize user-provided data
3. **Use parameterized queries**: When interacting with databases
4. **Follow least privilege**: Only request necessary permissions
5. **Log responsibly**: Never log sensitive data (tokens, passwords, PII)
6. **Keep dependencies updated**: Check for security advisories

## Known Security Limitations

1. **Avatar uploads**: Require S3-compatible storage configuration. Without proper configuration, uploads will fail.
2. **Protected Actions API**: Requires proper RBAC configuration in Logto Console.
3. **Organization context**: Requires `organizations` and `organization_roles` scopes.

## Security Updates

Security updates will be announced via:

- GitHub Security Advisories
- Release notes

Subscribe to repository releases to stay informed about security updates.

---

Thank you for helping keep Logto Dash secure!
