.PHONY: all pdf styleguide audio excerpt typecheck clean

all: pdf styleguide

pdf:
	bun run src/render.tsx content.yaml "dist/Gens Togata.pdf"

styleguide:
	bun run src/render.tsx styleguide.yaml "dist/Gens Togata - Style Guide.pdf"

excerpt:
	bun run src/excerpt.tsx

audio:
	bun run src/render.tsx --audio-only
	@echo "Narration -> audio/part_*.txt and audio/transcript.txt"

typecheck:
	bun run typecheck

clean:
	rm -rf build dist audio __pycache__ tools/__pycache__
