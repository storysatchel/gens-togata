#!/usr/bin/env python3
"""Render content.yaml -> HTML (for PDF) and -> narration text (for TTS).
Single source of truth: content.yaml. Presentation: styles.css. This module is
the only thing that knows about display; the content file knows nothing of markup."""
import re, html as _h, os, sys
from ruamel.yaml import YAML

BASE=os.path.dirname(os.path.abspath(__file__))
yaml=YAML(typ="safe")
DOC=yaml.load(open(f"{BASE}/content.yaml"))
CSS=open(f"{BASE}/styles.css").read()

# ---------- inline markup ----------
# Genesys glyph font mappings (themensch/FFG-Genesys-Glyphs-and-Dice).
_GLY_SYM={"advantage":"a","success":"s","triumph":"t","threat":"h","failure":"f","despair":"d"}
_GLY_DIE={"boost":("j","boost"),"setback":("j","setback"),"difficulty":("k","difficulty"),
          "ability":("k","ability"),"proficiency":("l","proficiency"),"challenge":("l","challenge")}
_DICE=set(_GLY_SYM)|set(_GLY_DIE)
def _glyph(word):
    w=word.lower()
    if w in _GLY_SYM: return f'<span class="gly" aria-label="{w}">{_GLY_SYM[w]}</span>'
    ch,color=_GLY_DIE[w]; return f'<span class="gly {color}" aria-label="{w}">{ch}</span>'
def _token(m):
    token=m.group(1); words=token.split()
    if words and all(w.lower() in _DICE for w in words):
        return "".join(_glyph(w) for w in words)
    return f'<span class="tag">{token}</span>'
def _esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def md_html(s):
    s=_esc(s)
    s=re.sub(r'\[\[(.+?)\]\]', _token, s)
    s=s.replace("\u25cf", '<span class="gly difficulty" aria-label="difficulty">k</span>')
    s=re.sub(r'\{\{(\d+)\}\}', r'<sup class="en">\1</sup>', s)
    s=re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s=re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
    return s
def md_plain(s):
    s=re.sub(r'\[\[(.+?)\]\]', r'\1', s)
    s=re.sub(r'\{\{\d+\}\}', '', s)
    return s.replace("**","").replace("*","")

# ---------- speech normalization ----------
HMAP={'Br':'Brawn','Ag':'Agility','Int':'Intellect','Cun':'Cunning','Will':'Willpower','Pr':'Presence'}
def speechclean(t):
    for a,b in [('W.T.','Wound Threshold'),('S.T.','Strain Threshold'),
      ('(M/R)','melee and ranged'),('M/R','melee and ranged'),('HS','sesterces'),
      ('●',' difficulty '),('vitis ','vitis'),(' HP:',' Hard Points:'),
      ('Price/Rarity','price and rarity'),('Encumbrance Cap','cargo capacity'),
      (' HT ',' Hull Trauma '),(' SS ',' System Strain '),
      ('(R, military)','rare, military only'),('(R)','rare'),(' | ','. '),('|','. ')]:
        t=t.replace(a,b)
    t=t.replace('&','and')
    for pat,rep in [(r'\bXP\b','experience points'),(r'\bGMs\b','Game Masters'),
      (r'\bGM\b','Game Master'),(r'\bPCs\b','player characters'),(r'\bPC\b','player character'),
      (r'\bEnc\b','Encumbrance'),(r'\bDam\b','Damage'),(r'\bCrit\b','Critical'),
      (r'\bSil\b','Silhouette'),(r'\bd10\b','d-ten'),(r'\bc\.\s','circa ')]:
        t=re.sub(pat,rep,t)
    t=re.sub(r'price and rarity: ([\d,]+) [/ ]*(\w+)', r'price \1 sesterces, rarity \2', t)
    t=re.sub(r'\s+',' ',t).strip()
    return t

# ================= HTML RENDER =================
def sb_html(b):
    o=['<div class="statblock">']
    nm=b.get("name",""); kind=b.get("kind","")
    o.append(f'<span class="nm">{md_html(nm)}</span>'+(f' <span class="typ">({md_html(kind)})</span>' if kind else '')+'<br>')
    if b.get("desc"): o.append(f'<span class="small">{md_html(b["desc"])}</span>')
    chars=b.get("chars"); deriv=b.get("derived")
    if chars:
        hs=list(chars)+(list(deriv) if deriv else [])
        vs=[chars[k] for k in chars]+([deriv[k] for k in deriv] if deriv else [])
        o.append('<table class="chars"><tr>'+''.join(f'<th>{h}</th>' for h in hs)+'</tr>'
                 +'<tr>'+''.join(f'<td>{v}</td>' for v in vs)+'</tr></table>')
    for f in b.get("fields",[]):
        lbl=f.get("label",""); txt=md_html(f.get("text",""))
        o.append(f'<p class="deriv">'+(f'<strong>{md_html(lbl)}:</strong> ' if lbl else '')+txt+'</p>')
    o.append('</div>')
    return "".join(o)

def block_html(b, cols):
    """returns (html, want_fullwidth)."""
    t=b["type"]
    if t=="h3": return f'<h3>{md_html(b["text"])}</h3>', False
    if t=="h4": return f'<h4>{md_html(b["text"])}</h4>', False
    if t=="scenario": return f'<h3 class="scenario-h">{md_html(b["text"])}</h3>', False
    if t=="p":
        st=b.get("style","body")
        c={"body":"","lead":' class="lead"',"small":' class="small"',"deriv":' class="deriv"',
           "act":' class="act"',"chk":' class="chk"'}.get(st,"")
        return f'<p{c}>{md_html(b["text"])}</p>', False
    if t=="readaloud": return f'<div class="readaloud">{md_html(b["text"])}</div>', False
    if t=="synopsis": return f'<div class="synopsis"><strong>Synopsis.</strong> {md_html(b["text"])}</div>', False
    if t=="example": return f'<div class="ex">{md_html(b["text"])}</div>', False
    if t=="sidebar":
        inner=f'<h4>{md_html(b["title"])}</h4>'+''.join(f'<p>{md_html(p)}</p>' for p in b.get("body",[]))
        return f'<div class="sidebar">{inner}</div>', False
    if t=="procedure":
        steps=''.join(f'<li>{md_html(s)}</li>' for s in b.get("steps",[]))
        return f'<div class="proc"><h4>{md_html(b["title"])}</h4><ol>{steps}</ol></div>', False
    if t=="list":
        return '<ul>'+''.join(f'<li>{md_html(i)}</li>' for i in b["items"])+'</ul>', False
    if t=="table":
        cls="gear motiv" if b.get("style")=="motiv" else "gear"
        head='<tr>'+''.join(f'<th>{md_html(c)}</th>' for c in b["columns"])+'</tr>'
        body=''.join('<tr>'+''.join(f'<td>{md_html(c)}</td>' for c in r)+'</tr>' for r in b["rows"])
        return f'<table class="{cls}">{head}{body}</table>', True
    if t=="statblock": return sb_html(b), False
    if t=="endnotes":
        lis=''.join(f'<li>{md_html(i)}</li>' for i in b["items"])
        return f'<div class="endnotes"><h4>{md_html(b.get("title","Notes"))}</h4><ol>{lis}</ol></div>', True
    return "", False

def to_html(out_path=None):
    m=DOC["meta"]
    out=[f'''<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>{m["title"]}</title>
<style>{CSS}</style></head><body>
<div class="cover"><div class="eagle">&#9812;</div>
<h1 class="spqr" style="font-family:'DejaVu Serif';">{m["title"]}</h1>
<div class="sub">{m["subtitle"]}</div>
<div class="tag2">&ldquo;{m["tagline"]}&rdquo;</div>
<div class="sys">{m["system"].upper()}</div></div>
<div style="padding:1.6cm 1.5cm;">'''+''.join(f'<p class="legal">{md_html(p)}</p>' for p in m["legal"])+'</div>']
    # ---- table of contents (target-counter fills in the real page numbers) ----
    toc=['<div class="toc"><h1 class="ch">Contents</h1>']
    for ci,ch in enumerate(DOC["chapters"]):
        toc.append(f'<p class="toc-l1"><a href="#c{ci}">{md_html(str(ch["title"]))}</a></p>')
        si=0
        for b in ch["blocks"]:
            if b.get("type") in ("h2","h3","scenario"):
                toc.append(f'<p class="toc-l2"><a href="#c{ci}s{si}">{md_html(b["text"])}</a></p>'); si+=1
    toc.append('</div>')
    out.append(''.join(toc))
    for ci,ch in enumerate(DOC["chapters"]):
        out.append(f'<div class="chapter"><h1 class="ch" id="c{ci}">{md_html(ch["title"])}</h1>')
        in_cols=False; si=0; after_head=True
        def openc():
            nonlocal in_cols
            if not in_cols: out.append('<div class="cols">'); in_cols=True
        def closec():
            nonlocal in_cols
            if in_cols: out.append('</div>'); in_cols=False
        for b in ch["blocks"]:
            bt=b.get("type")
            if bt=="h2":
                frag=f'<h2 id="c{ci}s{si}">{md_html(b["text"])}</h2>'; full=True; si+=1; after_head=True
            elif bt=="h3":
                frag=f'<h3 id="c{ci}s{si}">{md_html(b["text"])}</h3>'; full=False; si+=1; after_head=False
            elif bt=="scenario":
                frag=f'<h3 class="scenario-h" id="c{ci}s{si}">{md_html(b["text"])}</h3>'; full=False; si+=1; after_head=False
            elif bt=="p" and after_head:
                frag=block_html(b,in_cols)[0]; full=True          # bare paragraph right after H1/H2 spans full width
            else:
                frag,full=block_html(b,in_cols); after_head=False
            if full:
                closec(); out.append(f'<div class="fullw">{frag}</div>')
            else:
                openc(); out.append(frag)
        closec(); out.append('</div>')
    out.append('</body></html>')
    open(out_path or f"{BASE}/build/book.html","w").write("".join(out))

# ================= SPEECH RENDER =================
def sb_speech(b):
    parts=[]
    nm=md_plain(b.get("name","")).strip()
    kind=md_plain(b.get("kind","")).strip()
    parts.append(nm+("." if nm and not nm.endswith('.') else ""))
    if kind: parts.append(f"({kind}).")
    chars=b.get("chars"); deriv=b.get("derived")
    if chars:
        pr=[f"{HMAP.get(k,k)} {v}" for k,v in chars.items()]
        if deriv: pr+=[f"{k} {v}" for k,v in deriv.items()]
        parts.append("Characteristics: "+", ".join(pr)+".")
    if b.get("desc"): parts.append(md_plain(b["desc"]))
    for f in b.get("fields",[]):
        lbl=md_plain(f.get("label","")).strip(); txt=md_plain(f.get("text","")).strip()
        parts.append((f"{lbl}: " if lbl else "")+txt)
    return " ".join(parts)

def block_speech(b):
    t=b["type"]
    if t in ("h2","h3","h4","scenario"):
        pre="Scenario. " if t=="scenario" else ""
        return pre+md_plain(b["text"]).rstrip('.')+"."
    if t=="p": return md_plain(b["text"])
    if t=="readaloud": return "Read aloud. "+md_plain(b["text"])
    if t=="synopsis": return "Synopsis. "+md_plain(b["text"])
    if t=="example": return md_plain(b["text"])
    if t=="sidebar": return md_plain(b["title"])+". "+" ".join(md_plain(p) for p in b.get("body",[]))
    if t=="procedure": return md_plain(b["title"])+". "+" ".join(f"{i+1}. {md_plain(s)}" for i,s in enumerate(b.get("steps",[])))
    if t=="list": return " ".join(md_plain(i)+("" if i.strip().endswith(('.','!','?',':')) else ".") for i in b["items"])
    if t=="table":
        cols=[md_plain(c) for c in b["columns"]]
        rows=[]
        for r in b["rows"]:
            rows.append("; ".join(f"{cols[i]}: {md_plain(v)}" for i,v in enumerate(r) if i<len(cols) and v and cols[i])+".")
        return " ".join(rows)
    if t=="statblock": return sb_speech(b)
    return ""

def chapter_speech(ch):
    body=[ch["title"].rstrip('.')+"."]
    for b in ch["blocks"]:
        s=block_speech(b).strip()
        if s: body.append(s)
    return speechclean(" ".join(body))

def to_speech():
    chs=DOC["chapters"]
    m=DOC["meta"]
    intro=(f'{m["title"]}. {m["subtitle"]}. {m["system"]}. \u201c{m["tagline"]}\u201d '
      "This is an audiobook edition; tables and stat blocks are read as spoken lists, so keep "
      "the PDF nearby for reference during play. We begin.")
    cs=[chapter_speech(c) for c in chs]  # index 0..11
    groups={1:[0,1],2:[2],3:[3,4],4:[5],5:[6],6:[7],7:[8],8:[9],9:[10,11,12]}
    os.makedirs(f"{BASE}/audio",exist_ok=True)
    for part,idxs in groups.items():
        txt=" ".join(cs[i] for i in idxs)
        if part==1: txt=intro+"\n\n"+txt
        open(f"{BASE}/audio/part_{part}.txt","w").write(txt)
    # also full transcript
    open(f"{BASE}/audio/transcript.txt","w").write(intro+"\n\n"+"\n\n".join(cs))

if __name__=="__main__":
    os.makedirs(f"{BASE}/build",exist_ok=True)
    content = sys.argv[1] if len(sys.argv)>1 else None
    out = sys.argv[2] if len(sys.argv)>2 else f"{BASE}/build/book.html"
    if content:                     # alternate doc (e.g. styleguide.yaml); no narration
        DOC = yaml.load(open(content))
    to_html(out)
    print("rendered", out, os.path.getsize(out), "bytes")
    if not content:
        to_speech()
        import glob
        for p in sorted(glob.glob(f"{BASE}/audio/part_*.txt")):
            print(os.path.basename(p), len(open(p).read().split()), "words")
