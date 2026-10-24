#!/usr/bin/env python3
"""Consolidate the 'Social Tools & Adversaries' chapter into the main sections:
 - social talents  -> New Talents (reformatted, slotted under their Tier headings)
 - social gear     -> Chapter 2: Gear and Vehicles
 - Forum adversaries -> Adversaries
Then delete the orphan chapter. Also reword the Morning Clients talent.
"""
import re
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
chapters=doc["chapters"]
by={c["title"]:c for c in chapters}
social=by["Social Tools & Adversaries"]["blocks"]
talents_ch=by["New Talents"]["blocks"]
gear_ch=by["Chapter 2: Gear and Vehicles"]["blocks"]
adv_ch=by["Adversaries"]["blocks"]

def h3i(blocks,title):
    for i,b in enumerate(blocks):
        if b.get("type")=="h3" and b.get("text")==title: return i
    return None

it=h3i(social,"New Social Talents"); ig=h3i(social,"Social Gear & Traits"); ia=h3i(social,"Adversaries of the Forum")
talent_blocks=social[it+1:ig]
gear_blocks=social[ig:ia]      # h3 'Social Gear & Traits' + list
adv_blocks=social[ia:]         # h3 'Adversaries of the Forum' + intro p + statblocks

NEW_MORNING=("At the start of each session, your character has a number of banked Favors equal to their "
 "Dignitas (minimum 1), gathered from the petty clients who attend their morning *salutatio*. This is a "
 "fresh allotment each session: unused Favors do not accumulate or carry over.")

# --- parse social talents ---
parsed=[]  # (tier,name,activation,ranked,desc)
k=0
while k < len(talent_blocks):
    b=talent_blocks[k]
    if b.get("type")=="h4":
        head=str(b["text"]); desc=""
        if k+1 < len(talent_blocks) and talent_blocks[k+1].get("type")=="p":
            desc=str(talent_blocks[k+1]["text"]); k+=2
        else: k+=1
        m=re.match(r"^(.*?)\s*\(Tier\s*(\d)\s*·\s*(.*?)\)\s*$", head)
        name=m.group(1).strip(); tier=int(m.group(2)); rest=m.group(3).strip()
        ranked="No"
        if "Ranked" in rest:
            ranked="Yes"; rest=rest.replace("· Ranked","").replace(", Ranked","").replace("Ranked","").strip(" ,·")
        if rest.startswith("Active"):
            inner=rest.split(",",1)[1].strip() if "," in rest else ""
            activation=f"Active ({inner})" if inner else "Active"
        else:
            activation=rest
        if name=="Morning Clients": desc=NEW_MORNING
        parsed.append((tier,name,activation,ranked,desc))
    else:
        k+=1

def mk(**kw):
    m=CM()
    for key,val in kw.items(): m[key]=val
    return m
def talent_blocks_for(tier,name,activation,ranked,desc):
    return [
        mk(type="h4", text=name),
        mk(type="p", style="body", text=f"**Tier:** {tier}   **Activation:** {activation}   **Ranked:** {ranked}"),
        mk(type="p", style="body", text=L(desc) if len(desc)>90 else desc),
    ]

def tier_end(blocks,n):
    start=None
    for i,b in enumerate(blocks):
        if b.get("type")=="h3" and b.get("text")==f"Tier {n}": start=i; break
    if start is None: return len(blocks)
    for i in range(start+1,len(blocks)):
        if blocks[i].get("type")=="h3" and str(blocks[i].get("text","")).startswith("Tier "):
            return i
    return len(blocks)

# insert tiers high->low so lower-tier indices stay valid
for n in (5,4,3,2,1):
    ins=[]
    for (tier,name,activation,ranked,desc) in parsed:
        if tier==n: ins+=talent_blocks_for(tier,name,activation,ranked,desc)
    if ins:
        pos=tier_end(talents_ch,n)
        talents_ch[pos:pos]=ins

# --- move social gear into Gear chapter (before 'Beasts & Vehicles') ---
bi=h3i(gear_ch,"Beasts & Vehicles")
if bi is None: bi=len(gear_ch)
gear_ch[bi:bi]=list(gear_blocks)

# --- move Forum adversaries to end of Adversaries chapter ---
adv_ch.extend(list(adv_blocks))

# --- drop the orphan chapter ---
doc["chapters"]=[c for c in chapters if c["title"]!="Social Tools & Adversaries"]

yaml.dump(doc, open("content.yaml","w"))
print("social talents merged:", len(parsed))
print("gear blocks moved:", len(gear_blocks), "| forum adversary blocks moved:", len(adv_blocks))
print("chapters now:", [c["title"] for c in doc["chapters"]])
