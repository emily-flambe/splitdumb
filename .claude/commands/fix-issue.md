---
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - WebFetch
---

# Fix GitHub Issue

Pull and fix a GitHub issue by number.

## Issue Number: $ARGUMENTS

## Steps

1. Fetch the issue details from GitHub:
   ```bash
   gh issue view $ARGUMENTS --json title,body,labels,comments
   ```

2. Analyze the issue and understand requirements

3. Search the codebase for relevant files

4. Implement the fix following existing code patterns

5. Write or update tests for the changes

6. Run verification:
   ```bash
   npm test && npm run test:e2e
   ```

7. Summarize changes made and request review
