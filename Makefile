.PHONY: test lint serve clean

test:
	node tests/indicators.test.js

lint:
	@echo "No linter configured yet — add ESLint when ready"

serve:
	python3 -m http.server 8080

clean:
	@echo "Nothing to clean (single-file project)"
