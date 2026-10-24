#!/usr/bin/env python3
"""Add two chapters to The Eternal City, sourced from the ~/Documents/rome wiki:
 - 'A Gazetteer of the Roman World': the City by districts (diegetic regiones/quarters)
   and the Empire by provinces, a la Android: Shadow of the Beanstalk's New Angeles.
 - 'Dramatis Personae': named NPC stat blocks drawn from the wiki's figures.
Inserted before 'Common Terms'."""
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM, CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
doc=yaml.load(open("content.yaml"))
def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=(L(v) if isinstance(v,str) and len(v)>90 else v)
    return m
def h3(t): return mk(type="h3",text=t)
def p(t,style="body"): return mk(type="p",style=style,text=t)

# ---------- City districts ----------
CITY=[
 ("Forum Romanum","the Forum","The paved heart of the city, in the valley below the Palatine and Capitoline. Temples, law-courts, shops, and senators jostle along the Via Sacra; at its head stand the *curia* (senate house), the *comitium*, and the *rostra* from which speakers work the crowd.","Every public drama happens here — elections, *contiones*, trials, the funerals of the great — and so does the bloodshed: more than one Roman generation has seen the Forum run red. Stage speeches, riots, and assassinations here."),
 ("The Palatine","Palatium","The hill above the Forum, the most fashionable address in Rome — dense with senatorial *domus* rather than tenements, and hung with the myth of Romulus, whose reed hut was piously preserved here.","Under the emperors this is *the* imperial residence (the word *palace* is its name); in the default era it is the seat of the ruling house. A PC invited up the Palatine has arrived — or is walking into a trap."),
 ("The Capitoline","Capitolium & the arx","The steep citadel-hill looming over the Forum, crowned by the great Temple of Jupiter Optimus Maximus and the Temple of Concord; its northern summit, the *arx*, holds the *auguraculum* where the augurs read the sky.","The religious summit of the state: consuls take office and triumphs end here with a sacrifice to Jupiter. It has also been a killing-ground. A natural site for an omen, a vow, or a last stand."),
 ("The Subura","Subura","The crowded, low-lying warren between the Esquiline, Viminal, and Quirinal: teetering *insulae*, workshops, taverns, brothels, and markets, loud and filthy and perpetually about to catch fire. Even Caesar grew up here.","Rome's great slum and underworld — the place for a fence, a hired knife, a safe house, or a chase across the rooftops. Fire is always one spark away."),
 ("The Aventine","Mons Aventinus","The hill south of the Forum, outside the old pomerium — Marin's sources call it flatly \u201cthe region of the plebs.\u201d Home to the cults of Ceres and Diana and to the long memory of plebeian revolt; Gaius Gracchus made his last armed stand here.","The people's hill, the counterweight to the Palatine. Where a tribune raises the mob, where a secession begins, where the poor have numbers on their side."),
 ("The Esquiline, Quirinal, Viminal & Caelian","the lesser hills","The remaining canonical hills: the Esquiline a place of contrasts (old paupers' graveyards on its edge, luxury *horti* within); the Quirinal a respectable temple-dotted ridge; the Viminal the quiet, small one; the Caelian a mixed quarter growing ever more aristocratic toward the Colosseum valley.","Good \u201cfiller\u201d districts — residential, mixed, each with a different social flavour. Drop a patron's *domus*, a philosopher's rented rooms, or a quiet murder here."),
 ("The Campus Martius","the Field of Mars","The broad Tiber-bend plain *outside* the pomerium, sacred to Mars: muster-ground and drill-field, the *ovile* where the centuriate assembly votes, and the temples (Apollo, Bellona) where the Senate meets generals who may not enter the city under arms.","The threshold between war and the city. Armies assemble here, triumphs form up here, and a general who wants his triumph waits here — barred, like his soldiers, from crossing the sacred line."),
 ("Transtiberim","Trans Tiberim","The working quarter on the right bank, across the river: docks, warehouses, tanneries, and a mixed immigrant population — Jews, Syrians, and sailors — connected by the bridges and the island. Augustus's fourteenth region.","The \u201cwrong side of the river\u201d: the port economy, foreign cults, smuggling, and communities that keep their own customs. A place to land cargo quietly or vanish into a crowd."),
 ("The Markets: Boarium, Velabrum & Argiletum","the trade quarters","The commercial connective tissue of the lower city: the Forum Boarium (cattle market and river port beside the ancient temples of Hercules and Portunus), the Velabrum (a corridor of food- and oil-sellers), and the Argiletum (the \u201cbook street\u201d of booksellers and craftsmen running up toward the Subura).","Where goods and gossip change hands. Shops, warehouses, a bookseller who copies more than he should, and the river wharves where everything enters the city."),
 ("The Circus Maximus","Circus Maximus","The vast chariot-racing arena in the valley between Palatine and Aventine, ringed by shops, food-stalls, and bars, seating a crowd that can be counted in the hundreds of thousands.","The one place the whole city gathers and the ruler must show his face. Run the races (see *The Arena & the Races*), and remember that a crowd this size is a political force — acclamation here is the Imperial *contio*."),
]

gaz=[p("Rome is two geographies at once: the city within the walls, carved into *regiones* and *vici*, and the empire beyond, carved into *provinciae*. This gazetteer gives you both at a glance \u2014 enough to place a scene, name a street, or send the party to the edge of the world.","lead"),
  h3("The City: Regiones & Quarters"),
  p("Augustus divided the city into **fourteen *regiones*** (numbered regions), each cut into **_vici_** (neighborhood wards with their own local officials and crossroads shrines). Romans still navigate by the older landmarks, though \u2014 the seven hills, the Forum, and the river. Use *regio* as the in-world word for \u201cdistrict\u201d and *vicus* for \u201cneighborhood.\u201d")]
for name,lat,desc,hook in CITY:
    gaz.append(p(f"**{name} (*{lat}*).** {desc} *{hook}*"))
gaz.append(mk(type="sidebar", title="The Pomerium: Rome's Sacred Line",
  text=L("The **pomerium** is not a wall but a line \u2014 the augurally-defined sacred boundary that separates the *urbs* (the holy city) from the *ager* (the land outside). It is the master rule of Roman space. Inside it, military *imperium* cannot be exercised: soldiers may not march under arms, weapons are set aside, a general lays down his command, and the dead may not be buried. Crossing it changes a magistrate's powers and his dress. This is why a triumph-seeking general and his army wait on the Campus Martius, why the Senate meets commanders in temples outside the line, and why an armed intrusion into the city is not a mere crime but a sacrilege \u2014 a fact worth a whole adventure.")))

# ---------- Provinces ----------
gaz.append(h3("The Provinces of the Empire"))
gaz.append(p("To a Roman of the Republic, a *provincia* was not a place but a **task** \u2014 a sphere of command the Senate handed a magistrate: an army, a named enemy, an enemy homeland. Only slowly did the word harden into *territory*. By the age of the emperors the empire is a collection of provinces, and they come in two kinds, plus one that is neither."))
gaz.append(mk(type="list", items=CS([
  L("**Imperial provinces** \u2014 the frontier commands where the legions stand. They are the emperor's, run for him by a *legatus Augustus pro praetore* who serves at his pleasure. Power, danger, and armies live here."),
  L("**Senatorial provinces** \u2014 the pacified interior, allotted by the Senate to an ex-consul or ex-praetor as *proconsul* for a single year, usually with no legion. Wealth and prestige, little force."),
  L("**Aegyptus (Egypt)** \u2014 neither: the emperor's private domain, run by an equestrian prefect. No senator may even enter without his leave, for whoever holds Egypt's grain holds Rome by the throat."),
])))
PROV=[
 ("Italia","the core, not a province","The citizen heartland \u2014 no tribute, no governor, source of soldiers and legitimacy. Inside it lies Rome, and inside Rome the pomerium.","Soldiers, legitimacy, grain, and the senatorial class itself."),
 ("Sicilia","senatorial","Rome's first overseas conquest, a quiet grain-island of old Greek and Punic cities, long past its war-front days \u2014 but it remembers its slave revolts.","Grain for the city, and the quiet corruption of the grain fleet."),
 ("Sardinia et Corsica","imperial/senatorial","Mountainous islands whose interior tribes \u2014 the *Barbaria* \u2014 were never truly subdued; a place of banditry, mines, and exiles.","Grain, minerals, and a hold on the western sea."),
 ("Hispania","imperial (Tarraconensis, Lusitania) & senatorial (Baetica)","Rome's hardest school of empire; two centuries of Celtiberian guerrilla war and legendary sieges. Now the greatest mines in the empire honeycomb its hills.","Silver and gold above all, oil from Baetica, and hard northern soldiers."),
 ("Gallia","senatorial (Narbonensis) & imperial (the Three Gauls)","Narbonensis is \u201cItaly outside Italy\u201d; beyond it Caesar's conquered Three Gauls face the Rhine, their druids driven under and their tribes gathered yearly at the great altar of Lugdunum.","Manpower, grain and wine, and the roads to the Rhine and Britain."),
 ("Africa","senatorial (with an imperial legion in Numidia)","The land of destroyed Carthage \u2014 ritually cursed, then refounded \u2014 now booming with oil-rich estates, with desert nomads raiding the frontier road.","Grain and olive oil on a vast scale; the breadbasket beside Egypt."),
 ("Asia","senatorial","Rich western Anatolia, willed to Rome by the last king of Pergamon: a glittering string of proud Greek cities (Ephesus, Pergamon, Smyrna) that still remember the tax-farmers' extortions.","Tax revenue, trade wealth, and the prestige of the richest proconsulship."),
 ("Macedonia et Achaea","senatorial","Greece: a land living on its glorious past \u2014 philosophy, the Games, and the great sanctuaries \u2014 with a still-restless northern frontier against Thracian raiders.","Cultural prestige, tourists and students, and a northern buffer."),
 ("Aegyptus","the emperor's domain","Ancient, bureaucratic, and polyglot along the Nile, crowned by seething Alexandria and temples older than Rome. No senator enters without the emperor's word.","Grain \u2014 a huge share of the city's dole \u2014 plus papyrus, glass, and the Red Sea trade."),
 ("Syria","imperial (great command)","The eastern military command facing Parthia \u2014 several legions far from Rome, every ambitious general's dream and every emperor's fear \u2014 astride the caravan trade through Palmyra.","A strong frontier army, the eastern luxury trade, and the revenues of ancient cities."),
 ("Britannia","imperial","The wild northwestern frontier at the edge of the world: a three-legion island of mist, druids, and the burnt memory of Boudica's revolt. Hadrian's Wall is coming.","Prestige and conquest-glory, metals, hides, slaves \u2014 though many doubt it ever pays for its legions."),
 ("The Rhine & Danube Frontier","imperial (Germania, the Danube provinces)","The empire's armed edge and densest concentration of legions since the lost eagles of Teutoburg: a continuous line of forts facing Germans and Sarmatians, with Trajan's gold-rich Dacia freshly won.","Defense above all \u2014 this is where the army lives \u2014 plus Dacian gold and frontier recruits."),
 ("Iudaea","imperial (equestrian governor, backed by Syria)","A small, turbulent province whose people will die rather than set the emperor's image in their Temple; the Great Revolt ended with that Temple in ashes.","Order and the security of the east, taxes and balsam \u2014 and above all, quiet."),
]
for name,status,desc,want in PROV:
    gaz.append(p(f"**{name}** \u2014 *{status}.* {desc} **Rome wants:** {want}"))
gaz.append(p("**At the table.** Provinces are where careers are made and lost: a governorship is a licence to grow rich (and a *repetundae* trial waiting to happen \u2014 see Scenario II), a frontier command is a springboard to the purple (and to civil war), and the edge of the map is where a campaign can leave the city behind entirely.","small"))

gazetteer_ch=mk(title="A Gazetteer of the Roman World", blocks=CS(gaz))

# ---------- Dramatis Personae ----------
def npc(name,kind,desc,chars,derived,fields):
    return mk(type="statblock",name=name,kind=kind,desc=desc,
      chars=mk(**chars), derived=mk(**derived),
      fields=CS([mk(label=k,text=v) for k,v in fields]))
DP=[p("The great names of the age \u2014 ready to walk into the Republican scenarios in this book, drop in as cameos, or serve as models for the patrons and rivals of your own cast. They are drawn from the research wiki's figures; several make the book's own point that eloquence is only one road to power (Pompey and Marius ruled with almost none).","lead")]
DP.append(npc("Marcus Tullius Cicero","Nemesis",
  "The Republic's greatest orator \u2014 a *novus homo* who climbed to the consulship on his voice alone, and never lets anyone forget it. Vain, brilliant, and politically brave in bursts.",
  dict(Br="1",Ag="2",Int="4",Cun="3",Will="2",Pr="4"),
  dict(Soak="2",**{"W.T.":"13","S.T.":"16","Def (M/R)":"0/1"}),
  [("Motivations","Desire: the Republic (and his own glory). Fear: obscurity and exile. Strength: unmatched eloquence. Flaw: vanity \u2014 flatter him and he talks."),
   ("Skills","Charm 3, Coercion 2, Deception 3, Knowledge (Law) 3, Knowledge (Rome) 3, Leadership 2, Negotiation 3, Vigilance 2."),
   ("Talents","Adversary 2; Master Orator; Nobody's Fool; Captatio Benevolentiae."),
   ("Abilities","**The Superweapon of Eloquence:** once per encounter, when Cicero wins an oratorical appeal he may upgrade its effect twice; on a [[triumph]] he sways the entire audience at a stroke. **Appeal to Pity:** he wins trials with weeping families and bared scars \u2014 add [[boost boost]] to a Pathos appeal."),
   ("At the Table","The advocate for \u2014 or against \u2014 the PCs in any courtroom (Scenario II); the consul racing to expose Catiline (Scenario I). A dangerous ally whose pride is a handle.")]))
DP.append(npc("Marcus Porcius Cato (the Younger)","Nemesis",
  "The incorruptible Stoic, great-grandson of the Censor: rigid, fearless, and theatrically principled \u2014 yet capable of cold pragmatic alliance when the Republic needs it.",
  dict(Br="2",Ag="2",Int="3",Cun="2",Will="5",Pr="3"),
  dict(Soak="3",**{"W.T.":"15","S.T.":"18","Def (M/R)":"0/1"}),
  [("Motivations","Desire: the *mos maiorum* restored. Fear: tyranny and corruption. Strength: integrity no coin can touch. Flaw: rigidity \u2014 he will break before he bends."),
   ("Skills","Coercion 2, Cool 3, Discipline 4, Knowledge (Law) 2, Knowledge (Rome) 3, Leadership 2, Vigilance 2."),
   ("Talents","Adversary 2; Stoic Discipline 2; Filibuster; Consular Gravitas."),
   ("Abilities","**Unbuyable:** immune to bribery and to strain inflicted by insult, temptation, or flattery (*things indifferent*). **The Filibuster:** may talk out the Senate's clock to kill a motion without a vote. **The Good Death:** cornered, he will take his own life rather than submit \u2014 and the gesture only raises his Dignitas."),
   ("At the Table","The conscience of the Senate and the hardest bloc to move (The Theater of Power). Use him to make the players *earn* a vote, or as the Stoic adversary given a name.")]))
DP.append(npc("Gaius Julius Caesar","Nemesis",
  "The colossus: a patrician *popularis* of terrifying energy and charm whose oratory was merely the springboard for the fastest, boldest career Rome ever saw. The people adore him; the optimates are right to be afraid.",
  dict(Br="3",Ag="3",Int="4",Cun="4",Will="3",Pr="4"),
  dict(Soak="4",**{"W.T.":"18","S.T.":"18","Def (M/R)":"1/1"}),
  [("Motivations","Desire: Dignitas above all \u2014 to be first in everything. Fear: to be any man's second. Strength: speed, genius, and the common people's love. Flaw: ambition, and a clemency that spares his killers."),
   ("Skills","Melee 3, Ranged 2, Athletics 2, Charm 3, Coercion 3, Deception 3, Knowledge (Rome) 3, Knowledge (Warfare) 4, Leadership 4, Negotiation 3."),
   ("Talents","Adversary 3; Master Orator; Commanding Presence; Patronus."),
   ("Abilities","**Celeritas:** Caesar takes two actions on his turn where another takes one, in war and in politics alike. **The People's Champion:** against any attempt to check or shame him publicly, the plebs rally \u2014 add [[success]] and [[boost]] to his social checks before a crowd. **The Legions Are His:** his veterans' loyalty is to him, not the state."),
   ("At the Table","The rising threat behind every late-Republican scene; a patron whose favour is intoxicating and ruinous. The event-horizon the whole setting bends toward.")]))
DP.append(npc("Gnaeus Pompeius Magnus","Nemesis",
  "\u201cThe Great\u201d \u2014 Rome's conquering hero, who reached unheard-of commands on military glory and patronage, not words. A reactive, uneasy public speaker who lets his reputation do the talking.",
  dict(Br="3",Ag="3",Int="3",Cun="3",Will="3",Pr="3"),
  dict(Soak="4",**{"W.T.":"20","S.T.":"16","Def (M/R)":"1/1"}),
  [("Motivations","Desire: to be first citizen, and loved for it. Fear: a rival greater than himself (and there is one). Strength: an unmatched military record and a vast clientela. Flaw: vanity and indecision when the crowd is cold."),
   ("Skills","Melee 2, Ranged 2, Leadership 4, Knowledge (Warfare) 4, Coercion 2, Cool 2, Negotiation 2."),
   ("Talents","Adversary 3; Field Commander; Patronus."),
   ("Abilities","**Reputation Precedes Him:** Pompey's Dignitas argues for him \u2014 add an automatic [[success]] to Leadership and first-impression checks. **But No Orator:** he is a reactive speaker; he suffers [[setback]] on improvised oratory before a hostile crowd, and must rely on spectacle, patronage, and his record instead."),
   ("At the Table","The model of the general-statesman \u2014 proof that in Rome standing, not eloquence, often wins the Forum. A patron, a rival, or the looming power behind a command.")]))
DP.append(npc("Lucius Cornelius Sulla","Nemesis",
  "The dictator who first marched a Roman army on Rome and proscribed his enemies by name \u2014 the precedent that haunts every civil war to come. Charming, cruel, and convinced of his own luck.",
  dict(Br="3",Ag="2",Int="3",Cun="4",Will="4",Pr="3"),
  dict(Soak="4",**{"W.T.":"18","S.T.":"18","Def (M/R)":"1/1"}),
  [("Motivations","Desire: to restore the aristocracy's rule \u2014 by terror if need be. Fear: the mob and chaos. Strength: ruthlessness and uncanny fortune. Flaw: cruelty that outlives its usefulness."),
   ("Skills","Melee 3, Ranged 2, Coercion 4, Deception 3, Knowledge (Warfare) 3, Leadership 3, Knowledge (Rome) 2."),
   ("Talents","Adversary 3; Commanding Presence; fearsome reputation."),
   ("Abilities","**Felix (the Fortunate):** once per session Sulla may reroll any one check, trusting his luck. **Proscription:** he can post a name to a public list and make murder legal \u2014 terror that adds [[setback setback]] to anyone who would oppose him openly."),
   ("At the Table","The dark precedent and a towering past (or present) menace for Republican play \u2014 the man who proved the army could take the city.")]))
DP.append(npc("Marcus Antonius (Mark Antony)","Nemesis",
  "The soldier's soldier and crisis careerist: blunt, brave, hard-drinking, a reactive orator who sways troops and mobs with spectacle and plain speech rather than polished rhetoric.",
  dict(Br="4",Ag="3",Int="2",Cun="3",Will="3",Pr="4"),
  dict(Soak="5",**{"W.T.":"20","S.T.":"16","Def (M/R)":"1/1"}),
  [("Motivations","Desire: glory, pleasure, and a great man's favour. Fear: being sidelined. Strength: soldiers love him. Flaw: his appetites \u2014 wine, women, and loyalty to the wrong patron."),
   ("Skills","Melee 3, Ranged 3, Brawl 2, Athletics 2, Charm 2, Coercion 3, Leadership 3, Knowledge (Warfare) 2."),
   ("Talents","Adversary 2; Field Commander; a rousing, reactive speaker."),
   ("Abilities","**The Soldier's Friend:** add [[boost boost]] to rally troops or a crowd with blunt words and spectacle (the funeral oration that turned Rome). **Hard to Keep Down:** reduce Critical Injury results against him by 10 (minimum 1)."),
   ("At the Table","Muscle with a name \u2014 a dangerous ally or enforcer, and the model of the general who leads by swagger rather than Senate-craft.")]))
DP.append(npc("Gaius Marius","Nemesis",
  "The new man from Arpinum who held the consulship an unheard-of seven times, reformed the army, and saved Rome from the northern tribes \u2014 a military genius and a political blunt instrument.",
  dict(Br="4",Ag="3",Int="2",Cun="3",Will="4",Pr="2"),
  dict(Soak="5",**{"W.T.":"22","S.T.":"16","Def (M/R)":"1/1"}),
  [("Motivations","Desire: recognition the nobles deny him. Fear: being despised as a jumped-up peasant. Strength: the legions are his creation and his own. Flaw: no gift for politics or speech \u2014 clumsy and resentful in the Forum."),
   ("Skills","Melee 3, Ranged 2, Athletics 2, Leadership 4, Knowledge (Warfare) 4, Discipline 3, Resilience 3."),
   ("Talents","Adversary 3; Field Commander; Commanding Presence."),
   ("Abilities","**Third Founder of Rome:** in command of an army Marius is nearly unbeatable \u2014 add [[success]] to his Knowledge (Warfare) and Leadership checks in the field. **The New-Model Army:** his landless recruits are loyal to *him*, not the state \u2014 the seed of every civil war to follow. **No Orator:** [[setback setback]] to formal oratory."),
   ("At the Table","The template of the people's general whose soldiers outrank the Senate \u2014 and living proof that Rome can be ruled with a sword and almost no rhetoric at all.")]))
DP.append(npc("Imperator Caesar Augustus","Nemesis",
  "The first citizen \u2014 model for every emperor who follows. He rules absolutely while seeming to rule not at all, having rebuilt one-man power behind the restored forms of the Republic. Patient, cold, and almost impossible to out-wait.",
  dict(Br="1",Ag="2",Int="4",Cun="5",Will="4",Pr="4"),
  dict(Soak="3",**{"W.T.":"16","S.T.":"22","Def (M/R)":"1/2"}),
  [("Motivations","Desire: a stable order \u2014 with himself at its centre. Fear: a return to the chaos of the civil wars. Strength: patience and concealment. Flaw: he must control everything, and trusts almost no one."),
   ("Skills","Charm 3, Coercion 3, Deception 4, Negotiation 4, Knowledge (Rome) 4, Knowledge (Law) 3, Leadership 3, Vigilance 3, Cool 3."),
   ("Talents","Adversary 3; Nobody's Fool 2; Plausible Deniability; Consular Gravitas; Pater Patriae."),
   ("Abilities","**The Mask of the Republic:** Augustus's *known wish* is law \u2014 against any faction he opposes, every check suffers [[setback]] (the Emperor's trump card, made flesh). **The Long Game:** immune to being out-waited or pressured; he can defer any decision without losing face. **Auctoritas Without Equal:** no one in Rome may raise their Dignitas against his in a public contest."),
   ("At the Table","In the default Imperial era his heirs sit the throne \u2014 use Augustus as the template for *your* princeps: the distant, all-seeing power whose favour makes careers and whose suspicion ends them.")]))
dramatis_ch=mk(title="Dramatis Personae", blocks=CS(DP))

# ---------- insert before Common Terms ----------
titles=[str(c["title"]) for c in doc["chapters"]]
idx=titles.index("Common Terms")
doc["chapters"][idx:idx]=[gazetteer_ch, dramatis_ch]
yaml.dump(doc, open("content.yaml","w"))
print("chapters now:", [str(c['title']) for c in doc['chapters']])
print("city districts:",len(CITY),"provinces:",len(PROV),"npcs:",len(DP)-1)
