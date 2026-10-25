#!/usr/bin/env python3
"""Rewrite the 'Setting Overview' chapter: replace the grandiose tropes sections with a
plain, documentary account of real Roman social reality (status, slavery, patronage, law,
the crowd), each key claim carrying a short verbatim source quote + a numbered endnote.
Keeps the functional game content (Technology Level onward) untouched; appends a Notes block.
Quotes are short and attributed; verbatim ones come from public-domain texts (Mommsen trans.
Dickson; Cato trans. Harrison) with one short fair-use line from Seneca; Marin/Millar cited."""
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString as L
from ruamel.yaml.comments import CommentedMap as CM, CommentedSeq as CS

yaml=YAML(); yaml.preserve_quotes=True; yaml.width=100000; yaml.allow_unicode=True
def mk(**kw):
    m=CM()
    for k,v in kw.items(): m[k]=(L(v) if isinstance(v,str) and len(v)>88 else v)
    return m
def h3(t): return mk(type="h3",text=t)
def p(t,style="body"): return mk(type="p",style=style,text=t)

lead=("Rome was less a nation than a legal order laid over tens of millions of people, and a "
 "person's place in it was fixed less by what they did than by what they were \u2014 free or "
 "enslaved, citizen or foreigner, the head of a household or someone owned by one. What follows "
 "sets out, plainly, the realities of that order; the chapters after it turn them into mechanics.")

status=("Birth set the baseline, not achievement. At the centre of every household stood the "
 "*paterfamilias*, its eldest living male, holding *patria potestas* \u2014 a power over children and "
 "dependants that the law scarcely limited. Mommsen puts it without softening: a father \u201cmight "
 "convey his son as well as his slave in property to a third person,\u201d and \u201cin reality the paternal "
 "and marital power was subject to no legal restrictions at all.\u201d{{1}} Above the household, society "
 "was banded into fixed orders \u2014 senatorial, equestrian, ordinary citizen, freedman, free "
 "non-citizen, slave \u2014 and a Roman judged a stranger's rank from dress, name, and retinue before "
 "either of them spoke.")

slavery=("Slaves were property, \u201clooked upon in law as the property of the household and not as "
 "members of it.\u201d{{2}} The farming manuals treat them exactly so: Cato, listing what a prudent "
 "owner should clear out each year, ends with \u201cthe old and sick slaves, and if any thing else is "
 "superfluous you should sell that. The appetite of the good farmer is to sell, not to buy.\u201d{{3}} "
 "That the Stoic Seneca had to argue the contrary \u2014 \u201c\u2018They are slaves\u2019\u2014no, men\u201d{{4}} \u2014 shows "
 "how total the ordinary contempt was. A freed slave (*libertus*) became a citizen, but still owed "
 "duties, and deference, to the master who had owned him.")

patronage=("Roman society was tied together, top to bottom, by *clientela*. The client (*cliens*) "
 "came to his patron's house for the morning *salutatio*, lent him votes, voice, and presence, and "
 "received protection, legal backing, loans, and introductions in return. The bond was sworn and "
 "sacred, not a mere bargain: from the earliest law, Mommsen notes, \u201cif a patron violated his "
 "obligation to keep faith with his \u2026 dependent, the civil law had no penalty for such outrages, "
 "but the burden of the curse of the gods lay thenceforth on the head of the offender.\u201d{{5}}")

law=("Roman law did not pretend to treat everyone alike; it was built on rank. A citizen could not "
 "lawfully be flogged or crucified, and could appeal against a magistrate's sentence; a slave had no "
 "legal person at all, and a slave's evidence was admissible only when extracted under torture. The "
 "principle \u201cof the slave being completely destitute of legal rights,\u201d Mommsen writes, \u201cwas "
 "maintained by the Romans with merciless rigour, and carried out to all its consequences.\u201d{{6}} "
 "The same act \u2014 a blow, a theft, a killing \u2014 carried wholly different consequences according to "
 "who did it, and to whom.")

crowd=("The city of Rome held perhaps a million people, most of them poor and many idle. The free "
 "citizens among them were a political force in their own right: they voted in the assemblies, could "
 "be courted with grain-doles and games or inflamed in the Forum, and, in the Republic's last "
 "century, were organised into the street-gangs that rival politicians turned on one another.{{7}} "
 "The \u201cbread and circuses\u201d a later satirist sneered at were less decadence than statecraft \u2014 the "
 "standing cost of keeping a vast, armed-when-it-chose population quiet.")

era=("This book is set under the Principate, two generations into rule by one man. The outward "
 "machinery had shifted \u2014 genuine elections had passed from the people to the Senate, and the "
 "*princeps* now sat at the apex of patronage \u2014 but the substance beneath did not. Status by birth, "
 "chattel slavery, the *salutatio*, and *patria potestas* all outlived the Republic by centuries; "
 "the sources quoted above describe that enduring order, and this setting runs on it.")

notes=[
 "Theodor Mommsen, *The History of Rome*, trans. W. P. Dickson \u2014 on *patria potestas*, the power of the household head.",
 "Mommsen, *The History of Rome* (Dickson) \u2014 on the legal standing of slaves as property of the household.",
 "Cato the Elder, *De Agri Cultura* 2, trans. Fairfax Harrison, *Roman Farm Management* (1913).",
 "Seneca, *Epistulae Morales ad Lucilium* (*Moral Letters*) 47.",
 "Mommsen, *The History of Rome* (Dickson) \u2014 the archaic law of client-faith; cf. the Twelve Tables, *patronus si clienti fraudem fecerit, sacer esto*.",
 "Mommsen, *The History of Rome* (Dickson) \u2014 on the slave's total absence of legal rights.",
 "On the urban crowd as a political actor: Pamela Marin, *Blood in the Forum: The Struggle for the Roman Republic*; and Fergus Millar, *The Crowd in Republican Rome* (1998).",
]

realities=[p(lead,"lead"),
 h3("A World Run on Status"), p(status),
 h3("Slavery"), p(slavery),
 h3("Patronage"), p(patronage),
 h3("The Law"), p(law),
 h3("The Crowd"), p(crowd),
 p(era)]

doc=yaml.load(open("content.yaml"))
ch=next(c for c in doc["chapters"] if str(c["title"])=="Setting Overview")
old=list(ch["blocks"])
tech_idx=next(i for i,b in enumerate(old) if b.get("type")=="h3" and str(b.get("text"))=="Technology Level")
kept=old[tech_idx:]  # Technology Level -> Species (functional game content, untouched)
endnotes=mk(type="endnotes",title="Notes",items=CS([L(n) if len(n)>88 else n for n in notes]))
ch["blocks"]=CS(realities+kept+[endnotes])
yaml.dump(doc,open("content.yaml","w"))
print("Setting Overview blocks:",len(ch["blocks"]),"| dropped tropes:",tech_idx,"| kept:",len(kept),"| notes:",len(notes))
