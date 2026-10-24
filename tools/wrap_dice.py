#!/usr/bin/env python3
"""Tokenize bare dice references in content.yaml as [[token]] for glyph rendering,
protecting existing tokens and genuine English uses. Prints a summary for review."""
import re

P="content.yaml"
t=open(P).read()
orig=t

# 1) protect existing [[...]] tokens and the English phrase "offices, and advantage"
vault=[]
def stash(s):
    vault.append(s); return f"\x00{len(vault)-1}\x00"
t=re.sub(r'\[\[.*?\]\]', lambda m: stash(m.group(0)), t)
t=t.replace("offices, and advantage", stash("offices, and advantage"))

# 2) wrap unambiguous dice words
t=re.sub(r'\bboost\b', '[[boost]]', t)
t=re.sub(r'\bsetback\b', '[[setback]]', t)
t=re.sub(r'\badvantage\b', '[[advantage]]', t)
# success: only the symbol senses, never "on success"/"public success"
t=re.sub(r'\badds? success\b', lambda m: m.group(0).replace('success','[[success]]'), t)
t=re.sub(r'(\d+) successes\b', r'\1 [[success]]', t)
# triumph: only the dice sense
t=t.replace("spend a triumph or", "spend a [[triumph]] or")

# 3) restore protected spans
def unstash(m): return vault[int(m.group(1))]
t=re.sub(r'\x00(\d+)\x00', unstash, t)

open(P,"w").write(t)
# report
import collections
def count(s): return len(re.findall(r'\[\['+s+r'[^]]*\]\]', t))
for w in ["boost","setback","advantage","success","triumph","despair","threat"]:
    print(f"{w}: {count(w)} tokenized now")
print("changed:", orig!=t)
