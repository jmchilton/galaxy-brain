.PHONY: validate test pull-screenshots install site-dev site-build site-preview site-deploy dashboard check-dashboard index check-index architecture-views check-architecture-views architecture-update references check-references plugin-build plugin-dev plugin-test herdr-plugin-build herdr-plugin-test herdr-app-mod-build herdr-app-mod-test herdr-app-mod-install chrome-ext-build chrome-native-install site-test diff-review-build diff-review-test

DEPS = --with python-frontmatter --with jsonschema --with pyyaml

validate:
	uv run $(DEPS) python validate_frontmatter.py $(ARGS)
	uv run $(DEPS) python validate_records.py

test:
	uv run $(DEPS) --with pytest pytest test_validate_frontmatter.py test_validate_records.py test_check_references.py test_pull_screenshots.py vault/agents/_shared/scripts/test_launch_agent.py vault/agents/_shared/scripts/test_prune_tasks.py -v $(ARGS)

pull-screenshots:
	uv run pull_screenshots.py $(ARGS)

install:
	mkdir -p ~/.claude/skills
	ln -sfn $(CURDIR)/skill/galaxy-brain ~/.claude/skills/galaxy-brain
	ln -sfn $(CURDIR) ~/.galaxy-brain

dashboard:
	uv run python generate_dashboard.py

check-dashboard:
	uv run python generate_dashboard.py --check

index:
	uv run $(DEPS) python generate_index.py

check-index:
	uv run $(DEPS) python generate_index.py --check

architecture-views:
	uv run generate_architecture_views.py $(ARGS)

check-architecture-views:
	uv run generate_architecture_views.py --check

architecture-update:
	uv run scripts/sync_architecture.py $(ARGS)

references:
	uv run check_references.py $(ARGS)

check-references:
	uv run check_references.py --check $(ARGS)

site-dev:
	cd site && npm run dev

site-build:
	cd site && npm run build

site-preview:
	cd site && npm run preview

site-deploy:
	scripts/deploy_site.sh $(ARGS)

site-test:
	cd site && npm test

plugin-build:
	cd obsidian-plugin && npm run build

plugin-dev:
	cd obsidian-plugin && npm run dev

plugin-test:
	cd obsidian-plugin && npm test

herdr-plugin-build:
	cd herdr-plugin && npm run build

herdr-plugin-test:
	cd herdr-plugin && npm test

herdr-app-mod-build:
	cd herdr-app-mod && npm run build

herdr-app-mod-test:
	cd herdr-app-mod && npm test

herdr-app-mod-install: herdr-app-mod-build herdr-plugin-build
	herdr-app-mod/install.sh

chrome-ext-build: herdr-plugin-build
	cd chrome-extension && npm run build

chrome-native-install:
	chrome-extension/install-native-host.sh

diff-review-build:
	cd differential-review-lib && npm run typecheck
	cd differential-review && npm run build

diff-review-test:
	cd differential-review-lib && npm test
	cd differential-review && npm test
