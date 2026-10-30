.PHONY: all pdf folio styleguide audio excerpt typecheck clean

all: pdf styleguide

DEPS := node_modules/.installed

$(DEPS): package.json bun.lock
	bun install --frozen-lockfile
	@touch $@

pdf: $(DEPS)
	bun run src/render.tsx content.yaml "dist/Gens Togata.pdf"

folio: pdf
	bun run src/impose.ts "dist/Gens Togata.pdf" "dist/Gens Togata - Folio.pdf" --signature=16

styleguide: $(DEPS)
	bun run src/render.tsx styleguide.yaml "dist/Gens Togata - Style Guide.pdf"

excerpt: $(DEPS)
	bun run src/excerpt.tsx

audio: $(DEPS)
	bun run src/render.tsx --audio-only
	@echo "Narration -> audio/part_*.txt and audio/transcript.txt"

typecheck: $(DEPS)
	bun run typecheck

clean:
	rm -rf build dist audio __pycache__ tools/__pycache__
