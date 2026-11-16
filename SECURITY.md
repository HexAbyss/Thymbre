# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's "Report a vulnerability" option in the Security tab, not in a public issue. Include what you found, how to reproduce it, and the version or commit you tested. We aim to reply within a few days.

## Voice data

A voice recording identifies a person, so Thymbre treats it as biometric data:

- Raw audio is not stored. Only speaker embeddings are kept.
- Embeddings from unrecognized voices expire after a short time unless the person is enrolled.
- Every enrolled voice can be deleted, together with all of its samples.

If you run Thymbre, enroll only people who agreed to it, and follow the data protection rules that apply where you operate (for example GDPR or LGPD).

## Before you deploy

Thymbre has no authentication yet. Anyone who can reach the API can enroll, identify and delete voices. The Compose file publishes the ports on `127.0.0.1` only, which keeps it local. Keep it that way, or put it behind a reverse proxy that handles login, and change the database password in `.env`.

## Supported versions

Thymbre has no stable release yet. Fixes go to `main`.
