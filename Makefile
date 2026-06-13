.PHONY: help setup install dev build start lint \
        backend-install backend-dev backend-build backend-start backend-lint \
        frontend-install frontend-dev frontend-build frontend-preview frontend-lint \
        db-up db-down db-restart db-logs db-reset \
        generate migrate migrate-deploy seed \
        test test-watch test-db-setup

BACKEND := backend
FRONTEND := frontend

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- One-shot bootstrap -------------------------------------------------

setup: install db-up migrate seed ## Install all deps, start Postgres, migrate, and seed (first-time setup)

## --- Combined backend + frontend shortcuts ----------------------------------

install: backend-install frontend-install ## Install backend and frontend dependencies

dev: ## Run backend and frontend dev servers concurrently
	$(MAKE) -j2 backend-dev frontend-dev

build: backend-build frontend-build ## Build backend and frontend for production

lint: backend-lint frontend-lint ## Type-check backend and frontend

start: backend-start ## Run the built backend

## --- Backend ---------------------------------------------------------------

backend-install: ## Install backend dependencies
	cd $(BACKEND) && pnpm install

backend-dev: ## Run the backend in dev mode (watch, http://localhost:5000)
	cd $(BACKEND) && pnpm dev

backend-build: ## Build the backend for production
	cd $(BACKEND) && pnpm build

backend-start: ## Run the built backend
	cd $(BACKEND) && pnpm start

backend-lint: ## Type-check the backend
	cd $(BACKEND) && pnpm lint

test: test-db-setup ## Run the backend API test suite (against scheduling_platform_test)
	cd $(BACKEND) && pnpm test

test-watch: test-db-setup ## Run the backend API test suite in watch mode
	cd $(BACKEND) && pnpm test:watch

## --- Frontend (Vite + React) -------------------------------------------------

frontend-install: ## Install frontend dependencies
	cd $(FRONTEND) && pnpm install

frontend-dev: ## Run the frontend dev server (http://localhost:3000)
	cd $(FRONTEND) && pnpm dev

frontend-build: ## Build the frontend for production
	cd $(FRONTEND) && pnpm build

frontend-preview: ## Preview the production frontend build
	cd $(FRONTEND) && pnpm preview

frontend-lint: ## Type-check the frontend
	cd $(FRONTEND) && pnpm lint

## --- Database (Postgres via docker-compose) --------------------------------

db-up: ## Start the Postgres container
	docker compose up -d

db-down: ## Stop the Postgres container
	docker compose down

db-restart: ## Restart the Postgres container
	docker compose restart

db-logs: ## Tail Postgres logs
	docker compose logs -f postgres

db-reset: ## Drop the Postgres volume and re-run migrate + seed from scratch
	docker compose down -v
	docker compose up -d
	$(MAKE) migrate
	$(MAKE) seed

## --- Prisma ------------------------------------------------------------------

generate: ## Regenerate the Prisma client
	cd $(BACKEND) && pnpm generate

migrate: ## Run Prisma migrations (dev)
	cd $(BACKEND) && pnpm migrate

migrate-deploy: ## Apply Prisma migrations (production)
	cd $(BACKEND) && pnpm migrate:deploy

seed: ## Seed the database
	cd $(BACKEND) && pnpm seed

## --- Test database -----------------------------------------------------------

test-db-setup: db-up ## Create scheduling_platform_test (if missing) and apply migrations
	@docker compose exec -T postgres sh -c '\
		psql -U "$$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '"'"'scheduling_platform_test'"'"'" | grep -q 1 \
		|| psql -U "$$POSTGRES_USER" -d postgres -c "CREATE DATABASE scheduling_platform_test"'
	cd $(BACKEND) && set -a && . ./.env.test && set +a && pnpm prisma migrate deploy
