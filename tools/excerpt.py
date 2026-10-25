#!/usr/bin/env python3
"""Render a standalone PDF excerpt of a single chapter, reusing render.py's renderer
so styling matches the book exactly. Usage: python tools/excerpt.py "Chapter 1: Character Creation" "Character Creation"
"""
import sys, os, copy
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import render  # loads DOC, CSS, BASE at import (does not run __main__)

match   = sys.argv[1] if len(sys.argv) > 1 else "Chapter 1: Character Creation"
label   = sys.argv[2] if len(sys.argv) > 2 else "Character Creation"

doc = render.DOC
chapters = [c for c in doc["chapters"] if str(c["title"]).startswith(match)]
if not chapters:
    sys.exit(f"no chapter starting with {match!r}")

meta = copy.deepcopy(doc["meta"])
meta["subtitle"] = f"{label} \u00b7 Preview"
render.DOC = {"meta": meta, "chapters": chapters}

os.makedirs(f"{render.BASE}/build", exist_ok=True)
render.to_html()
print("wrote build/book.html for excerpt:", chapters[0]["title"])
