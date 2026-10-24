#!/usr/bin/env python3
"""Convert the run-on 'Gear & Tools' and 'Social Gear & Traits' paragraphs into
proper YAML list blocks (one item per entry, split on the ' - **' boundaries)."""
P="content.yaml"
lines=open(P).read().split("\n")

def convert(start_token):
    idx=None
    for i,l in enumerate(lines):
        if l.lstrip().startswith(start_token):
            idx=i; break
    if idx is None:
        raise SystemExit("not found: "+start_token)
    content=lines[idx].strip()
    # preceding block header: idx-3 '- type: p', idx-2 'style: body', idx-1 'text: |-'
    assert lines[idx-3].strip()=="- type: p", lines[idx-3]
    parts=content.split(" \u2014 **")
    items=[parts[0].strip()]+["**"+p.strip() for p in parts[1:]]
    block=["  - type: list","    items:"]
    for it in items:
        block+=["    - |-","      "+it]
    lines[idx-3:idx+1]=block
    print(f"{start_token!r}: {len(items)} items")

convert("**Surgeon's Kit")
convert("**Toga Candida")
open(P,"w").write("\n".join(lines))
