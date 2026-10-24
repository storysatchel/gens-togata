#!/usr/bin/env python3
"""Intersperse the lesser NPC stat blocks INTO the gazetteer, each immediately after
its location entry (SotB style), instead of a separate section linked by 'Haunt'.
Removes the 'Figures of the City & Provinces' section, the Haunt fields, and the
'A face here:' gazetteer pointers."""
import re
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
ch={str(c["title"]):c for c in doc["chapters"]}

# 1) pull the lesser-NPC section out of Dramatis Personae
DP=ch["Dramatis Personae"]["blocks"]
cut=None
for i,b in enumerate(DP):
    if b.get("type")=="h3" and str(b.get("text","")).startswith("Figures of the City"):
        cut=i; break
assert cut is not None, "section not found"
moved=DP[cut:]
del DP[cut:]
npcs={}  # name -> statblock (Haunt removed)
for b in moved:
    if b.get("type")=="statblock":
        b["fields"]=CS([f for f in b["fields"] if f.get("label")!="Haunt"])
        npcs[str(b["name"])]=b
assert len(npcs)==12, len(npcs)

# 2) map each NPC to its gazetteer entry lead (ordered where two share a lead)
place={
 "**The Subura (*Subura*).**": ["Rufio Scaeva"],
 "**Transtiberim (*Trans Tiberim*).**": ["Tha\u00efs of the Iseum"],
 "**The Palatine (*Palatium*).**": ["Hyacinthus"],
 "**Forum Romanum (*the Forum*).**": ["Caecilia Attica"],
 "**The Circus Maximus (*Circus Maximus*).**": ["Eutyches the Green"],
 "**The Esquiline, Quirinal, Viminal & Caelian (*the lesser hills*).**": ["Verax the Thracian","Hermogenes"],
 "**Italia**": ["Fortunata"],
 "**Aegyptus**": ["Zenon of Alexandria"],
 "**Syria**": ["Zabdibel of Palmyra"],
 "**Britannia**": ["Esico"],
 "**The Rhine & Danube Frontier**": ["Lucius Petronius"],
}

# 3) rebuild the gazetteer: strip the pointer suffix, then insert the block(s) after the entry
GAZ=ch["A Gazetteer of the Roman World"]["blocks"]
new=[]
placed=0
for b in GAZ:
    t=b.get("text")
    inserted_for=None
    if isinstance(t,str):
        for sfx in ("**A face here:**","**Faces here:**"):
            j=t.find(sfx)
            if j!=-1:
                t=t[:j].rstrip()
                b["text"]=L(t) if len(t)>90 else t
        for lead,names in place.items():
            if t.startswith(lead):
                inserted_for=names; break
    new.append(b)
    if inserted_for:
        for nm in inserted_for:
            new.append(npcs[nm]); placed+=1
ch["A Gazetteer of the Roman World"]["blocks"]=CS(new)
assert placed==12, placed

yaml.dump(doc,open("content.yaml","w"))
print("NPCs interspersed into gazetteer:",placed)
print("Dramatis Personae now holds:", [b.get("name") for b in DP if b.get("type")=="statblock"])
