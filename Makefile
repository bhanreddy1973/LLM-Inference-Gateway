.PHONY: proto proto-gateway proto-worker venv dev down build test lint fmt migrate seed help

PYTHON := python3

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ─── Development ─────────────────────────────────────────────────────────────

dev: ## Start all services (podman-compose up)
	podman-compose up --build

down: ## Stop all services
	podman-compose down

build: ## Build all containers without starting
	podman-compose build

restart: ## Restart all services
	podman-compose down && podman-compose up --build -d

logs: ## Tail logs from all services
	podman-compose logs -f

# ─── Frontend ────────────────────────────────────────────────────────────────

fe-dev: ## Run frontend dev server locally (port 3000)
	cd frontend && pnpm dev

fe-build: ## Build frontend for production
	cd frontend && pnpm build

fe-lint: ## Lint frontend
	cd frontend && pnpm lint

fe-typecheck: ## Type-check frontend
	cd frontend && pnpm typecheck

# ─── Backend ─────────────────────────────────────────────────────────────────

venv: ## Create Python virtual environment
	$(PYTHON) -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install grpcio-tools==1.66.0
	.venv/bin/pip install -r gateway/requirements.txt -r gateway/requirements-dev.txt
	.venv/bin/pip install -r worker/requirements.txt -r worker/requirements-dev.txt

test: ## Run all Python tests
	cd gateway && $(PYTHON) -m pytest tests/ -v --tb=short
	cd worker && $(PYTHON) -m pytest tests/ -v --tb=short

test-gateway: ## Run gateway tests only
	cd gateway && $(PYTHON) -m pytest tests/ -v --tb=short

test-worker: ## Run worker tests only
	cd worker && $(PYTHON) -m pytest tests/ -v --tb=short

lint: ## Lint Python code with ruff
	cd gateway && ruff check .
	cd worker && ruff check .

fmt: ## Format Python code with ruff
	cd gateway && ruff format .
	cd worker && ruff format .

# ─── Proto ───────────────────────────────────────────────────────────────────

proto: proto-gateway proto-worker ## Generate gRPC stubs from proto definition

proto-gateway:
	.venv/bin/python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=gateway/ \
		--grpc_python_out=gateway/ \
		proto/inference.proto

proto-worker:
	.venv/bin/python -m grpc_tools.protoc \
		-I proto/ \
		--python_out=worker/ \
		--grpc_python_out=worker/ \
		proto/inference.proto

# ─── Database ────────────────────────────────────────────────────────────────

migrate: ## Run database migrations
	cd gateway && alembic upgrade head

seed: ## Seed test data (3 users: free/pro/enterprise)
	$(PYTHON) scripts/seed_data.py
