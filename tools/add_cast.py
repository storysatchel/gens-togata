#!/usr/bin/env python3
"""Add a cast of lesser-but-formidable named NPCs to Dramatis Personae, each placed
in a regio/quarter/provincia, and cross-link them back from the gazetteer entries.
Original characters; their worlds/roles drawn from the ~/Documents/rome wiki."""
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM, CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=(L(v) if isinstance(v,str) and len(v)>90 else v)
    return m
def npc(name,kind,desc,chars,derived,fields):
    return mk(type="statblock",name=name,kind=kind,desc=desc,
      chars=mk(**chars),derived=mk(**derived),
      fields=CS([mk(label=k,text=v) for k,v in fields]))

ch={str(c["title"]):c for c in doc["chapters"]}
DP=ch["Dramatis Personae"]["blocks"]

DP.append(mk(type="h3",text="Figures of the City & Provinces"))
DP.append(mk(type="p",style="body",text=L("The great names rule the page of history; these rule the street, the dock, the ludus, and the frontier. Each is no less formidable in their own ground \u2014 and each is placed where you will find them. They are invented, but their worlds are drawn from the wiki's scholarship on the Roman household, the provinces, the legions, and the gods.")))

DP.append(npc("Rufio Scaeva","Nemesis",
  "A scarred freedman who runs a *collegium* \u2014 nominally a burial-club and crossroads shrine, in truth the organized muscle of the quarter. He delivers votes, protection, arson, and silence, and the aediles look the other way.",
  dict(Br="3",Ag="3",Int="2",Cun="4",Will="3",Pr="3"),
  dict(Soak="4",**{"W.T.":"16","Def (M/R)":"1/0"}),
  [("Haunt","**Regio: the Subura** \u2014 the crowded lower-city warren of tenements and taverns."),
   ("Motivations","Desire: to be the man the quarter needs. Fear: a rival collegium. Strength: a hundred clients who owe him. Flaw: pride in his own legend."),
   ("Skills","Brawl 3, Melee 2, Coercion 3, Streetwise 4, Deception 2, Knowledge (Rome) 2, Vigilance 3."),
   ("Talents","Adversary 2; Morning Clients; a standing minion group of *Street Toughs*."),
   ("Abilities","**The Quarter Is His:** anywhere in the Subura, Rufio adds [[boost boost]] to social and Streetwise checks and always knows who is new; strangers who cross him draw his toughs within a scene. **Fire as Argument:** he can arrange a \u201caccidental\u201d tenement fire as a threat or a distraction.")]))

DP.append(npc("Tha\u00efs of the Iseum","Nemesis",
  "A freedwoman priestess of Isis who presides over the dockside temple and, through it, the right-bank trade in secrets, contraband, and foreign gods. Serene, generous, and utterly informed.",
  dict(Br="1",Ag="2",Int="3",Cun="4",Will="4",Pr="4"),
  dict(Soak="2",**{"W.T.":"14","S.T.":"16","Def (M/R)":"0/1"}),
  [("Haunt","**Regio: Transtiberim** \u2014 the immigrant working quarter of docks and foreign cults across the river."),
   ("Motivations","Desire: a sanctuary for her people and her goddess. Fear: a crackdown on \u201cforeign superstition.\u201d Strength: a web of dockers, sailors, and devotees. Flaw: she will risk much for a fellow worshipper."),
   ("Skills","Charm 3, Deception 3, Knowledge (the Gods) 3, Knowledge (Rome) 2, Streetwise 3, Vigilance 2."),
   ("Talents","Adversary 2; Nobody's Fool; a Web-of-Letters among the docks."),
   ("Abilities","**What Comes Ashore:** once per session she can tell you who shipped what, and when \u2014 or make a cargo quietly disappear. **The Goddess Sees:** in a [[Fated]] Rome her omens feed the party's Story Points; her devotees will hide a hunted man.")]))

DP.append(npc("Hyacinthus","Nemesis",
  "An imperial freedman, born a slave, who keeps the emperor's accounts as *a rationibus* \u2014 and therefore holds the purse of the world. Smooth, tireless, richer than most senators, and hated by all of them.",
  dict(Br="1",Ag="2",Int="4",Cun="4",Will="3",Pr="3"),
  dict(Soak="2",**{"W.T.":"13","S.T.":"18","Def (M/R)":"0/1"}),
  [("Haunt","**Regio: the Palatine** \u2014 the imperial residence atop the hill."),
   ("Motivations","Desire: to be indispensable to the throne. Fear: a new emperor, a new favourite. Strength: he controls access and money. Flaw: a freedman's hunger for the respect birth denies him."),
   ("Skills","Knowledge (Rome) 4, Knowledge (Law) 3, Negotiation 3, Deception 3, Charm 2, Vigilance 3, Cool 2."),
   ("Talents","Adversary 2; Plausible Deniability; Nobody's Fool."),
   ("Abilities","**The Keys to the Purse:** he can fund or ruin an enterprise with a stroke of the stylus, and adds [[success]] to any check turning on money or palace access. **The Emperor's Ear:** a word from him carries the weight of the princeps \u2014 treat as the *Emperor's known wish* against those he opposes.")]))

DP.append(npc("Caecilia Attica","Nemesis",
  "A freedwoman grown into one of the Forum's great *argentarii* (bankers). She lends to senators against their next province and keeps their secrets as collateral; her ledger is a map of who truly owns Rome.",
  dict(Br="1",Ag="2",Int="4",Cun="4",Will="3",Pr="3"),
  dict(Soak="2",**{"W.T.":"13","S.T.":"16","Def (M/R)":"0/1"}),
  [("Haunt","**Regio: the Forum Romanum** \u2014 the bankers' tables by the Janus arch."),
   ("Motivations","Desire: security no patron can revoke. Fear: a defaulted magnate dragging her down. Strength: half the Senate is in her debt. Flaw: she cannot resist a profitable risk."),
   ("Skills","Negotiation 4, Knowledge (Law) 3, Knowledge (Rome) 3, Deception 3, Coercion 2, Charm 2."),
   ("Talents","Adversary 2; Morning Clients; a dossier on every client."),
   ("Abilities","**The Ledger:** she knows the true finances of the great, and can call a debt at the worst possible moment \u2014 add [[boost boost]] to any social check against a man who owes her. **Credit as a Weapon:** she can bankroll the party, or quietly cut off their rival's line of credit.")]))

DP.append(npc("Eutyches the Green","Rival",
  "The reigning charioteer of the Green faction \u2014 a slave-born idol worth more than a senator's estate, cheered by tens of thousands who would riot at his death. Fearless to the point of madness.",
  dict(Br="3",Ag="4",Int="2",Cun="3",Will="3",Pr="3"),
  dict(Soak="3",**{"W.T.":"15","Def (M/R)":"1/1"}),
  [("Haunt","**Regio: the Circus Maximus** \u2014 the great racing arena and the Greens' stables."),
   ("Motivations","Desire: freedom, and to be remembered. Fear: the fall that cripples. Strength: the adoration of the mob. Flaw: recklessness."),
   ("Skills","Driving 4, Athletics 3, Coordination 3, Cool 2, Charm 2."),
   ("Talents","Adversary 1; Full Throttle; Defensive Driving."),
   ("Abilities","**Darling of the Crowd:** at the Circus the faithful are his \u2014 his word can calm or inflame a crowd of thousands (feed or spend the race-day mood pool). **No Fear of the Turn:** he may suffer strain to attempt driving stunts no sane man would.")]))

DP.append(npc("Verax the Thracian","Nemesis",
  "A captured warrior turned champion of the arena \u2014 the finest blade in the ludus, one great bout from the wooden sword of freedom. Courteous, patient, and lethal; the crowd screams his name.",
  dict(Br="4",Ag="4",Int="2",Cun="3",Will="4",Pr="2"),
  dict(Soak="5",**{"W.T.":"18","Def (M/R)":"1/1"}),
  [("Haunt","**Regio: the Caelian** \u2014 the gladiatorial school (*ludus*) near the amphitheatre."),
   ("Motivations","Desire: the *rudis* \u2014 freedom. Fear: dying unremembered. Strength: unmatched skill of arms. Flaw: a debt of honour to a fellow fighter."),
   ("Skills","Melee 4, Brawl 3, Athletics 3, Coordination 2, Cool 3, Resilience 3."),
   ("Talents","Adversary 3; Gladiatorial Training; Parry 3; Feint."),
   ("Abilities","**Showman's Kill:** when he wins a melee check he may spend [[advantage]]/[[triumph]] to work the crowd, swinging the race-day/arena mood and the editor's *missio* vote. **The Crowd's Favourite:** so long as the mob loves him, even his master dares not simply dispose of him.")]))

DP.append(npc("Hermogenes","Rival",
  "A Greek physician of the Hippocratic schools, a freedman attached to a great house \u2014 and thus privy to every illness, pregnancy, poisoning, and deathbed secret under its roof. Indispensable, and therefore dangerous.",
  dict(Br="1",Ag="3",Int="4",Cun="3",Will="3",Pr="2"),
  dict(Soak="2",**{"W.T.":"12","Def (M/R)":"0/1"}),
  [("Haunt","**Regio: the Caelian** \u2014 a great senatorial *domus* on the hill."),
   ("Motivations","Desire: knowledge, and a patron worth serving. Fear: being blamed for a death. Strength: his masters' lives are in his hands. Flaw: intellectual vanity."),
   ("Skills","Medicine 4, Knowledge (the Gods) 2, Knowledge (Rome) 2, Deception 2, Vigilance 2, Cool 2."),
   ("Talents","Adversary 1; superb Medicine; knows every house's secrets."),
   ("Abilities","**The Healer's Hand:** removes [[setback]] from Medicine and may heal strain or wounds beyond a kit's normal use. **He Knows What Ails the House:** a reservoir of intimate secrets \u2014 and the quiet skill to make a death look natural, should he choose.")]))

DP.append(npc("Fortunata","Nemesis",
  "The *vilica* \u2014 slave-manageress \u2014 of a senator's vast country estate. She runs the storehouses, the cult, the slave gangs, and the accounts while the master is in Rome; nothing enters or leaves without her tally.",
  dict(Br="2",Ag="2",Int="3",Cun="4",Will="4",Pr="2"),
  dict(Soak="3",**{"W.T.":"15","Def (M/R)":"0/0"}),
  [("Haunt","**Provincia: Italia** \u2014 a great *latifundium* estate in the countryside."),
   ("Motivations","Desire: to make the estate (and herself) indispensable. Fear: a new overseer. Strength: she holds the keys and the rationing. Flaw: she rules the slave quarters as her own fief."),
   ("Skills","Knowledge (Rome) 2, Coercion 3, Negotiation 2, Survival 3, Vigilance 3, Discipline 3."),
   ("Talents","Adversary 2; Morning Clients (among the estate's hands and freedmen)."),
   ("Abilities","**Keeper of the Stores:** she controls food, tools, and the slave gangs \u2014 on her ground, nothing is done without her leave. **The Estate's Memory:** she knows every debt, grudge, and hidden cache on the land, and rations both grain and mercy as tools.")]))

DP.append(npc("Lucius Petronius","Nemesis",
  "The *primus pilus* \u2014 first-spear centurion \u2014 of a frontier legion: thirty years under arms, the iron spine of the camp, more feared and obeyed than the young senators who nominally command him.",
  dict(Br="4",Ag="3",Int="2",Cun="3",Will="4",Pr="3"),
  dict(Soak="5",**{"W.T.":"20","Def (M/R)":"1/1"}),
  [("Haunt","**Provincia: the Rhine & Danube Frontier** \u2014 a legionary fortress on the *limes*."),
   ("Motivations","Desire: the honour of the eagle, and a rich retirement. Fear: a broken line. Strength: the legionaries obey him before any tribune. Flaw: contempt for soft city politics."),
   ("Skills","Melee 3, Ranged 3, Discipline 4, Leadership 3, Coercion 3, Knowledge (Warfare) 3, Resilience 3."),
   ("Talents","Adversary 2; Field Commander; Commanding Presence."),
   ("Abilities","**The Spine of the Legion:** troops under his eye gain [[boost]] and resist fear; he turns a wavering line. **The Soldiers Are His:** in a crisis the men look to Petronius, not the aristocrat in the fine cloak \u2014 a quiet, dangerous fact on a frontier far from Rome.")]))

DP.append(npc("Zenon of Alexandria","Nemesis",
  "A Greek *navicularius* (shipping magnate) whose grain fleet is a sizeable share of the dole that keeps Rome fed and quiet. Suave, cosmopolitan, and keenly aware that he holds the city's hunger in his holds.",
  dict(Br="1",Ag="2",Int="4",Cun="4",Will="3",Pr="3"),
  dict(Soak="2",**{"W.T.":"13","S.T.":"16","Def (M/R)":"0/1"}),
  [("Haunt","**Provincia: Aegyptus** \u2014 the harbours of Alexandria, the emperor's grain-domain."),
   ("Motivations","Desire: profit and standing in two worlds. Fear: the emperor's prefect, who can ruin him. Strength: he can speed or stall the grain fleet. Flaw: he plays Rome and Alexandria against each other."),
   ("Skills","Negotiation 4, Knowledge (Rome) 3, Deception 3, Charm 3, Coordination 2, Vigilance 2."),
   ("Talents","Adversary 2; a web of factors in every eastern port."),
   ("Abilities","**Hold of the City's Hunger:** by hastening or delaying his fleet he can ease or inflame the Roman grain price \u2014 and the mob's temper with it. **Two Worlds:** equally at home in the Museum and the Forum, he adds [[boost]] to cross-cultural social checks.")]))

DP.append(npc("Zabdibel of Palmyra","Nemesis",
  "A caravan-prince of the desert city, lord of the routes that bring silk, spice, and incense from the East. He commands his own armed caravan-guard and treats with Rome and Parthia as a power, not a subject.",
  dict(Br="3",Ag="3",Int="3",Cun="4",Will="3",Pr="4"),
  dict(Soak="4",**{"W.T.":"16","Def (M/R)":"1/1"}),
  [("Haunt","**Provincia: Syria** \u2014 Palmyra and the caravan roads to the East."),
   ("Motivations","Desire: to keep Palmyra free and rich between two empires. Fear: a frontier war that closes the routes. Strength: wealth, his caravan-guard, and both empires' need of him. Flaw: he trusts no empire, and both know it."),
   ("Skills","Negotiation 3, Knowledge (Rome) 2, Streetwise 3, Ranged 3, Coordination 2, Leadership 3, Survival 3."),
   ("Talents","Adversary 2; Field Commander (his caravan-guard are a trained minion group)."),
   ("Abilities","**Lord of the Routes:** he can move goods \u2014 or people \u2014 across the eastern desert where Rome's writ fades, and knows what crosses the Parthian line. **A Prince, Not a Subject:** on his own ground his standing rivals a governor's; slight him and the caravans simply stop coming.")]))

DP.append(npc("Esico","Rival",
  "A druid of the old faith, hunted since Rome put the sacred groves to the torch. He keeps the memory of free Britain and the old gods alive among the tribes, and a Roman column has never yet caught him.",
  dict(Br="2",Ag="3",Int="3",Cun="4",Will="4",Pr="3"),
  dict(Soak="3",**{"W.T.":"14","S.T.":"16","Def (M/R)":"1/1"}),
  [("Haunt","**Provincia: Britannia** \u2014 the misty hills and hidden groves beyond the frontier."),
   ("Motivations","Desire: to drive Rome back into the sea. Fear: the last grove felled. Strength: the tribes' faith and the land itself. Flaw: he will spend lives \u2014 others' and his own \u2014 for the cause."),
   ("Skills","Knowledge (the Gods) 3, Survival 4, Stealth 3, Charm 2, Coercion 2, Vigilance 3."),
   ("Talents","Adversary 1; Master of the land; a hidden network of believers."),
   ("Abilities","**The Old Gods Watch:** in a [[Fated]] or [[Mythic]] Britannia his curses and omens bite \u2014 inflict fear or bank [[threat]] against those who defile the groves. **He Knows the Land:** on his own ground Rome's soldiers suffer [[setback]] to track or corner him, and the tribes shelter him.")]))

# ---------- cross-link from the gazetteer ----------
GAZ=ch["A Gazetteer of the Roman World"]["blocks"]
faces={
 "**The Subura (*Subura*).**": "**A face here:** Rufio Scaeva, boss of the quarter's collegium (see *Dramatis Personae*).",
 "**Transtiberim (*Trans Tiberim*).**": "**A face here:** Tha\u00efs of the Iseum, priestess of Isis and queen of the dockside secret-trade.",
 "**The Palatine (*Palatium*).**": "**A face here:** Hyacinthus, the imperial freedman who keeps the emperor's accounts.",
 "**Forum Romanum (*the Forum*).**": "**A face here:** Caecilia Attica, the *argentaria* who holds half the Senate's debts.",
 "**The Circus Maximus (*Circus Maximus*).**": "**A face here:** Eutyches the Green, the slave-born charioteer the mob adores.",
 "**The Esquiline, Quirinal, Viminal & Caelian (*the lesser hills*).**": "**Faces here:** Verax the Thracian, champion of the Caelian *ludus*, and Hermogenes, the house physician who knows every secret.",
 "**Italia**": "**A face here:** Fortunata, the *vilica* who truly runs a senator's country estate.",
 "**Aegyptus**": "**A face here:** Zenon of Alexandria, whose grain fleet holds the city's hunger.",
 "**Syria**": "**A face here:** Zabdibel of Palmyra, caravan-prince of the eastern routes.",
 "**Britannia**": "**A face here:** Esico, the hunted druid who keeps the old gods and the memory of revolt alive.",
 "**The Rhine & Danube Frontier**": "**A face here:** Lucius Petronius, the *primus pilus* whom the legion obeys before any tribune.",
}
hit=0
for b in GAZ:
    t=b.get("text")
    if isinstance(t,str):
        for lead,ptr in faces.items():
            if t.startswith(lead):
                b["text"]=L(t.rstrip()+" "+ptr); hit+=1; break

yaml.dump(doc,open("content.yaml","w"))
print("lesser NPCs added; gazetteer cross-links:",hit,"of",len(faces))
