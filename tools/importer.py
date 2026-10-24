#!/usr/bin/env python3
"""One-time migration: parse the display HTML into a semantic content tree and
emit content.yaml (the new single source of truth). After this runs, the YAML
is authoritative and the HTML authoring path is retired."""
import html, re, sys
from html.parser import HTMLParser
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L

SRC = "/home/user/.hermes/cache/scratch/spqr/spqr.html"
OUT = "/home/user/.hermes/cache/scratch/spqr/content.yaml"

# ---------- tiny DOM ----------
class Node:
    __slots__=("tag","attrs","children","parent")
    def __init__(self,tag,attrs=None,parent=None):
        self.tag=tag; self.attrs=attrs or {}; self.children=[]; self.parent=parent
    @property
    def cls(self): return self.attrs.get("class","").split()

class DOM(HTMLParser):
    VOID={"br","img","hr","meta","link"}
    def __init__(s): super().__init__(convert_charrefs=True); s.root=Node("root"); s.cur=s.root
    def handle_starttag(s,t,a):
        n=Node(t,dict(a),s.cur); s.cur.children.append(n)
        if t not in s.VOID: s.cur=n
    def handle_startendtag(s,t,a):
        s.cur.children.append(Node(t,dict(a),s.cur))
    def handle_endtag(s,t):
        if t in s.VOID: return
        n=s.cur
        while n is not s.root and n.tag!=t: n=n.parent
        if n is not s.root and n.parent is not None: s.cur=n.parent
    def handle_data(s,d):
        if d.strip() or d==" ": s.cur.children.append(d)

# ---------- inline serialization to light markdown ----------
def inline(node):
    out=[]
    for c in node.children:
        if isinstance(c,str):
            out.append(c)
        elif c.tag in ("strong","b"):
            out.append("**"+inline(c).strip()+"**")
        elif c.tag in ("em","i"):
            out.append("*"+inline(c).strip()+"*")
        elif c.tag=="span" and "latin" in c.cls:
            out.append("*"+inline(c).strip()+"*")
        elif c.tag=="span" and "tag" in c.cls:
            out.append("[["+inline(c).strip()+"]]")
        elif c.tag=="span" and "small" in c.cls:
            out.append("("+inline(c).strip()+")" if False else inline(c))
        elif c.tag=="br":
            out.append(" ")
        else:
            out.append(inline(c))
    t="".join(out)
    t=html.unescape(t)
    t=re.sub(r"[ \t]+"," ",t)
    return t.strip()

def celltext(node):
    return inline(node)

# ---------- block parsing ----------
def parse_statblock(div):
    sb={}
    # direct-child spans
    for c in div.children:
        if isinstance(c,str): continue
        if c.tag=="span" and "nm" in c.cls: sb["name"]=inline(c)
        elif c.tag=="span" and "typ" in c.cls: sb["kind"]=inline(c).strip("()")
        elif c.tag=="span" and "small" in c.cls and "desc" not in sb: sb["desc"]=inline(c)
    # chars table
    for c in div.children:
        if isinstance(c,str): continue
        if c.tag=="table" and "chars" in c.cls:
            rows=[[celltext(td) for td in tr.children if getattr(td,"tag",None) in ("td","th")]
                  for tr in c.children if getattr(tr,"tag",None)=="tr"]
            if len(rows)>=2:
                hdr,val=rows[0],rows[1]
                chars={}; derived={}
                SIX={"Br","Ag","Int","Cun","Will","Pr"}
                for h,v in zip(hdr,val):
                    if not v: continue
                    (chars if h in SIX else derived)[h]=v
                if chars: sb["chars"]=chars
                if derived: sb["derived"]=derived
    # deriv / field paragraphs
    fields=[]
    for c in div.children:
        if isinstance(c,str): continue
        if c.tag=="p":
            # split by <strong>Label:</strong>
            segs=[]; cur_label=None; cur_text=[]
            for ch in c.children:
                if getattr(ch,"tag",None) in ("strong","b"):
                    if cur_label is not None or cur_text:
                        segs.append((cur_label,"".join(cur_text).strip()))
                    cur_label=inline(ch).rstrip(":").strip(); cur_text=[]
                else:
                    cur_text.append(ch if isinstance(ch,str) else inline(ch) )
                    if not isinstance(ch,str): cur_text[-1]=inline(ch)
            if cur_label is not None or cur_text:
                segs.append((cur_label,"".join(cur_text).strip()))
            for lbl,txt in segs:
                txt=html.unescape(re.sub(r"[ \t]+"," ",txt)).strip()
                txt=txt.strip(" :|").strip()
                if lbl or txt: fields.append({"label":lbl or "", "text":txt})
    if fields: sb["fields"]=fields
    sb["type"]="statblock"
    return sb

def parse_sidebar(div):
    title=None; body=[]
    for c in div.children:
        if isinstance(c,str): continue
        if c.tag=="h4": title=inline(c)
        elif c.tag=="p": body.append(inline(c))
    return {"type":"sidebar","title":title or "","body":body}

def parse_table(tbl):
    rows=[[celltext(td) for td in tr.children if getattr(td,"tag",None) in ("td","th")]
          for tr in tbl.children if getattr(tr,"tag",None)=="tr"]
    kind="gear"
    if "motiv" in tbl.cls: kind="motiv"
    cols=rows[0] if rows else []
    data=rows[1:] if len(rows)>1 else []
    return {"type":"table","style":kind,"columns":cols,"rows":data}

BLOCK_SKIP_DESCEND=("statblock","sidebar")

def walk(node, chapters):
    for c in node.children:
        if isinstance(c,str): continue
        cl=c.cls
        if c.tag=="div" and "statblock" in cl:
            chapters[-1]["blocks"].append(parse_statblock(c)); continue
        if c.tag=="div" and "sidebar" in cl:
            chapters[-1]["blocks"].append(parse_sidebar(c)); continue
        if c.tag=="div" and "readaloud" in cl:
            chapters[-1]["blocks"].append({"type":"readaloud","text":inline(c)}); continue
        if c.tag=="div" and "synopsis" in cl:
            t=re.sub(r'^\**Synopsis\.?\**\s*','',inline(c)).strip()
            chapters[-1]["blocks"].append({"type":"synopsis","text":t}); continue
        if c.tag=="div" and "ex" in cl:
            chapters[-1]["blocks"].append({"type":"example","text":inline(c)}); continue
        if c.tag=="div" and "proc" in cl:
            title=None; steps=[]
            for ch in c.children:
                if getattr(ch,"tag",None)=="h4": title=inline(ch)
                elif getattr(ch,"tag",None) in ("ol","ul"):
                    steps=[inline(li) for li in ch.children if getattr(li,"tag",None)=="li"]
            chapters[-1]["blocks"].append({"type":"procedure","title":title or "","steps":steps}); continue
        if c.tag=="h2":
            chapters.append({"title":inline(c),"blocks":[]}); continue
        if not chapters and c.tag in ("h3","h4","p","ul","table"):
            continue  # skip front-matter (cover/legal) before first chapter
        if c.tag=="h3":
            t=inline(c)
            if "scenario-h" in cl: chapters[-1]["blocks"].append({"type":"scenario","text":t})
            else: chapters[-1]["blocks"].append({"type":"h3","text":t})
            continue
        if c.tag=="h4":
            chapters[-1]["blocks"].append({"type":"h4","text":inline(c)}); continue
        if c.tag=="p":
            style=next((k for k in ("lead","act","synopsis","readaloud","chk","small","deriv") if k in cl),"body")
            chapters[-1]["blocks"].append({"type":"p","style":style,"text":inline(c)}); continue
        if c.tag=="ul":
            items=[inline(li) for li in c.children if getattr(li,"tag",None)=="li"]
            chapters[-1]["blocks"].append({"type":"list","items":items}); continue
        if c.tag=="table":
            chapters[-1]["blocks"].append(parse_table(c)); continue
        # otherwise descend (cols / fullw / chapter wrappers)
        walk(c, chapters)

def main():
    raw=open(SRC).read()
    dom=DOM(); dom.feed(raw)
    # locate body content: everything from first div.chapter
    chapters=[]
    # find the container holding chapters: walk whole root, chapters created on h2
    # but front matter (cover/legal) precede; skip until first chapter div encountered.
    # We walk starting at the node that contains the first <div class="chapter">.
    walk(dom.root, chapters)
    # drop any leading pseudo-chapter with no title
    chapters=[ch for ch in chapters if ch["title"]]
    meta={
        "title":"SPQR",
        "subtitle":"Senatus Populusque Romanus",
        "tagline":"Bread and circuses, the sword and the Senate.",
        "system":"An Imperial Rome setting for the Genesys Roleplaying Game",
        "legal":[
          "This product was created under license. Genesys and its logo, and Genesys Foundry and its logo, are trademarks of Fantasy Flight Games.",
          "Published under the Community Content Agreement for Genesys Foundry. Historical material grounded against C.J. Carella's GURPS Imperial Rome, Mary Beard's SPQR, and Walter Scheidel's Rome and China. An unofficial fan supplement.",
        ],
    }
    doc={"meta":meta,"chapters":chapters}
    def literal(d):
        if isinstance(d,dict):
            return {k:literal(v) for k,v in d.items()}
        if isinstance(d,list):
            return [literal(x) for x in d]
        if isinstance(d,str) and (len(d)>90 or "\n" in d):
            return L(d)
        return d
    doc=literal(doc)
    y=YAML(); y.default_flow_style=False; y.width=100000; y.allow_unicode=True
    with open(OUT,"w") as f: y.dump(doc,f)
    nb=sum(len(ch["blocks"]) for ch in chapters)
    print(f"chapters={len(chapters)} blocks={nb}")
    for ch in chapters:
        kinds={}
        for b in ch["blocks"]:
            kinds[b["type"]]=kinds.get(b["type"],0)+1
        print(f"  {ch['title'][:38]:40} {dict(kinds)}")

if __name__=="__main__": main()
