.PHONY: validate test install site-dev site-build site-preview dashboard check-dashboard

DEPS = --with python-frontmatter --with jsonschema --with pyyaml

validate:
	uv run $(DEPS) python validate_frontmatter.py $(ARGS)

test:
	uv run $(DEPS) --with pytest pytest test_validate_frontmatter.py -v $(ARGS)

install:
	mkdir -p ~/.claude/skills
	ln -sfn $(CURDIR)/skill/galaxy-brain ~/.claude/skills/galaxy-brain
	ln -sfn $(CURDIR) ~/.galaxy-brain

dashboard:
	uv run python generate_dashboard.py

check-dashboard:
	uv run python generate_dashboard.py --check

site-dev:
	cd site && npm run dev

site-build:
	cd site && npm run build

site-preview:
	cd site && npm run preview
