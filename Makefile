SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c

.DEFAULT_GOAL := help

PNPM ?= pnpm
COMPOSE ?= docker compose
SUPABASE ?= supabase

API_FILTER := @gengis-khan/api
WEB_FILTER := @gengis-khan/web

REPORT_DIR := assets/report
REPORT_MAIN := main.tex
REPORT_PDF := main.pdf
LATEX_ENGINE ?= auto
LATEXMK ?= latexmk

MIGRATION_NAME ?= dev

.PHONY: help setup ensure-env install clean \
	dev dev-api dev-web build lint typecheck test format \
	docker-up docker-down docker-logs \
	supabase-start supabase-stop supabase-status \
	db-generate db-migrate db-reset db-seed db-studio \
	latex latex-build latex-clean latex-open

help: ## Mostra esta ajuda
	@awk 'BEGIN {FS = ":.*##"; printf "\nUso:\n  make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ensure-env install ## Setup inicial (env + dependencias)

ensure-env: ## Cria .env a partir de .env.example se nao existir
	@if [ ! -f .env ] && [ -f .env.example ]; then \
		cp .env.example .env; \
		echo "Criado .env a partir de .env.example"; \
	else \
		echo ".env ja existe (ou .env.example nao encontrado)"; \
	fi

install: ## Instala dependencias do monorepo
	@command -v $(PNPM) >/dev/null || { echo "Erro: pnpm nao encontrado no PATH"; exit 1; }
	$(PNPM) install

clean: ## Limpa artefactos de build do monorepo
	$(PNPM) -r exec rm -rf dist

dev: ## Corre API + Web em modo desenvolvimento (turbo)
	$(PNPM) dev

dev-api: ## Corre apenas a API em modo desenvolvimento
	$(PNPM) --filter $(API_FILTER) dev

dev-web: ## Corre apenas o Web em modo desenvolvimento
	$(PNPM) --filter $(WEB_FILTER) dev

build: ## Build de todo o monorepo
	$(PNPM) build

lint: ## Lint de todo o monorepo
	$(PNPM) lint

typecheck: ## Typecheck de todo o monorepo
	$(PNPM) typecheck

test: ## Testes de todo o monorepo
	$(PNPM) test

format: ## Formata todo o repositorio
	$(PNPM) format

docker-up: ## Arranca API, Web e Mailpit via Docker Compose
	$(COMPOSE) up --build

docker-down: ## Para os servicos Docker Compose
	$(COMPOSE) down

docker-logs: ## Mostra logs dos servicos Docker Compose
	$(COMPOSE) logs -f

supabase-start: ## Arranca stack local do Supabase
	@command -v $(SUPABASE) >/dev/null || { echo "Erro: supabase CLI nao encontrado no PATH"; exit 1; }
	$(SUPABASE) start

supabase-stop: ## Para stack local do Supabase
	@command -v $(SUPABASE) >/dev/null || { echo "Erro: supabase CLI nao encontrado no PATH"; exit 1; }
	$(SUPABASE) stop

supabase-status: ## Mostra estado do Supabase local
	@command -v $(SUPABASE) >/dev/null || { echo "Erro: supabase CLI nao encontrado no PATH"; exit 1; }
	$(SUPABASE) status

db-generate: ## Gera Prisma Client
	$(PNPM) --filter $(API_FILTER) exec prisma generate

db-migrate: ## Corre migracoes Prisma (usar MIGRATION_NAME=nome)
	$(PNPM) --filter $(API_FILTER) exec prisma migrate dev --name $(MIGRATION_NAME)

db-reset: ## Reset da base de dados local com seed
	$(PNPM) --filter $(API_FILTER) exec prisma migrate reset --force

db-seed: ## Corre seed da base de dados
	$(PNPM) --filter $(API_FILTER) exec tsx prisma/seed.ts

db-studio: ## Abre Prisma Studio
	$(PNPM) --filter $(API_FILTER) exec prisma studio

latex: latex-build ## Compila o relatorio LaTeX

latex-build: ## Compila main.tex (auto: xelatex -> lualatex)
	@ENGINE=""; \
	if [ "$(LATEX_ENGINE)" = "auto" ]; then \
		if command -v xelatex >/dev/null; then \
			ENGINE="xelatex"; \
		elif command -v lualatex >/dev/null; then \
			ENGINE="lualatex"; \
		fi; \
	else \
		ENGINE="$(LATEX_ENGINE)"; \
	fi; \
	if [ -z "$$ENGINE" ]; then \
		echo "Erro: nenhum compilador LaTeX compativel foi encontrado (xelatex/lualatex)."; \
		echo "Ubuntu: sudo apt update && sudo apt install -y texlive-xetex texlive-latex-extra latexmk"; \
		exit 1; \
	fi; \
	if ! command -v "$$ENGINE" >/dev/null; then \
		echo "Erro: $$ENGINE nao encontrado no PATH"; \
		exit 1; \
	fi; \
	if command -v $(LATEXMK) >/dev/null; then \
		if [ "$$ENGINE" = "xelatex" ]; then \
			cd $(REPORT_DIR) && $(LATEXMK) -xelatex -interaction=nonstopmode -halt-on-error $(REPORT_MAIN); \
		else \
			cd $(REPORT_DIR) && $(LATEXMK) -lualatex -interaction=nonstopmode -halt-on-error $(REPORT_MAIN); \
		fi; \
	else \
		echo "Aviso: latexmk nao encontrado, a usar $$ENGINE manualmente"; \
		cd $(REPORT_DIR) && "$$ENGINE" -interaction=nonstopmode -halt-on-error $(REPORT_MAIN); \
		cd $(REPORT_DIR) && "$$ENGINE" -interaction=nonstopmode -halt-on-error $(REPORT_MAIN); \
	fi

latex-clean: ## Limpa ficheiros temporarios do LaTeX
	@if command -v $(LATEXMK) >/dev/null; then \
		cd $(REPORT_DIR) && $(LATEXMK) -C; \
	else \
		cd $(REPORT_DIR) && rm -f *.aux *.bbl *.bcf *.blg *.fdb_latexmk *.fls *.ilg *.ind *.lof *.log *.lot *.nlo *.nls *.out *.toc *.xml; \
	fi

latex-open: ## Abre PDF do relatorio (Linux)
	@command -v xdg-open >/dev/null || { echo "Erro: xdg-open nao encontrado no PATH"; exit 1; }
	xdg-open $(REPORT_DIR)/$(REPORT_PDF)
