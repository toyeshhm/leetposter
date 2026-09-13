.PHONY: lint typecheck test test-unit test-e2e check dev build

lint:
	npx eslint . --max-warnings 0

typecheck:
	npx tsc --noEmit

test-unit:
	npx vitest run --coverage

test-e2e:
	npx playwright test

test: test-unit test-e2e

check: lint typecheck test

dev:
	npm run dev

build:
	npm run build
