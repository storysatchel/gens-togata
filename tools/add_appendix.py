#!/usr/bin/env python3
"""Add an 'Appendix: Sources & Resources' chapter to The Eternal City: a bibliography
of every text behind the setting (pulled from the ~/Documents/rome wiki's reference
pages) plus a curated list of digital tools/resources (itiner-e.org and friends)."""
import os, re, glob
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM, CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=(L(v) if isinstance(v,str) and len(v)>90 else v)
    return m

# ---- pull citations from the wiki reference pages ----
refdir=os.path.expanduser("~/Documents/rome/references")
PRIMARY_FILES={"virgil-the-aeneid","lucretius-on-the-nature-of-things","seneca-stoic-philosophy",
               "cicero-de-amicitia-scipios-dream","cato-varro-roman-farm-management"}
primary=[]; modern=[]
for fp in sorted(glob.glob(refdir+"/*.md")):
    head=open(fp).read().split("---",2)[1]
    m=re.search(r'sources:\s*\[(.*?)\]', head, re.S)
    if not m: continue
    q=re.findall(r'"([^"]+)"', m.group(1))
    if not q: continue
    src=q[0].strip()
    stem=os.path.basename(fp)[:-3]
    if " \u2014 " in src: author,title=src.split(" \u2014 ",1)
    elif " - " in src: author,title=src.split(" - ",1)
    else: author,title=src,""
    author=author.strip(); title=title.strip()
    if author=="Meghan J. DiLuzio": author="DiLuzio, Meghan J."  # normalize to surname-first
    (primary if stem in PRIMARY_FILES else modern).append((author,title))

def sortkey(a):
    a=a[0]
    s=a.split(",")[0] if "," in a else a.split()[-1]
    return s.lower()
modern.sort(key=sortkey)

def entry(author,title):
    return L(f"**{author}** — *{title}*." if title else f"**{author}**.")

# ---- digital tools / resources ----
TOOLS=[
 ("Itiner-e","itiner-e.org","A digital gazetteer of the roads of the Roman Empire — map a journey, province to province, along the roads your characters would actually walk."),
 ("ORBIS","orbis.stanford.edu","Stanford's geospatial network model of the Roman world: the time and cost of travel between cities by road, river, and sea, season by season."),
 ("Pleiades","pleiades.stoa.org","The community gazetteer of ancient places — the canonical reference for where a town, road, or river actually was."),
 ("Digital Atlas of the Roman Empire (DARE)","dh.gu.se/dare","A zoomable map of the empire's cities, roads, and provinces, layered over modern geography."),
 ("ToposText","topostext.org","Ancient texts geo-linked to every place they mention — read the sources and see the map at once."),
 ("LacusCurtius","penelope.uchicago.edu/Thayer/E/Roman","A deep online library of Roman texts and topography, including Platner & Ashby's *Topographical Dictionary of Ancient Rome*."),
 ("Perseus Digital Library","perseus.tufts.edu","Greek and Latin primary texts with translations and commentary — the originals behind the quotations in this book."),
 ("Vici.org","vici.org","A crowd-sourced archaeological atlas of classical antiquity: find the fort, villa, or temple nearest any point."),
 ("OCRE: Online Coins of the Roman Empire","numismatics.org/ocre","Every imperial coin type, searchable — ready-made portraits, propaganda, and props for the table."),
]

blocks=[mk(type="p",style="lead",text=L("This setting is built on real scholarship and the words of the Romans themselves. Everything here was drawn from the texts below — the same shelf a GM can raid to go deeper, settle an argument, or steal a plot. The digital tools at the end turn that reading into maps, journeys, and props at the table."))]
blocks.append(mk(type="h3",text="Primary Sources (the Ancient Voices)"))
blocks.append(mk(type="list",items=CS([entry(a,t) for a,t in sorted(primary,key=lambda x:x[0])])))
blocks.append(mk(type="h3",text="Modern Scholarship"))
blocks.append(mk(type="list",items=CS([entry(a,t) for a,t in modern])))
blocks.append(mk(type="h3",text="Digital Tools & Resources"))
blocks.append(mk(type="list",items=CS([L(f"**{n}** (*{u}*) — {d}") for n,u,d in TOOLS])))

chapter=mk(title="Appendix: Sources & Resources", blocks=CS(blocks))

doc=yaml.load(open("content.yaml"))
doc["chapters"].append(chapter)   # back-matter: last
yaml.dump(doc, open("content.yaml","w"))
print("primary:",len(primary),"modern:",len(modern),"tools:",len(TOOLS))
print("chapters now:", [str(c['title']) for c in doc['chapters']])
