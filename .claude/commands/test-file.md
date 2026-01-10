---
allowed-tools:
  - Bash
  - Read
---

# Run Tests for File

Run tests related to a specific file or test file.

## Target: $ARGUMENTS

## Steps

1. Determine the test command based on the file:
   - If file ends in `.test.ts` or `.spec.ts`: run that test directly
   - If file is in `src/`: look for corresponding `.test.ts` file
   - If file is in `e2e/`: run that e2e test

2. For unit tests:
   ```bash
   npm test -- $ARGUMENTS
   ```

3. For e2e tests:
   ```bash
   npm run test:e2e -- --grep "$ARGUMENTS"
   ```

4. Report test results and any failures
