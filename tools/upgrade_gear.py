#!/usr/bin/env python3
"""Upgrade the Gear section to the Gear & Gadgets idiom: every item gets a
flavor+mechanics paragraph ending in a stat line, grouped by category; add an
'Arms & Armor of Quality' modifications section and a consolidated summary table."""
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
gear=[c for c in doc["chapters"] if str(c["title"]).startswith("Chapter 2")][0]
B=gear["blocks"]
TABLE_STYLE=B[20].get("style","fullw")

def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=v
    return m
def h3(t): return mk(type="h3", text=t)
def h4(t): return mk(type="h4", text=t)
def p(t, style="body"): return mk(type="p", style=style, text=(L(t) if len(t)>90 else t))

# ---- gear items: (name, latin, body, enc, price, rarity, restricted, short) ----
GEAR=[
 ("Tools & Documents",[
  ("Writing Kit","tabulae ceratae & stylus",
   "Wax tablets and a bone stylus for letters, accounts, and notes scratched out and smoothed again. A character carrying one adds [[boost]] to Knowledge checks to recall something they recorded, and may attempt Skulduggery to forge a casual note.",1,15,1,False,"Writing kit"),
  ("Scribe's Papyrus & Ink","papyrus, atramentum, calamus",
   "Reed pen, lamp-black ink, and a roll of Egyptian papyrus for permanent letters, contracts, and wills. Forging a convincing document is a **Hard** ([[difficulty difficulty difficulty]]) Skulduggery check with these to hand, and impossible without.",0,25,2,False,"Papyrus & ink"),
  ("Signet Ring","anulus signatorius",
   "A carved gem or gold bezel that presses an owner's seal into wax. It adds [[boost]] to social checks that turn on proof of identity or authority; counterfeiting a seal is a **Daunting** ([[difficulty difficulty difficulty difficulty]]) Skulduggery check and a capital crime.",0,200,3,False,"Signet ring"),
  ("Abacus & Counting-Board","abacus",
   "Beads in grooves for sums no Roman does in his head. Adds [[boost]] to Knowledge or Negotiation checks involving accounts, tallies, or large transactions.",1,40,2,False,"Abacus"),
  ("Oil Lamp","lucerna",
   "A terracotta lamp burning olive oil for an evening's light. It removes up to [[setback setback]] imposed by darkness within short range, but gutters in wind and shatters if dropped.",1,8,0,False,"Oil lamp"),
  ("Torch","fax",
   "Pitch-soaked, bright, and short-lived. It removes [[setback]] from darkness at short range, sets fires readily, and serves in a pinch as an improvised Brawl weapon that deals fire damage.",1,2,0,False,"Torch"),
 ]),
 ("Travel & Survival",[
  ("Marching Pack","sarcina",
   "The legionary's burden slung from a furca pole: entrenching tool, stakes, mess-tin, cook-pot, and three days' hard rations. It serves as a survival kit, removing [[setback]] from Survival checks to make or break camp.",4,60,2,False,"Marching pack"),
  ("Field Tent & Camp Kit","papilio",
   "Goat-hide shelter for a contubernium of eight. While camped within it, characters add [[boost]] to Resilience and Survival checks to resist weather and to recover strain overnight.",6,150,3,False,"Field tent"),
  ("Military Cloak","sagum / paenula",
   "Heavy wool that sheds rain and doubles as a bedroll; adds [[boost]] to Resilience checks against cold and exposure.",1,30,1,False,"Military cloak"),
  ("Rations & Posca","frumentum, posca",
   "Grain, oil, salt, and sour wine-vinegar cut with water. Five days' worth is Encumbrance 1; the posca wards off foul water, removing [[setback]] from Resilience checks against tainted supplies.",1,5,0,False,"Rations (5 days)"),
  ("Grappling Hook & Rope","harpago & funis",
   "An iron hook and forty feet of hemp. Anchoring it is an **Average** ([[difficulty difficulty]]) Coordination check; once set, climbers remove [[setback]] from Athletics checks to scale the wall.",2,25,1,False,"Grappling hook & rope"),
  ("Manacles & Chain","catenae",
   "Iron cuffs for slaves and prisoners. A bound captive escapes only on a **Hard** ([[difficulty difficulty difficulty]]) Skulduggery or Athletics check.",2,20,1,False,"Manacles & chain"),
 ]),
 ("Medicine",[
  ("Surgeon's Kit","capsa medica",
   "The *medicus*'s case: scalpels, probes, forceps, clamps, sutures, wine, and herbs. It counts as a medical kit, so Medicine checks to treat wounds suffer no penalty, and it removes [[setback]] imposed by rough field conditions.",2,400,4,False,"Surgeon's kit"),
  ("Herbs & Theriac","herbae, theriaca",
   "Compounded salves, poppy, and the physician's famous antidote-paste. Once per encounter a successful **Average** ([[difficulty difficulty]]) Medicine check lets a patient heal 3 strain or suppress a poison's effects until the end of the scene.",0,150,4,False,"Herbs & theriac"),
 ]),
 ("Clandestine Gear",[
  ("Lockpicks & False Keys","claves adulterinae",
   "Hooks and shims for Roman wards and padlocks. Without them, picking a lock suffers [[setback setback]]; the tools themselves are evidence of ill intent if found.",0,75,5,True,"Lockpicks"),
  ("Disguise","mutatio",
   "A change of station in cloth — a slave's tunic, a stolen livery, a freedman's cap. Adds [[boost]] (or [[boost boost]] with a nomenclator's coaching) to Deception checks to pass as another class.",1,50,2,False,"Disguise"),
  ("Caltrops","murex / tribulus",
   "A handful of four-spiked iron, scattered as a maneuver. The area becomes difficult terrain; anyone crossing at speed makes an **Average** ([[difficulty difficulty]]) Coordination check or suffers 3 strain and is knocked prone.",1,30,3,False,"Caltrops"),
  ("Poison","venenum",
   "From a bad-oyster purge to a senator's favourite. An attacker who applies or administers a dose forces a Resilience check whose difficulty the GM sets by potency — **Average** for a crude purge, up to **Daunting** for a king's draught — inflicting wounds, strain, or a Critical Injury on a failure.",0,300,7,True,"Poison (dose)"),
 ]),
]

# ---- social gear: (name, latin, body, stat_tail, table_row[price,rarity]) ----
SOCIAL=[
 ("Toga Candida",None,
  "The artificially whitened toga of the *candidatus*; adds [[boost]] to canvassing and public social checks and marks you, for better or worse, as a man seeking office.",
  "Encumbrance 2 · 150 HS · Rarity 3",["Toga candida","2","150","3"]),
 ("Letter of Recommendation","litterae commendaticiae",
  "A named patron's written favour. Spend it as a Favour, or add [[boost boost]] to a single first-meeting social check with its addressee.",
  "Encumbrance 0 · 100 HS or a Favour owed · Rarity 4",["Letter of rec.","0","100","4"]),
 ("Nomenclator",None,
  "An educated slave who murmurs the names, offices, and histories of those you meet; grants the benefit of the *Nomenclator's Whisper* talent once per scene even to an owner who lacks it.",
  "Encumbrance — · 2,000 HS (R) · Rarity 5",["Nomenclator","\u2014","2,000 (R)","5"]),
 ("A Claque",None,
  "A hired body of applauders, treated as a minion group. While present, your character may spend their reactions to bank [[boost]] toward the crowd-mood of a speech.",
  "Encumbrance — · 500 HS per performance · Rarity 4",["Claque","\u2014","500","4"]),
 ("A Dossier of Dirt",None,
  "Evidence of a target's guilty secret, the *delator's* stock-in-trade. It reveals one of the target's Flaws automatically and, if made public, costs them 1 Dignitas.",
  "Encumbrance 0 · 1,000 HS (R) · Rarity 6",["Dossier of dirt","0","1,000 (R)","6"]),
 ("A Well-Placed Bribe",None,
  "Coin as argument; adds [[boost]] to a Negotiation or Coercion check per 1,000 HS offered (to a maximum of [[boost boost boost]]), but a [[despair]] means the offer is remembered, and talked about.",
  "Cost as offered · Rarity varies",["Bribe","\u2014","1,000/step","\u2014"]),
]

# ---- modifications (customs idiom) ----
MODS=[
 ("Superior","opus nobile","Forged and finished by a master; the item is of *superior quality* and adds an automatic [[advantage]] to every check made with it. Cost: five times the base price, Rarity 7."),
 ("Balanced","libratum","A blade weighted true to the hand or a sling cut for distance; decreases the weapon's Critical rating by 1, to a minimum of 1. Cost: +500 HS, Rarity 5."),
 ("Serrated","dentatum","A barbed or saw-backed edge that worries a wound; adds the Vicious 1 quality, or increases an existing Vicious rating by 1. Cost: +300 HS, Rarity 5 (R)."),
 ("Gilded","inauratum","Silvered, chased, and jewelled for display; adds [[boost]] to social checks made while bearing it openly, but [[setback]] to Stealth. Cost: +1,000 HS, Rarity 6."),
 ("Poisoner's Groove","toxicatum","A hollow channel holds a dose of venom; the first hit each encounter that deals damage forces the target to make a Resilience check against the applied Poison. Preparing it consumes one dose. Cost: +200 HS, Rarity 7 (R)."),
]

# ===== build blocks =====
mods_blocks=[h3("Arms & Armor of Quality"),
  p("A smith's art separates a legionary's issue blade from a senator's heirloom. Any weapon or piece of armour may be commissioned with one or more of the modifications below; add the listed cost to the base item, and use the higher of the two rarities.")]
for name,lat,body in MODS:
    mods_blocks.append(p(f"**{name} (*{lat}*).** {body}"))

gear_blocks=[h3("Gear & Tools"),
  p("Beyond arms and armour, an adventurer in Rome needs tools, documents, and the small gear of travel and intrigue. Each entry ends with its Encumbrance, price in sesterces (HS), and Rarity; an (R) marks goods that are restricted, stolen, or illegal to carry openly.")]
table_rows=[]
for cat,items in GEAR:
    gear_blocks.append(h4(cat))
    for name,lat,body,enc,price,rar,r,short in items:
        rtail=" (R)" if r else ""
        gear_blocks.append(p(f"**{name} (*{lat}*).** {body} — *Encumbrance {enc} · {price} HS{rtail} · Rarity {rar}.*"))
        table_rows.append([short,str(enc),f"{price}{rtail}",str(rar)])

social_blocks=[h3("Social Gear & Traits"),
  p("The instruments of *dignitas* and influence are gear as surely as any blade. They are bought, hired, or extorted, and spent in the Forum, the Senate, and the courts.")]
for name,lat,body,tail,row in SOCIAL:
    lead=f"**{name}"+(f" (*{lat}*)" if lat else "")+".**"
    social_blocks.append(p(f"{lead} {body} — *{tail}.*"))
    table_rows.append(row)

summary=mk(type="table", style=TABLE_STYLE,
  columns=["Item","Enc","Price (HS)","Rarity"], rows=table_rows)
table_lead=p("**Gear, Tools & Services.** A quick reference to everything above; see each entry for its full effect.","small")

new_mid = mods_blocks + gear_blocks + social_blocks + [table_lead, summary]
# replace blocks 23..26 (old Gear&Tools h3+list, Social h3+list) with new_mid
gear["blocks"]=B[:23]+new_mid+B[27:]

yaml.dump(doc, open("content.yaml","w"))
print("new gear-chapter block count:", len(gear["blocks"]))
print("gear/social items tabled:", len(table_rows), "| mods:", len(MODS))
