# Contributing

Thanks for your interest in Thymbre. This page covers how the repository is laid out and how changes land.

## Layout

```
src/backend/    FastAPI service, ML pipeline, migrations
src/frontend/   Next.js app
tests/backend/  backend tests
tests/frontend/ frontend tests
docs/           design notes
.github/        CI, issue and pull request templates
```

## Workflow

1. Open or pick an issue.
2. Branch from an up-to-date `main`: `feat/<topic>` or `fix/<topic>`.
3. Open a pull request into `main` that references the issue with `Closes #N`.
4. CI must pass: lint, format check and tests for both sides, a dependency audit, and a startup check that applies the migrations and exercises the frontend proxy.

## Running the checks

```bash
docker compose run --rm --no-deps backend sh -c "ruff check . && ruff format --check ."
docker compose run --rm backend pytest
```

The tests use a real Postgres (the `db` service) and create a separate `thymbre_test` database, so development data is never touched.

The frontend checks (lint, type check and tests) run as one Docker build:

```bash
docker build --target check -f src/frontend/Dockerfile .
```

## Testing

- Every bug fix starts with a test that reproduces the bug and fails. The fix makes it pass, and the test stays in the suite as a regression test. A pull request that fixes a bug without one will not be merged.
- Regression tests live in `tests/backend/regression/` and are named after the behavior, with the issue number in the docstring. Frontend regression tests sit next to the others in `tests/frontend/` and say which bug they cover.
- New features come with tests for the normal path, the error paths and the edge cases (empty audio, silence, very short clips, unsupported formats, unknown speakers).
- Tests do not depend on network access or on downloaded model weights. Use small fixtures or fakes.
- The tests that load the real models are skipped by default. Run them with `docker compose run --rm --no-deps -e RUN_MODEL_TESTS=1 backend pytest tests/test_real_models.py`. CI runs them once a week.
- Run the frontend tests with the Docker build above. Do not mount `tests/frontend/` into a container, because Docker leaves an empty `tests/` folder next to the sources.

## Security

- Treat every upload and request parameter as untrusted: validate type, size and duration, and reject what does not fit.
- Raw audio is never written to disk or to the database. Keep it in memory and discard it after the embedding is computed.
- Do not log audio content, embeddings or speaker names.
- Secrets come from environment variables and never from the repository.
- CI runs `ruff` with the security rules (`S`) and `pip-audit` on the dependencies. Fix findings or document why one does not apply.
- Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

## Documentation

- Documents describe how the system works today. History belongs in git, issues and pull requests, not in the docs.
- Each fact lives in one place. Other documents link to it instead of repeating it.
- Before changing behavior, read the documents that cover it. If the change makes any of them wrong, update them in the same pull request.
- Changes to the API, the data model, the configuration or the audio pipeline update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and, when commands change, the README.

## Conventions

- Code, comments, commit messages and documentation are in English.
- Comments describe what the code does and why, not its history.
- Frontend styling is Tailwind utilities. Design tokens live in `@theme` in `app/globals.css`, and a pattern that repeats across screens becomes a component class there.
- Schema changes go through an Alembic migration.
- Changes that users or operators will notice get a line in [CHANGELOG.md](CHANGELOG.md), under the next version.
