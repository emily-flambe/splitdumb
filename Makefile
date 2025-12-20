.PHONY: dev build test test-e2e db-init db-init-remote deploy

# Start local development (builds frontend + runs worker)
dev: build db-init
	npx wrangler dev

# Build frontend
build:
	npm run build:frontend

# Run unit tests
test:
	npm test

# Run e2e tests
test-e2e:
	npm run test:e2e

# Run all tests
test-all: test test-e2e

# Initialize local D1 database
db-init:
	npx wrangler d1 execute splitdumb-db --local --file=./src/db/schema.sql

# Initialize production D1 database
db-init-remote:
	npx wrangler d1 execute splitdumb-db --remote --file=./src/db/schema.sql

# Deploy to Cloudflare
deploy: build
	npx wrangler deploy
