.PHONY: validate test

DEPS = --with python-frontmatter --with jsonschema --with pyyaml

validate:
	uv run $(DEPS) python validate_frontmatter.py $(ARGS)

test:
	uv run $(DEPS) --with pytest pytest test_validate_frontmatter.py -v $(ARGS)
