.PHONY: all render pdf styleguide audio clean

all: pdf styleguide

render:
	uv run --quiet --with ruamel.yaml python render.py

pdf: render
	mkdir -p dist
	weasyprint build/book.html "dist/Gens Togata.pdf"
	@echo "PDF -> dist/Gens Togata.pdf"

styleguide:
	mkdir -p dist build
	uv run --quiet --with ruamel.yaml python render.py styleguide.yaml build/styleguide.html
	weasyprint build/styleguide.html "dist/Gens Togata - Style Guide.pdf"
	@echo "PDF -> dist/Gens Togata - Style Guide.pdf"

audio: render
	@echo "Narration -> audio/part_*.txt and audio/transcript.txt"

clean:
	rm -rf build dist audio __pycache__ tools/__pycache__
