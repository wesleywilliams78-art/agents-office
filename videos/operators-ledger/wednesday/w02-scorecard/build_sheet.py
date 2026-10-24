"""Builds the gated multi-site street scorecard for The Operator's Toolkit, Wednesday 2 (Porter's five forces, Episode 02).
Branded to match Wesley's Wednesday 1 sheet through ../wrw_brand.py.
Run: python build_sheet.py  ->  WRW-Toolkit-02-Scorecard-for-every-site.xlsx (then recalculate through LibreOffice)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
import wrw_brand as B

OUT = "WRW-Toolkit-02-Scorecard-for-every-site.xlsx"
F = B.F
GBP = '£#,##0;(£#,##0);-'
PCT = '0.0%;(0.0%);-'
FIRST, LAST = 6, 25
LAST_COL = 18  # R, the hidden helper

wb = Workbook()
ws = wb.active
ws.title = "Scorecard"
B.band(ws, "Street scorecard for every site and lease",
       "The Operator's Toolkit · Wednesday 2 · from The Operator's Ledger, Episode 2: Five forces · WRW Hospitality", LAST_COL)
ws["A3"] = ("Fill in the white cells (blue text). Score each force 1 to 5 for the street, using the Scoring guide tab: 1 = the force is weak, good for you; "
            "5 = strong, it takes a cut. Rows 6 and 7 are Street A and Street B from the episode: overwrite them.")
ws["A3"].font = Font(name=F, size=9.5, color=B.INK)
ws.row_dimensions[3].height = 24
ws.cell(row=4, column=4, value="FIVE FORCES: 1 (weak) to 5 (strong)").font = B.group_font
ws.cell(row=4, column=9, value="RESULTS").font = B.group_font
ws.cell(row=4, column=13, value="THE MONEY (optional, from Toolkit 1)").font = B.group_font
ws.row_dimensions[4].height = 19.5

INPUTS = {1, 2, 3, 4, 5, 6, 7, 8, 13, 14, 17}
headers = [("Site or lease option", 20), ("Type", 14), ("Street or area", 18),
           ("Suppliers (1–5)", 10), ("Buyers (1–5)", 10), ("Substitutes (1–5)", 11), ("New entrants (1–5)", 11), ("Rivals (1–5)", 10),
           ("Total (5–25)", 9), ("Reading", 12), ("Strongest force", 14), ("Rank (1 = toughest street)", 11),
           ("Forecast weekly sales (£)", 13), ("Break-even weekly sales (£)", 13), ("Cushion (%)", 10), ("Decision prompt", 34),
           ("Evidence notes", 40), ("Lease option total (helper)", 10)]
for i, (h, wdt) in enumerate(headers, start=1):
    c = ws.cell(row=5, column=i, value=h)
    B.header(c, result=i not in INPUTS)
    ws.column_dimensions[c.column_letter].width = wdt
ws.row_dimensions[5].height = 48
ws.column_dimensions["R"].hidden = True

examples = {
    6: ["Street A (example)", "Lease option", "Commuter high street", 3, 2, 2, 2, 3, 20000, 12258,
        "Rent about 10% of forecast sales; one direct rival; no vacant units nearby. Money from SITE 1 in Episode 1."],
    7: ["Street B (example)", "Lease option", "Residential parade", 5, 4, 4, 4, 4, 13000, 13520,
        "Rent 20% and labour 40% of sales; delivery apps up to 30% of an order; meal deal and office canteen on the path; a TO LET unit opposite; rival café cut £3.40 to £2.90. Money from SITE 10 in Episode 1."],
}
FORCE_NAMES = '{"Suppliers","Buyers","Substitutes","New entrants","Rivals"}'
for r in range(FIRST, LAST + 1):
    e = examples.get(r, [None] * 11)
    for col, v in zip(sorted(INPUTS), e):
        c = ws.cell(row=r, column=col, value=v)
        c.font, c.fill, c.border = B.input_font, B.input_fill, B.box
        c.protection = Protection(locked=False)
        c.number_format = GBP if col in (13, 14) else "General"
        if col == 17:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    R = str(r)
    formulas = {
        9:  f'=IF(COUNT(D{R}:H{R})<5,"",SUM(D{R}:H{R}))',
        10: f'=IF(I{R}="","",IF(I{R}<=12,"Favourable",IF(I{R}<=18,"Workable","Hostile")))',
        11: f'=IF(I{R}="","",INDEX({FORCE_NAMES},MATCH(MAX(D{R}:H{R}),D{R}:H{R},0)))',
        12: f'=IF(I{R}="","",RANK(I{R},$I${FIRST}:$I${LAST},0))',
        15: f'=IF(OR(M{R}="",N{R}="",M{R}=0),"",(M{R}-N{R})/M{R})',
        16: (f'=IF(I{R}="","",IF(AND(J{R}="Hostile",O{R}<>"",O{R}<0.1),"Walk away, or renegotiate the rent first",'
             f'IF(J{R}="Hostile","Only with a lower rent or fit-out: the street will take its cut",'
             f'IF(AND(O{R}<>"",O{R}<0.1),"Thin cushion: stress-test the break-even","Proceed: watch the strongest force"))))'),
        18: f'=IF(AND(B{R}="Lease option",I{R}<>""),I{R},"")',
    }
    for col, fml in formulas.items():
        c = ws.cell(row=r, column=col, value=fml)
        c.font, c.fill, c.border = B.calc_font, B.calc_fill, B.box
        c.number_format = {9: "0", 12: "0", 15: PCT, 18: "0"}.get(col, "General")
        if col == 16:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[r].height = 30
for r in examples:
    ws.row_dimensions[r].height = 64

ws.freeze_panes = "D6"
dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", showErrorMessage=True, error="Score each force from 1 (weak) to 5 (strong).")
ws.add_data_validation(dv); dv.add(f"D{FIRST}:H{LAST}")
dvt = DataValidation(type="list", formula1='"Existing site,Lease option"', allow_blank=True)
ws.add_data_validation(dvt); dvt.add(f"B{FIRST}:B{LAST}")
ws.conditional_formatting.add(f"J{FIRST}:J{LAST}", FormulaRule(formula=[f'J{FIRST}="Hostile"'], fill=PatternFill("solid", fgColor=B.CRIMSON, bgColor=B.CRIMSON), font=Font(name=F, color=B.WHITE, bold=True)))
ws.conditional_formatting.add(f"J{FIRST}:J{LAST}", FormulaRule(formula=[f'J{FIRST}="Workable"'], font=Font(name=F, color=B.CRIMSON, bold=True)))
ws.conditional_formatting.add(f"D{FIRST}:H{LAST}", FormulaRule(formula=[f'AND(D{FIRST}<>"",D{FIRST}>=4)'], font=Font(name=F, color=B.CRIMSON, bold=True)))
ws.conditional_formatting.add(f"O{FIRST}:O{LAST}", FormulaRule(formula=[f'AND(O{FIRST}<>"",O{FIRST}<0)'], font=Font(name=F, color=B.CRIMSON)))
for cell, text in {
    "D5": "Food and drink suppliers, the landlord and the labour market. See the Scoring guide tab.",
    "E5": "How much guests and channels (delivery apps) can push your price down or take a cut.",
    "F5": "What else meets the same need on the guest's path: meal deals, canteens, home.",
    "G5": "How easily a new rival could open nearby: vacant units, low barriers.",
    "H5": "Direct rivals already trading nearby, and how hard they compete on price.",
    "I5": "5–12 favourable, 13–18 workable, 19–25 hostile.",
    "N5": "From Toolkit 1 (break-even for every site). For a lease option, use the forecast fixed and variable costs.",
    "O5": "How far sales could fall before the site stops paying for itself.",
}.items():
    ws[cell].comment = Comment(text, "WRW Hospitality")
ws["A27"] = "Examples (rows 6 and 7) are illustrative: Street A and Street B from The Operator's Ledger Episode 2, with the money from SITE 1 and SITE 10 in Episode 1."
ws["A27"].font = B.note_font
B.sign_off(ws, 29)
B.background(ws, LAST_COL, 30)
B.finish(ws, landscape=True, print_rows="$5:$5", page_numbers=True)

# ---------------- Scoring guide ----------------
gd = wb.create_sheet("Scoring guide")
B.band(gd, "How to score each force",
       "Score the street, not the site. Walk it at the hour you'd trade. 1 = weak (good for you); 5 = strong (it takes a cut); 2 and 4 sit between.", 5)
guide = [
    ("Suppliers: food, the landlord, labour",
     "Rent under 10% of forecast sales; easy to hire; two or more suppliers for key lines",
     "Rent 10–15% of sales; some hiring difficulty; one main supplier with alternatives",
     "Rent 20% or more of sales, upward-only reviews; hard to hire locally; one supplier for key lines",
     "Rent ÷ forecast sales; local job ads still open after 4 weeks; supplier list"),
    ("Buyers: guests and delivery apps",
     "Guests choose you for the offer, not the price; delivery under 10% of sales",
     "Some price comparison; delivery 10–25% of sales",
     "Guests compare on price every visit; delivery apps 25% or more of sales",
     "Menu prices within 3 minutes' walk; channel mix from the till"),
    ("Substitutes: other ways to meet the same need",
     "Nothing comparable on the guest's path",
     "One substitute nearby: a supermarket meal deal or an office canteen",
     "Several cheaper substitutes on the guest's path: supermarket, canteen, food hall",
     "Walk the route guests take at your peak hour"),
    ("New entrants: how easily a rival could open",
     "No vacant units nearby; high fit-out cost; restrictive planning",
     "One or two vacant units nearby",
     "Several vacant units that could open as a café quickly, at low rents",
     "Count TO LET boards within 3 minutes' walk; ask the agent about use class (England: Class E)"),
    ("Rivals: who's already trading",
     "No direct rival within 3 minutes' walk",
     "One or two rivals with a different offer or price point",
     "Three or more direct rivals, or one discounting hard",
     "Count same-offer sites; note their prices and any offers"),
]
for i, h in enumerate(["Force", "Scores 1: weak", "Scores 3: middle", "Scores 5: strong", "Evidence to check"], start=1):
    B.header(gd.cell(row=4, column=i, value=h), result=(i == 4))
gd.row_dimensions[4].height = 24
for r, row in enumerate(guide, start=5):
    for i, v in enumerate(row, start=1):
        c = gd.cell(row=r, column=i, value=v)
        c.font = Font(name=F, size=10, bold=(i == 1), color=B.INK)
        c.fill, c.border = PatternFill("solid", fgColor=B.WHITE), B.box
        c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
    gd.row_dimensions[r].height = 62
for col, wdt in zip("ABCDE", (28, 34, 34, 38, 36)):
    gd.column_dimensions[col].width = wdt
gd["A11"] = "Reading the total: 5–12 favourable · 13–18 workable, price the forces into your plan · 19–25 hostile, the street needs more sales just to stand still."
gd["A11"].font = Font(name=F, size=10, bold=True, color=B.INK)
gd["A12"] = "The rent and channel thresholds are rules of thumb for scoring, not industry statistics. Adjust them to your format."
gd["A12"].font = B.note_font
B.sign_off(gd, 14)
B.background(gd, 5, 15)
B.finish(gd, landscape=True)

# ---------------- Group ----------------
g = wb.create_sheet("Group")
B.band(g, "The group at a glance", "Calculated from the Scorecard tab. Score your existing sites too: the force with the highest average is costing the whole business.", 3)
S = "Scorecard!"
rows = [("Streets scored", f"=COUNT({S}I{FIRST}:I{LAST})", "0", False),
        ("Hostile", f'=COUNTIF({S}J{FIRST}:J{LAST},"Hostile")', "0", True),
        ("Workable", f'=COUNTIF({S}J{FIRST}:J{LAST},"Workable")', "0", False),
        ("Favourable", f'=COUNTIF({S}J{FIRST}:J{LAST},"Favourable")', "0", False)]
for i, f in enumerate(["Suppliers", "Buyers", "Substitutes", "New entrants", "Rivals"]):
    col = "DEFGH"[i]
    rows.append((f"Average score: {f}", f'=IF(COUNT({S}{col}{FIRST}:{col}{LAST})=0,"",AVERAGE({S}{col}{FIRST}:{col}{LAST}))', "0.0", False))
rows += [("The force that hurts the group most", f'=IF(B4=0,"",INDEX({FORCE_NAMES},MATCH(MAX(B8:B12),B8:B12,0)))', "General", True),
         ("Best lease option (lowest total)", f'=IF(COUNT({S}R{FIRST}:R{LAST})=0,"",INDEX({S}A{FIRST}:A{LAST},MATCH(MIN({S}R{FIRST}:R{LAST}),{S}R{FIRST}:R{LAST},0)))', "General", True),
         ("Its total", f'=IF(COUNT({S}R{FIRST}:R{LAST})=0,"",MIN({S}R{FIRST}:R{LAST}))', "0", False)]
for i, (label, fml, fmt, key) in enumerate(rows, start=4):
    a = g.cell(row=i, column=1, value=label)
    b = g.cell(row=i, column=2, value=fml)
    a.font = Font(name=F, size=10, bold=key, color=B.INK)
    b.font, b.number_format = Font(name=F, size=10, bold=key, color="008000"), fmt
    a.fill = b.fill = PatternFill("solid", fgColor=B.RESULT if key else B.WHITE)
    a.border = b.border = B.box
    g.row_dimensions[i].height = 21.75
g.column_dimensions["A"].width = 44; g.column_dimensions["B"].width = 24; g.column_dimensions["C"].width = 3
B.sign_off(g, 18)
B.background(g, 3, 19)
B.finish(g, landscape=False)

# ---------------- How to use ----------------
h = wb.create_sheet("How to use")
B.band(h, "How to use this across a group", None, 2)
h.column_dimensions["A"].width = 112; h.column_dimensions["B"].width = 3
steps = [
    "1. Score every existing site's street, not just the options you're weighing. It shows which force is already eating your margin.",
    "2. Walk each street at your peak trading hour, with the Scoring guide open. Write the evidence in the notes column: a score without evidence is a guess.",
    "3. Add forecast sales and break-even from Toolkit 1. A hostile street with a thin cushion is the one to walk away from.",
    "4. Read the Group tab: the force with the highest average is the one to work on across the whole business.",
    "5. Re-score every six months. Streets change: a new rival, a rent review, a vacant unit filled.",
    "",
    "Wesley's note (to be written by Wesley): the force he would look at first on a new street, and why.",
]
for i, t in enumerate(steps, start=3):
    c = h.cell(row=i, column=1, value=t)
    c.font = Font(name=F, size=11, color=B.INK)
    c.fill = PatternFill("solid", fgColor=B.WHITE)
    c.alignment = Alignment(wrap_text=True, vertical="center", indent=1)
    h.row_dimensions[i].height = 30
c = h.cell(row=11, column=1, value="Weighing a lease right now? Message Wesley Williams on LinkedIn: WRW Hospitality helps multi-site operators decide where to open next.")
c.font, c.fill = Font(name=F, size=11, bold=True, color=B.WHITE), PatternFill("solid", fgColor=B.RED)
c.alignment = Alignment(vertical="center", indent=1); h.row_dimensions[11].height = 30
h["A12"] = "Scores and examples are illustrative. This tool is general guidance, not financial or property advice."
h["A12"].font = B.note_font
B.sign_off(h, 14)
B.background(h, 2, 15)
B.finish(h, landscape=True)

B.properties(wb, "Street scorecard for every site · The Operator's Toolkit", "five forces, scorecard")
wb.save(OUT)
print("saved", OUT)
