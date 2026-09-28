# Security Policy

## Supported Versions

Security fixes are applied to the latest release on the default branch. Older
releases may not receive backports; please upgrade to the latest version before
reporting an issue.

## Reporting a Vulnerability

Please do **not** open a public issue for security vulnerabilities. Instead,
report them privately using GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
feature for this repository, or contact the maintainers directly.

When reporting, please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (proof of concept if possible).
- Affected versions and environment details.
- Any suggested remediation.

We aim to acknowledge reports within a few business days and will keep you
updated as we investigate and remediate.

## Privileged Actions and Audit Export

Privileged dashboard actions — including Mainnet writes and settings changes —
are recorded in a tamper-evident audit log. The log is append-only and each
entry is chained to the previous entry via a cryptographic hash so that any
modification, reordering, or deletion of historical records is detectable.

### Exporting the audit log

Compliance and security reviewers can export the audit log from the compliance
dashboard. The export is available in two formats:

- **JSON** — machine-readable, includes the full hash chain for verification.
- **CSV** — human-readable summary for spreadsheet review.

Each export includes the chain head hash so that reviewers can verify the
exported records against the live log.

### Verifying an export

To verify that an exported log has not been tampered with, recompute the hash
chain from the first record to the last and confirm that the final hash matches
the exported chain head. A mismatch indicates that the log was altered after it
was written and should be treated as a security incident.

### Handling invalid input and unsupported environments

- Requests for an unsupported export format are rejected with a clear error
  rather than silently falling back to a default format.
- Requests for a time range that is malformed or inverted (end before start)
  are rejected with a validation error.
- Audit export is only available in environments where the audit log is
  enabled. In environments where it is disabled or unsupported, the export
  endpoint returns an explicit "unsupported environment" error instead of an
  empty or misleading result.
- If the audit store is unavailable, the export fails closed: no partial or
  unverified data is returned, and the failure is surfaced to the caller.

### Compatibility and migration notes

- The audit log format is versioned. Exports include a format version so that
  consumers can detect and handle schema changes.
- Existing deployments that predate the audit log will not have historical
  entries; the log begins at the point the feature was enabled. No migration is
  required, but reviewers should be aware that pre-enablement actions are not
  covered.
- Enabling the audit log does not change the behavior of privileged actions;
  it only records them.

## Security Best Practices for Contributors

- Never commit secrets, tokens, or credentials.
- Validate and sanitize all external input.
- Fail closed on error paths for security-sensitive operations.
- Add tests for the primary flow, at least one boundary case, and at least one
  failure case when changing security-relevant code.
