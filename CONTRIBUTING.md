# Contributing

## Local Checks

Use Node.js 24 and install dependencies from the lockfile:

```bash
npm ci --legacy-peer-deps
```

Run the same checks used by the CI workflow before opening a pull request:

```bash
npm run lint
npm run typecheck
```

These commands match `.github/workflows/ci.yml`, which installs dependencies
with `npm ci --legacy-peer-deps` and then runs lint and typecheck.

## CI Workflow

GitHub Actions runs the CI workflow for pull requests and pushes to `main`.
When a pull request needs inspection, use:

```bash
gh pr checks <pr-number>
gh run list --workflow CI --branch <branch-name>
gh run view <run-id> --log-failed
```

Only rerun CI when the failure is unrelated to the pull request contents, such
as a transient runner or network failure:

```bash
gh run rerun <run-id> --failed
```

## Pull Request Checklist

- Confirm the branch is based on the current `main`.
- Keep the pull request focused on one behavior or documentation change.
- Run `npm run lint` and `npm run typecheck` locally.
- Review the Actions result for the pull request before requesting review.
- Wait for reviewer approval and passing CI before merging.
