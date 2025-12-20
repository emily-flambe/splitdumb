#!/bin/bash
# Creates a new git worktree with proper setup for parallel Claude Code development
#
# Usage: ./scripts/new-worktree.sh <branch-name> [base-branch]
# Example: ./scripts/new-worktree.sh feature-auth main

set -e

BRANCH_NAME=$1
BASE_BRANCH=${2:-main}
PROJECT_NAME="splitdumb"
WORKTREE_DIR="../${PROJECT_NAME}-${BRANCH_NAME}"

if [ -z "$BRANCH_NAME" ]; then
  echo "Usage: $0 <branch-name> [base-branch]"
  echo "Example: $0 feature-auth main"
  exit 1
fi

# Ensure we're in the main repo
if [ ! -d ".git" ]; then
  echo "Error: Run this from the main repository root"
  exit 1
fi

# Fetch latest
echo "Fetching latest from origin..."
git fetch origin

# Create worktree
echo "Creating worktree at ${WORKTREE_DIR}..."
if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  # Branch exists locally
  git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
else
  # Create new branch from base
  git worktree add "$WORKTREE_DIR" -b "$BRANCH_NAME" "origin/${BASE_BRANCH}"
fi

# Setup the worktree
echo "Installing dependencies..."
cd "$WORKTREE_DIR"
npm install

echo "Initializing local database..."
npm run db:init

echo ""
echo "========================================="
echo "Worktree ready at: ${WORKTREE_DIR}"
echo "Branch: ${BRANCH_NAME}"
echo ""
echo "To start working:"
echo "  cd ${WORKTREE_DIR}"
echo "  claude"
echo ""
echo "To start dev server (use different port if running multiple):"
echo "  PORT=8788 npm run dev"
echo ""
echo "When done, clean up with:"
echo "  git worktree remove ${WORKTREE_DIR}"
echo "========================================="
