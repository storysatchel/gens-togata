.PHONY: all pdf folio styleguide audio excerpt typecheck test clean upstream

all: pdf styleguide

DEPS := node_modules/.installed

upstream:
	sh tools/build-vmprint.sh

$(DEPS): package.json bun.lock upstream
	bun install --frozen-lockfile
	@touch $@

pdf: $(DEPS)
	bun run src/render.ts content.yaml "dist/Gens Togata.pdf"

folio: pdf
	uvx pdfimpose==2.10.0 hardcover --signature 2x1 --group 4 --output "dist/Gens Togata - Folio.pdf" "dist/Gens Togata.pdf"

styleguide: $(DEPS)
	bun run src/render.ts styleguide.yaml "dist/Gens Togata - Style Guide.pdf"

excerpt: $(DEPS)
	bun run src/excerpt.ts

audio: $(DEPS)
	bun run src/render.ts --audio-only
	@echo "Narration -> audio/part_*.txt and audio/transcript.txt"

typecheck: $(DEPS)
	bun run typecheck

test: $(DEPS)
	bun run test

clean:
	rm -rf build dist audio __pycache__ tools/__pycache__
