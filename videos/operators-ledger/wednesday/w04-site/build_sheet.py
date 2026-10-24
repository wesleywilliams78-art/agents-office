"""Builds the gated multi-site profiles sheet for The Operator's Toolkit, Wednesday 4 (STP: segment, target, position, Episode 04).
Branded to match Wesley's Wednesday 1 sheet through ../wrw_brand.py.
Run: python build_sheet.py  ->  WRW-Toolkit-04-Site-profiles-for-every-site.xlsx (then recalculate through LibreOffice)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
import wrw_brand as B

OUT = "WRW-Toolkit-04-Site-profiles-for-every-site.xlsx"
F = B.F
GBP = '£#,##0;(£#,##0);-'
GBP2 = '£#,##0.00;(£#,##0.00);-'
FIRST, LAST = 6, 25
LAST_COL = 21  # U

wb = Workbook()
ws = wb.active
ws.title = "Profiles"
B.band(ws, "Site profiles for every site",
       "The Operator's Toolkit · Wednesday 4 · from The Operator's Ledger, Episode 4: Segment, target, position · WRW Hospitality", LAST_COL)
ws["A3"] = ("Fill in the white cells (blue text) for each site, from its till report and one watch at its peak (see the Profile guide tab). "
            "Everything else calculates. Rows 6 and 7 are SITE 1 and SITE 10 from the episode: overwrite them with your own.")
ws["A3"].font = Font(name=F, size=9.5, color=B.INK)
ws.row_dimensions[3].height = 24
ws.cell(row=4, column=2, value="SEGMENT: who's outside, and when").font = B.group_font
ws.cell(row=4, column=7, value="TARGET: the peak, in numbers").font = B.group_font
ws.cell(row=4, column=11, value="THE MONEY (from Toolkit 1)").font = B.group_font
ws.cell(row=4, column=13, value="RESULTS: position it").font = B.group_font
ws.row_dimensions[4].height = 19.5

INPUTS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 21}
headers = [("Site", 18), ("Street type", 16), ("Busiest days", 12), ("Busiest hours", 12), ("Main guest at the peak", 16),
           ("In a hurry or staying?", 12), ("Guests at the peak, a week", 11), ("Spend a head now (£)", 10), ("Spend a head to test (£)", 10),
           ("Offer at the peak today", 13), ("Weekly sales (£)", 11), ("Break-even weekly sales (£)", 12),
           ("Offer fits the guest?", 11), ("Upside a week (£)", 11), ("Upside a year (£)", 11), ("Weekly sales with the upside (£)", 12),
           ("Break-even?", 13), ("Rank (1 = biggest upside)", 10), ("Positioning line", 40), ("What to do", 36), ("Notes: what you saw", 34)]
for i, (h, wdt) in enumerate(headers, start=1):
    c = ws.cell(row=5, column=i, value=h)
    B.header(c, result=i not in INPUTS)
    ws.column_dimensions[c.column_letter].width = wdt
ws.row_dimensions[5].height = 60

examples = {
    6: ["SITE 1 (example)", "Station or transport", "weekdays", "7 to 9am", "Commuters", "In a hurry", 1000, 6, 6, "Grab-and-go", 20000, 12258,
        "Queue out of the door at 8am; nearly everything to go. Guest count is illustrative."],
    7: ["SITE 10 (example)", "Residential", "Saturdays", "late morning", "Locals", "Staying", 200, 7, 11, "Grab-and-go", 13000, 13520,
        "Tables full on Saturday mornings, guests stay an hour, but the menu is SITE 1's coffee and pastry to go."],
}
for r in range(FIRST, LAST + 1):
    e = examples.get(r, [None] * 13)
    for col, v in zip(sorted(INPUTS), e):
        c = ws.cell(row=r, column=col, value=v)
        c.font, c.fill, c.border = B.input_font, B.input_fill, B.box
        c.protection = Protection(locked=False)
        c.number_format = {8: GBP2, 9: GBP2, 11: GBP, 12: GBP}.get(col, "General")
        if col == 21:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    R = str(r)
    formulas = {
        13: (f'=IF(OR(F{R}="",J{R}=""),"",IF(OR(AND(F{R}="In a hurry",J{R}="Sit-down"),AND(F{R}="Staying",J{R}="Grab-and-go")),"Mismatch",'
             f'IF(OR(F{R}="Mixed",J{R}="Mixed"),"Check","Fits")))'),
        14: f'=IF(OR(G{R}="",H{R}="",I{R}=""),"",G{R}*(I{R}-H{R}))',
        15: f'=IF(N{R}="","",N{R}*52)',
        16: f'=IF(OR(K{R}="",N{R}=""),"",K{R}+N{R})',
        17: (f'=IF(OR(K{R}="",L{R}=""),"",IF(K{R}>=L{R},"Above now",IF(AND(P{R}<>"",P{R}>=L{R}),"Crosses with the upside","Still below")))'),
        18: f'=IF(N{R}="","",RANK(N{R},$N${FIRST}:$N${LAST},0))',
        19: (f'=IF(OR(A{R}="",E{R}="",C{R}=""),"",A{R}&" is for "&LOWER(E{R})&" on "&C{R}&IF(D{R}="",""," ("&D{R}&")")'
             f'&IF(F{R}="In a hurry",", in a hurry.",IF(F{R}="Staying",", who stay.","."))'),
        20: (f'=IF(M{R}="","",IF(M{R}="Mismatch","Set the menu, hours and rota at the peak for "&LOWER(E{R})&". Test it for four weeks",'
             f'IF(AND(N{R}<>"",N{R}>0),"Test the higher-spend offer at the peak for four weeks",'
             f'IF(M{R}="Check","Watch the peak again: who is it really for?","It fits. Re-check each quarter"))))'),
    }
    for col, fml in formulas.items():
        c = ws.cell(row=r, column=col, value=fml)
        c.font, c.fill, c.border = B.calc_font, B.calc_fill, B.box
        c.number_format = {14: GBP, 15: GBP, 16: GBP, 18: "0"}.get(col, "General")
        if col in (19, 20):
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[r].height = 30
for r in examples:
    ws.row_dimensions[r].height = 52

ws.freeze_panes = "B6"
lists = {
    f"B{FIRST}:B{LAST}": "Station or transport,Offices,High street,Residential,Retail park,Campus,Tourist or leisure,Other",
    f"E{FIRST}:E{LAST}": "Commuters,Office workers,Locals,Families,Students,Shoppers,Visitors,Mixed",
    f"F{FIRST}:F{LAST}": "In a hurry,Mixed,Staying",
    f"J{FIRST}:J{LAST}": "Grab-and-go,Mixed,Sit-down",
}
for rng, items in lists.items():
    dv = DataValidation(type="list", formula1=f'"{items}"', allow_blank=True)
    ws.add_data_validation(dv); dv.add(rng)
ws.conditional_formatting.add(f"M{FIRST}:M{LAST}", FormulaRule(formula=[f'M{FIRST}="Mismatch"'], fill=PatternFill("solid", fgColor=B.CRIMSON, bgColor=B.CRIMSON), font=Font(name=F, color=B.WHITE, bold=True)))
ws.conditional_formatting.add(f"M{FIRST}:M{LAST}", FormulaRule(formula=[f'M{FIRST}="Check"'], font=Font(name=F, color=B.CRIMSON, bold=True)))
ws.conditional_formatting.add(f"Q{FIRST}:Q{LAST}", FormulaRule(formula=[f'Q{FIRST}="Crosses with the upside"'], font=Font(name=F, color="008000", bold=True)))
ws.conditional_formatting.add(f"Q{FIRST}:Q{LAST}", FormulaRule(formula=[f'Q{FIRST}="Still below"'], font=Font(name=F, color=B.CRIMSON, bold=True)))
for cell, text in {
    "B5": "What's on the street around the door. Pick from the list.",
    "C5": "From the till report: sales by day. Type it as you'd say it, e.g. 'weekdays' or 'Saturdays'.",
    "D5": "From the till report: sales by hour, e.g. '7 to 9am'.",
    "E5": "Who most of the guests are at the peak. Watch 20 of them; pick from the list.",
    "F5": "Of the 20 you watched: mostly to go and quick (in a hurry), mostly sitting 30 minutes or more (staying), or a mix.",
    "G5": "Guests (or orders) in the busiest hours, across the week, from the till report.",
    "H5": "Average spend a head in the busiest hours, from the till report.",
    "I5": "The spend a head an offer built for these guests could earn. A guess to test, not a forecast: price it from your own menu.",
    "J5": "What the site sells at the peak today.",
    "L5": "From Toolkit 1: break-even for every site.",
    "N5": "Guests at the peak × (spend to test − spend now). The prize if the test works.",
}.items():
    ws[cell].comment = Comment(text, "WRW Hospitality")
ws["A27"] = ("Examples are illustrative, from The Operator's Ledger Episode 4: SITE 10's 200 Saturday guests at £7 now and £11 with a brunch menu, "
             "+£800 a week, taking £13,000 past its £13,520 break-even. SITE 1's guest count is made up.")
ws["A27"].font = B.note_font
B.sign_off(ws, 29)
B.background(ws, LAST_COL, 30)
B.finish(ws, landscape=True, print_rows="$5:$5", page_numbers=True)

# ---------------- Profile guide ----------------
gd = wb.create_sheet("Profile guide")
B.band(gd, "How to profile a site in one week",
       "Two numbers from the till report and one watch at the peak. Do it for every site, not just the one that's struggling.", 3)
for i, h in enumerate(["Step", "How", "Watch out for"], start=1):
    B.header(gd.cell(row=4, column=i, value=h))
steps = [
    ("1. Find the peak", "Till report: sales by day and by hour for the last eight weeks. The two or three busiest hours are the peak.",
     "Use guests or orders, not sales: one big catering order can fake a peak."),
    ("2. Watch 20 guests", "Stand where you can see the door at the peak. For 20 guests, note who they are, alone or together, to go or staying.",
     "Watch, don't ask. Write what you see, not who you hoped to serve."),
    ("3. Spend now", "Till report: average spend a head in the peak hours.", "Peak spend, not the day's average."),
    ("4. Spend to test", "Price an offer built for these guests from your own menu: what would they buy if it were there?",
     "It's a test, not a forecast. Run it for four weeks before you count the money."),
    ("5. Write the line", "'This site is for [who] on [when], [in a hurry / who stay].' The sheet writes it for you.",
     "If you can't fill the line in, you haven't watched the peak yet."),
]
for r, row in enumerate(steps, start=5):
    for i, v in enumerate(row, start=1):
        c = gd.cell(row=r, column=i, value=v)
        c.font = Font(name=F, size=10, bold=(i == 1), color=B.INK)
        c.fill, c.border = PatternFill("solid", fgColor=B.WHITE), B.box
        c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
    gd.row_dimensions[r].height = 44
for i, h in enumerate(["Signs a site runs someone else's plan", "What you'll see", "What to change first"], start=1):
    B.header(gd.cell(row=11, column=i, value=h), result=True)
signs = [
    ("Guests stay, the menu is to go", "Full tables, coffee and a pastry, an hour per table", "The menu at the peak"),
    ("Guests rush, the service is sit-down", "A queue for takeaway behind table service", "A to-go lane at the peak"),
    ("The rota peaks at the wrong time", "Most staff on when the till is quiet", "The rota: staff the peak you found in step 1"),
    ("The hours miss the peak", "People at the door before you open, or after you close", "Opening hours"),
]
for r, row in enumerate(signs, start=12):
    for i, v in enumerate(row, start=1):
        c = gd.cell(row=r, column=i, value=v)
        c.font = Font(name=F, size=10, bold=(i == 1), color=B.INK)
        c.fill, c.border = PatternFill("solid", fgColor=B.WHITE), B.box
        c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
    gd.row_dimensions[r].height = 30
for col, wdt in zip("ABC", (34, 60, 50)):
    gd.column_dimensions[col].width = wdt
gd["A17"] = "Same brand, same name above the door. Each site's menu, hours and rota are set for the guests on its own street."
gd["A17"].font = Font(name=F, size=10, bold=True, color=B.INK)
B.sign_off(gd, 19)
B.background(gd, 3, 20)
B.finish(gd, landscape=True)

# ---------------- Group ----------------
g = wb.create_sheet("Group")
B.band(g, "The group at a glance", "Calculated from the Profiles tab. One brand, many streets: each site's upside, side by side.", 3)
S = "Profiles!"
rows = [("Sites profiled", f'=COUNTIF({S}S{FIRST}:S{LAST},"?*")', "0", False),
        ("Mismatches (offer doesn't fit the guest)", f'=COUNTIF({S}M{FIRST}:M{LAST},"Mismatch")', "0", True),
        ("To check", f'=COUNTIF({S}M{FIRST}:M{LAST},"Check")', "0", False),
        ("Upside a week, all sites", f'=SUM({S}N{FIRST}:N{LAST})', GBP, True),
        ("Upside a year, all sites", f'=SUM({S}O{FIRST}:O{LAST})', GBP, True),
        ("Biggest upside", f'=IF(COUNT({S}N{FIRST}:N{LAST})=0,"",INDEX({S}A{FIRST}:A{LAST},MATCH(MAX({S}N{FIRST}:N{LAST}),{S}N{FIRST}:N{LAST},0)))', "General", True),
        ("…a week", f'=IF(COUNT({S}N{FIRST}:N{LAST})=0,"",MAX({S}N{FIRST}:N{LAST}))', GBP, False),
        ("Sites below break-even now", f'=COUNTIF({S}Q{FIRST}:Q{LAST},"Crosses*")+COUNTIF({S}Q{FIRST}:Q{LAST},"Still*")', "0", False),
        ("…that cross it with the upside", f'=COUNTIF({S}Q{FIRST}:Q{LAST},"Crosses*")', "0", True)]
for i, (label, fml, fmt, key) in enumerate(rows, start=4):
    a = g.cell(row=i, column=1, value=label)
    b = g.cell(row=i, column=2, value=fml)
    a.font = Font(name=F, size=10, bold=key, color=B.INK)
    b.font, b.number_format = Font(name=F, size=10, bold=key, color="008000"), fmt
    a.fill = b.fill = PatternFill("solid", fgColor=B.RESULT if key else B.WHITE)
    a.border = b.border = B.box
    g.row_dimensions[i].height = 21.75
g.column_dimensions["A"].width = 42; g.column_dimensions["B"].width = 24; g.column_dimensions["C"].width = 3
B.sign_off(g, 15)
B.background(g, 3, 16)
B.finish(g, landscape=False)

# ---------------- How to use ----------------
h = wb.create_sheet("How to use")
B.band(h, "How to use this across a group", None, 2)
h.column_dimensions["A"].width = 112; h.column_dimensions["B"].width = 3
steps = [
    "1. Profile every site, not just the one that's struggling. Give each manager the Profile guide: one till report and one watch at the peak.",
    "2. Read the Positioning line for each site out loud. If two sites have the same line, check you really watched both.",
    "3. Start with the Mismatches: the offer at the peak doesn't fit the guest. That's where the upside usually is.",
    "4. Change one thing at the peak (the menu, the hours or the rota) and run it for four weeks before you count the upside.",
    "5. Add weekly sales and break-even from Toolkit 1: a site below break-even with a mismatch may only need positioning.",
    "",
    "Wesley's note (to be written by Wesley): the mismatch he sees most often across a group, and the first change he'd make.",
]
for i, t in enumerate(steps, start=3):
    c = h.cell(row=i, column=1, value=t)
    c.font = Font(name=F, size=11, color=B.INK)
    c.fill = PatternFill("solid", fgColor=B.WHITE)
    c.alignment = Alignment(wrap_text=True, vertical="center", indent=1)
    h.row_dimensions[i].height = 30
c = h.cell(row=11, column=1, value="Running one plan across many streets? Message Wesley Williams on LinkedIn: WRW Hospitality helps multi-site operators set each site for its own guests.")
c.font, c.fill = Font(name=F, size=11, bold=True, color=B.WHITE), PatternFill("solid", fgColor=B.RED)
c.alignment = Alignment(vertical="center", indent=1); h.row_dimensions[11].height = 30
h["A12"] = ("Segmentation, targeting and positioning (STP) follows Wendell Smith, Journal of Marketing, 1956, as taught in marketing textbooks. "
            "The upside is the prize if a tested offer works, not a forecast. Examples are illustrative. This tool is general guidance, not financial advice.")
h["A12"].font = B.note_font
h["A12"].alignment = Alignment(wrap_text=True)
h.row_dimensions[12].height = 26
B.sign_off(h, 14)
B.background(h, 2, 15)
B.finish(h, landscape=True)

B.properties(wb, "Site profiles for every site · The Operator's Toolkit", "segmentation, targeting, positioning, site profile")
wb.save(OUT)
print("saved", OUT)
