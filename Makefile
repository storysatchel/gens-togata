.PHONY: all render pdf audio clean

all: pdf

render:
	uv run --quiet --with ruamel.yaml python render.py

pdf: render
	mkdir -p dist
	weasyprint build/book.html "dist/The Eternal City.pdf"
	@echo "PDF -> dist/The Eternal City.pdf"

audio: render
	@echo "Narration -> audio/part_*.txt and audio/transcript.txt"

clean:
	rm -rf build dist audio __pycache__ tools/__pycache__
