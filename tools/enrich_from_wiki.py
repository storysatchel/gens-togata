#!/usr/bin/env python3
"""Enrich + fact-check The Eternal City against the ~/Documents/rome research wiki.
Grounded edits: corrections (augury belief, oratory-as-one-tool, Republican-era flags,
religion nuance, Senate speaking order) + enrichments (contio model, obnuntiatio modes,
tribunal types, amicitia, Dignitas decay, Vestal & Epicurean adversaries, adoption/household,
scenario grounding, Patrician counter-lever, Sources & Further Reading)."""
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM
from ruamel.yaml.comments import CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
ch={str(c["title"]):c for c in doc["chapters"]}
def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=(L(v) if isinstance(v,str) and len(v)>90 else v)
    return m
def p(t,style="body"): return mk(type="p",style=style,text=t)
def find(blocks,pred):
    for i,b in enumerate(blocks):
        if pred(b): return i
    raise SystemExit("anchor not found")
def repl_text(blocks,needle,newtext):
    for b in blocks:
        if isinstance(b.get("text"),str) and needle in b["text"]:
            b["text"]=L(newtext) if len(newtext)>90 else newtext; return
    raise SystemExit("text needle not found: "+needle[:40])

T=ch["The Theater of Power"]["blocks"]
# 1) Oratory: soften 'superweapon' + contio model + imperial note
repl_text(T,"The trained speech was the Roman superweapon",
 "Trained oratory was a Roman's sharpest tool — but only one of several. Ancestry, wealth, patronage, military glory, and sheer *dignitas* carried as many arguments as eloquence did: Marius won seven consulships with almost no gift for speech, and Pompey and Antony leaned on reputation and spectacle over rhetoric. So treat a great speech as a force-multiplier for a strong position, not a substitute for one — a character rich in standing and connections can rule the Forum on a middling check. The Republican model is the **contio**, the non-voting public meeting a magistrate called to work the People before a vote; only a magistrate could summon one, so a private citizen needed a friendly magistrate's invitation to speak — contio-access as a currency of alliance. Run a major speech as a short structured social encounter (3–5 rounds) against an **audience**, treated as a single target with a **strain threshold** set by its size and mood. Exceed the threshold and the audience is *won*; exceed half for a **partial** result. *(Under the emperors the contio and the voting assemblies lose their teeth; the imperial stages for this same mechanic are the crowd's acclamation at the games and the Circus, and a general's address to his troops.)*")
# 2) appeals list: add Revelatory Appeal (Logos)
app=find(T,lambda b:b.get("type")=="list" and any("Ethos" in str(x) for x in b.get("items",[])))
T[app]["items"].append(L("**Revelatory Appeal** (*Logos*) — claim privileged knowledge the audience cannot check (Cicero's ever-wakeful \u201cI know their every plan\u201d): add [[boost boost]] to the appeal, but a [[despair]] exposes the bluff and costs you Dignitas for the scene."))
# 3) Procedural Trump Cards: rewrite Relatio / Intercessio / Obnuntiatio
tc=find(T,lambda b:b.get("type")=="procedure" and b.get("title")=="Procedural Trump Cards")
steps=T[tc]["steps"]
for i,s in enumerate(steps):
    if s.startswith("**Relatio"):
        steps[i]=L("**Relatio & sententiae.** The presiding consul sets the motion and calls senators for their *sententiae* — the consuls-designate and senior *consulares* first, not by raw seniority. High standing literally speaks first and frames the debate (add [[boost]] to the opening side); under the Empire the consuls, and the emperor's wishes, set the order.")
    elif s.startswith("**Intercessio"):
        steps[i]=L("**Intercessio — the Tribune's veto.** In the Republic a Tribune of the Plebs may, once per session, veto the motion outright: a hard stop, answered only by winning him over, out-waiting him, or arranging his absence. *(By the High Empire this is a dead letter — the* princeps *himself holds* tribunicia potestas *and sacrosanctity, and the real veto is simply his known wish, below.)*")
    elif s.startswith("**Obnuntiatio"):
        steps[i]=L("**Obnuntiatio & the auspices — the omens.** Most Romans believed the auspices truly spoke Jupiter's will, so this is a weapon of faith, not mere theatre, and a man caught fabricating a sign faced ruin. Two moves: a magistrate who **\u201cwatches the sky\u201d** (Knowledge (the Gods)) declares the day's omens foul and *suspends all business for the day* (Bibulus paralysed Caesar's consulship this way); an **augur's formal ruling** that an act was taken *vitio* (flawed) can void a law already passed or compel a magistrate's abdication — a harder check and a graver blow. Faking either is a desperate, capital gamble, and a fine plot hook.")
# 4) Courtroom: tribunal types + sacral trial
ci=find(T,lambda b:isinstance(b.get("text"),str) and b["text"].startswith("Run a Roman trial as a speech-contest"))
T[ci+1:ci+1]=[p("**Which court?** Roman justice ran across several tribunals, each a different flavour of this set-piece: the standing criminal courts (*quaestiones perpetuae*, the model for most trials), trials before the people (*iudicia populi*), and religious courts — a priest or a Vestal accused of *incestum* answered to the pontifical college, not a lay jury. In a sacral trial, swap **Knowledge (Law)** for **Knowledge (the Gods)** as the *Logos* skill and make the college the audience.")]
# 5) Salutatio: clientela vs amicitia
si=find(T,lambda b:isinstance(b.get("text"),str) and b["text"].startswith("Every morning, clients call"))
T[si+1:si+1]=[p("**Two kinds of bond.** Favors run *down* **clientela** (patron over client) and *across* **amicitia** — reciprocal \u201cfriendship\u201d between near-equals that was itself a political institution: letters of recommendation, invitations, a magistrate's leave to address a meeting. An *amicitia* Favor is called in between equals with no Dignitas-gap limit, but breaking one costs extra reputation, because it shames both parties.")]
# 6) Dignitas decay optional rule
di=find(T,lambda b:isinstance(b.get("text"),str) and b["text"].startswith("**Gaining and losing it."))
T[di]["text"]=L(T[di]["text"].rstrip()+" **Optional — the hunger of prestige.** Pedigree alone never sustained a Roman house; standing had to be renewed each generation (by the early Empire, idle heirs of the Fabii were mocked for coasting on ancestral glory). A high-Dignitas character who wins no landmark success across a long stretch of play slowly loses a point of Dignitas, unless renewed by office, magnificent games, or martial glory.")

# ---- Adversaries: era note on Tribune; deepen Stoic; add Vestal + Epicurean ----
A=ch["Adversaries"]["blocks"]
trib=find(A,lambda b:b.get("type")=="statblock" and "Popularis Tribune" in str(b.get("name","")))
A[trib]["desc"]=L(str(A[trib]["desc"]).rstrip()+" *(His independent veto and sacrosanctity are Republican; under the High Empire the* princeps *holds* tribunicia potestas *and a tribune can no longer check him.)*")
sto=find(A,lambda b:b.get("type")=="statblock" and "Stoic Philosopher" in str(b.get("name","")))
A[sto]["fields"].append(mk(label="Doctrine & the Good Death", text="He holds that a providential cosmos governs all and that externals — wealth, pain, reputation, even bodily harm — are *things indifferent*. **Things Indifferent:** remove [[setback]] imposed by threats to his comfort or standing, and ignore strain from insult or mockery. **The Good Death:** cornered by a tyrant, he may choose a dignified suicide that denies the enemy the kill and preserves, even raises, his Dignitas — the Stoic's final freedom (Cato, Seneca)."))
forum_last=find(A,lambda b:b.get("type")=="statblock" and "Stoic Philosopher" in str(b.get("name","")))
vestal=mk(type="statblock", name="Vestal Virgin", kind="Nemesis",
  desc="One of the six priestesses of Vesta — legally free of father and husband alike, keeper of the sacred flame and of Rome's most important wills. Her person is sacrosanct: to lay hands on her is death.",
  chars=mk(Br="1",Ag="2",Int="3",Cun="3",Will="4",Pr="4"),
  derived=mk(Soak="2",**{"W.T.":"12","S.T.":"20","Def (M/R)":"1/1"}),
  fields=CS([
    mk(label="Motivations", text="Desire: Rome's safety & the *pax deorum*. Fear: pollution of the sacred. Strength: unassailable standing. Flaw: the terror of the living-burial penalty for unchastity."),
    mk(label="Skills", text="Charm 2, Cool 2, Discipline 3, Knowledge (the Gods) 3, Knowledge (Law) 2, Knowledge (Rome) 3, Vigilance 2."),
    mk(label="Talents", text="Adversary 2; Nobody's Fool 2; Patronus."),
    mk(label="Abilities", text="**Sacrosanct:** any attempt to coerce, seize, or harm her suffers [[setback setback]] and courts ruin; violence against her is a capital sacrilege. **Keeper of Wills:** she safeguards the sealed wills and treasures of the great (Caesar's, later Antony's), and so knows secrets coin cannot reach — call it a Web-of-Letters Favor once per session. **Sacral Authority:** her reading of an omen or the *pax deorum* can feed a [[Fated]] party's Story Points or halt a public act as surely as an augur's, and her testimony is accepted without the oath required of others."),
  ]))
epicurean=mk(type="statblock", name="Epicurean Philosopher (Advisor)", kind="Rival",
  desc="A serene teacher who holds the cosmos to be blind atoms and void, the soul mortal, and the gods wholly indifferent — so neither death nor omen is to be feared. He counsels withdrawal from the mad race for office.",
  chars=mk(Br="2",Ag="2",Int="4",Cun="3",Will="3",Pr="2"),
  derived=mk(Soak="2",**{"W.T.":"12","Def (M/R)":"0/1"}),
  fields=CS([
    mk(label="Motivations", text="Desire: *ataraxia* (tranquillity). Fear: needless pain. Strength: fearlessness of gods and death. Flaw: detachment mistaken for indifference."),
    mk(label="Skills", text="Charm 2, Cool 3, Discipline 2, Knowledge (the Gods) 2, Knowledge (Rome) 3, Medicine 1."),
    mk(label="Talents", text="Adversary 1; Master Orator; Stoic Discipline 1."),
    mk(label="Abilities", text="**Unmoved by Omens:** immune to fear effects drawn from portents, curses, or the wrath of the gods — a pointed foil in a [[Fated]] or [[Mythic]] Rome where the gods may be real. **Counsel of the Garden:** once per session he talks an ally off a rash course, granting [[boost boost]] to resist a provocation or removing a Fear-based [[setback]]. **Withdrawal:** he gains no Dignitas from office and scorns the Favor economy, which makes him incorruptible and infuriating."),
  ]))
A[forum_last+1:forum_last+1]=[vestal, epicurean]

# ---- Scenarios ----
S=ch["Starter Scenarios"]["blocks"]
cat=find(S,lambda b:isinstance(b.get("text"),str) and b["text"].startswith("**What's going on:** Catiline is real"))
S[cat+1:cat+1]=[p("**A clue you cannot buy.** A **Vestal Virgin** carries an omen no bribe can reach: at a December sacrifice the altar-flame suddenly flares, and she reads it as a warning — word goes to a sympathetic magistrate (or the PCs) to strike *now*. In a [[Fated]] Rome the portent feeds the party's Story Point pool. (Historically, Vestals including Fabia — once tried for *incestum* with Catiline himself, and acquitted — did exactly this in 63 BCE.)")]
ver=find(S,lambda b:b.get("type")=="synopsis" and isinstance(b.get("text"),str) and "Gaius Verres" in b["text"])
S[ver]["text"]=L(str(S[ver]["text"]).rstrip()+" This is the archetypal *repetundae* (provincial-extortion) case before the *quaestio de repetundis*, brought — as such cases were — the year after his command ended. Cicero's real victory came not from a grand oration but from burying Verres under witnesses and documents before the delaying tricks could push the trial into next year's friendlier court; the jury's composition (senators vs *equites*) was itself a political prize.")

# ---- Running Imperial Rome ----
R=ch["Running Imperial Rome"]["blocks"]
# religion nuance
kir=find(R,lambda b:b.get("type")=="list" and any("An atheist is unthinkable" in str(x) for x in b.get("items",[])))
items=R[kir]["items"]
for i,it in enumerate(items):
    if "An atheist is unthinkable" in str(it):
        items[i]=L("**Religion is everywhere — but belief varies.** The gods are woven into every public act, and *open* denial is socially radioactive; yet philosophically-grounded disbelief existed — educated Epicureans held the gods indifferent and the soul mortal (Lucretius) and still performed the civic rites. Christians and Jews stand out because they will *not*. The auspices are consulted before almost anything that matters.")
# adoption + household offices after Patron and Client paragraph
pc=find(R,lambda b:isinstance(b.get("text"),str) and b["text"].startswith("Nobody in Rome stands alone"))
R[pc+1:pc+1]=[p("**Adoption and the household.** A great family is a going concern — a name, its cults, and its capital — and adoption was the tool used to preserve it; the age this book defaults to is the era of the *adoptive emperors* (Nerva to Hadrian). An heirless senator who adopts a PC (or a rival's son) transfers Dignitas and obligations at a stroke, and a contested adoption or a disputed will is a whole campaign frame. Within the *domus*, the working household has its own offices — the *vilicus* (overseer) and *vilica* (housekeeper) run the estate and its cult under a quasi-moral code — ready-made authority, and ready-made friction, for Slave and Freedman characters.")]
# Sources & Further Reading at end of chapter
R.append(mk(type="h3", text="Sources & Further Reading"))
R.append(p("This supplement stands on real scholarship. For GMs who want to dig deeper — or settle a table argument — these are good next steps, Imperial sources starred where the setting's own era is best served."))
R.append(mk(type="list", items=CS([
  L("**Republic & its fall** — Mommsen, *The History of Rome*; Watts, *Mortal Republic*; Marin, *Blood in the Forum*; Beard, *SPQR* \u2605."),
  L("**Oratory, the contio & assemblies** — Morstein-Marx, *Mass Oratory and Political Power*; van der Blom, *Oratory and Political Career in the Late Roman Republic*; Botsford, *The Roman Assemblies*."),
  L("**Senate & magistracies** — Pi\u00f1a Polo, *The Consul at Rome*; Sandberg, *Magistrates and Assemblies*; Talbert, *The Senate of Imperial Rome* \u2605."),
  L("**Law & the courts** — Alexander, *Trials in the Late Roman Republic*; Robinson, *The Criminal Law of Ancient Rome* \u2605."),
  L("**Religion & augury** — Driediger-Murphy, *Roman Republican Augury*; Wildfang, *Rome's Vestal Virgins*; Beard, North & Price, *Religions of Rome* \u2605."),
  L("**Philosophy** — Seneca (Hadas, ed.), *Stoic Philosophy of Seneca*; Lucretius, *On the Nature of Things*."),
  L("**Household, slavery & family** — Draycott, *Roman Domestic Medical Practice*; Cato & Varro, *Roman Farm Management*; Bradley, *Slavery and Society at Rome* \u2605; McCall, *Clan Fabius*."),
  L("**Empire, patronage & informers** — Millar, *The Emperor in the Roman World* \u2605; Saller, *Personal Patronage under the Early Empire* \u2605; Rutledge, *Imperial Inquisitions* \u2605 (the *delatores*)."),
  L("**Arena & games** — Fagan, *The Lure of the Arena* \u2605; Futrell, *Blood in the Arena* \u2605."),
  L("**Comparative empire** — Scheidel (ed.), *Rome and China* \u2605."),
])))

# ---- Patrician archetype counter-lever ----
C1=ch["Chapter 1: Character Creation"]["blocks"]
pat=find(C1,lambda b:b.get("type")=="statblock" and b.get("name")=="Patrician")
for f in C1[pat]["fields"]:
    if f.get("label")=="The Weight of Ancestors":
        f["text"]=L(str(f["text"]).rstrip()+" An opponent who publicly exposes a *fabricated* ancestor (the funeral *laudationes* were notorious for invented triumphs and false consulships) turns this against you — the [[advantage]] [[advantage]] becomes lost Dignitas for the scene, a natural use for a Dossier of Dirt.")

# ---- Toga Candida era note ----
G=ch["Chapter 2: Gear and Vehicles"]["blocks"]
repl_text(G,"**Toga Candida.** The artificially whitened toga",
 "**Toga Candida.** The artificially whitened toga of the *candidatus*; adds [[boost]] to canvassing and public social checks and marks you, for better or worse, as a man seeking office. *(The whitened toga and tribal canvassing belong to Republican elections; under the emperors magistrates are chosen by the Senate and the emperor's* commendatio*, so in High-Empire play this marks a man lobbying the* princeps *and his* amici*.)* — *Encumbrance 2 · 150 HS · Rarity 3.*")

yaml.dump(doc, open("content.yaml","w"))
print("edits applied OK")
print("Adversaries forum statblocks now:", [b.get("name") for b in A if b.get("type")=="statblock"][-6:])
