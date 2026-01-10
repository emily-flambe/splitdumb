---
allowed-tools:
  - Bash
  - Read
---

# PR Preparation

Run all checks, stage changes, and prepare for commit.

## Steps

1. Run type checking:
   ```bash
   npx tsc --noEmit
   ```

2. Run unit tests:
   ```bash
   npm test
   ```

3. Run e2e tests:
   ```bash
   npm run test:e2e
   ```

4. Show git status:
   ```bash
   git status
   ```

5. Show diff of changes:
   ```bash
   git diff
   ```

6. If all checks pass, summarize:
   - What changed
   - Test results
   - Suggested commit message

7. Ask if user wants to proceed with commit
