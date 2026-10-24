"""Builds the gated multi-site lunch-peak capacity sheet for The Operator's Toolkit, Wednesday 3 (Little's Law, Episode 03).
Branded to match Wesley's Wednesday 1 sheet through ../wrw_brand.py.
Run: python build_sheet.py  ->  WRW-Toolkit-03-Lunch-peak-capacity-for-every-site.xlsx (then recalculate through LibreOffice)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Protection
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation
import wrw_brand as B

OUT = "WRW-Toolkit-03-Lunch-peak-capacity-for-every-site.xlsx"
F = B.F
GBP = '£#,##0;(£#,##0);-'
GBP2 = '£#,##0.00;(£#,##0.00);-'
PCT = '0%;(0%);-'
MIN = '0.0" min";-0.0" min";-'
RATE = '0.0" a min";-0.0" a min";-'
FIRST, LAST = 6, 25
LAST_COL = 21  # U

wb = Workbook()
ws = wb.active
ws.title = "Sites"
B.band(ws, "Lunch-peak capacity for every site",
       "The Operator's Toolkit · Wednesday 3 · from The Operator's Ledger, Episode 3: Little's Law · WRW Hospitality", LAST_COL)
ws["A3"] = ("Fill in the white cells (blue text) for each site, from three lunchtime counts (see the Counting guide tab). Everything else calculates. "
            "Row 7 is SITE 10 from the episode and row 6 is SITE 1: overwrite them with your own.")
ws["A3"].font = Font(name=F, size=9.5, color=B.INK)
ws.row_dimensions[3].height = 24
ws.cell(row=4, column=3, value="THE 12:10 COUNTS: orders, not heads").font = B.group_font
ws.cell(row=4, column=8, value="WHAT WALKS OUT").font = B.group_font
ws.cell(row=4, column=11, value="RESULTS").font = B.group_font
ws.row_dimensions[4].height = 19.5

INPUTS = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 21}
headers = [("Site", 18), ("Lunch days a week", 9), ("Queue at 12:10, day 1", 9), ("Queue at 12:10, day 2", 9), ("Queue at 12:10, day 3", 9),
           ("Served in 5 minutes (from 12:10)", 11), ("Target wait (minutes)", 9),
           ("Walk-aways a day", 9), ("Average lunch spend (£)", 10), ("Gap to break-even (£/wk, Toolkit 1)", 12),
           ("Average queue", 9), ("Served a minute", 10), ("Wait at 12:10", 10), ("Served a minute needed", 11), ("Extra serves a minute", 10),
           ("Lost a week (£)", 11), ("Lost a year (£)", 11), ("Share of break-even gap", 10), ("Rank (1 = loses most)", 9),
           ("What to do", 36), ("Notes: where the queue slows", 36)]
for i, (h, wdt) in enumerate(headers, start=1):
    c = ws.cell(row=5, column=i, value=h)
    B.header(c, result=i not in INPUTS)
    ws.column_dimensions[c.column_letter].width = wdt
ws.row_dimensions[5].height = 60

examples = {
    6: ["SITE 1 (example)", 7, 7, 8, 9, 15, 4, 2, 8.50, None, "Two tills open at noon; drinks made at a separate station."],
    7: ["SITE 10 (example)", 6, 12, 12, 12, 10, 4, 10, 8.50, 520, "One person takes orders and makes drinks from 12:00 to 13:00."],
}
for r in range(FIRST, LAST + 1):
    e = examples.get(r, [None] * 11)
    for col, v in zip(sorted(INPUTS), e):
        c = ws.cell(row=r, column=col, value=v)
        c.font, c.fill, c.border = B.input_font, B.input_fill, B.box
        c.protection = Protection(locked=False)
        c.number_format = {9: GBP2, 10: GBP}.get(col, "General")
        if col == 21:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    R = str(r)
    formulas = {
        11: f'=IF(COUNT(C{R}:E{R})=0,"",AVERAGE(C{R}:E{R}))',
        12: f'=IF(F{R}="","",F{R}/5)',
        13: f'=IF(OR(K{R}="",L{R}="",L{R}=0),"",K{R}/L{R})',
        14: f'=IF(OR(K{R}="",G{R}="",G{R}=0),"",K{R}/G{R})',
        15: f'=IF(OR(N{R}="",L{R}=""),"",MAX(0,N{R}-L{R}))',
        16: f'=IF(OR(B{R}="",H{R}="",I{R}=""),"",H{R}*I{R}*B{R})',
        17: f'=IF(P{R}="","",P{R}*52)',
        18: f'=IF(OR(J{R}="",P{R}=""),"",IF(J{R}<=0,"",P{R}/J{R}))',
        19: f'=IF(P{R}="","",RANK(P{R},$P${FIRST}:$P${LAST},0))',
        20: (f'=IF(M{R}="","",IF(M{R}>G{R},"Over target: serve "&TEXT(N{R},"0.0")&" a minute at noon (now "&TEXT(L{R},"0.0")&"). Find the bottleneck",'
             f'"Within target: re-count monthly"))'),
    }
    for col, fml in formulas.items():
        c = ws.cell(row=r, column=col, value=fml)
        c.font, c.fill, c.border = B.calc_font, B.calc_fill, B.box
        c.number_format = {11: "0.0", 12: RATE, 13: MIN, 14: RATE, 15: RATE, 16: GBP, 17: GBP, 18: PCT, 19: "0"}.get(col, "General")
        if col == 20:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[r].height = 30
for r in examples:
    ws.row_dimensions[r].height = 48

ws.freeze_panes = "B6"
for rng, kind, lo, hi, msg in [(f"B{FIRST}:B{LAST}", "whole", "1", "7", "Lunch days a week: 1 to 7."),
                               (f"C{FIRST}:F{LAST}", "whole", "0", "500", "Count whole orders."),
                               (f"G{FIRST}:G{LAST}", "decimal", "0.5", "60", "Target wait in minutes, for example 4."),
                               (f"H{FIRST}:H{LAST}", "whole", "0", "500", "Walk-aways a day: a whole number.")]:
    dv = DataValidation(type=kind, operator="between", formula1=lo, formula2=hi, showErrorMessage=True, error=msg)
    ws.add_data_validation(dv); dv.add(rng)
ws.conditional_formatting.add(f"T{FIRST}:T{LAST}", FormulaRule(formula=[f'LEFT(T{FIRST},4)="Over"'], fill=PatternFill("solid", fgColor=B.CRIMSON, bgColor=B.CRIMSON), font=Font(name=F, color=B.WHITE, bold=True)))
ws.conditional_formatting.add(f"M{FIRST}:M{LAST}", FormulaRule(formula=[f'AND(M{FIRST}<>"",M{FIRST}>G{FIRST})'], font=Font(name=F, color=B.CRIMSON, bold=True)))
ws.conditional_formatting.add(f"P{FIRST}:P{LAST}", FormulaRule(formula=[f'AND(P{FIRST}<>"",P{FIRST}>0)'], font=Font(name=F, color=B.CRIMSON)))
for cell, text in {
    "C5": "Orders waiting to order or pay at exactly 12:10. A group paying together is one order. Count on three different days.",
    "F5": "Orders completed at the till in the five minutes from 12:10.",
    "G5": "The longest wait you're willing to ask of a lunch guest. The episode used 4 minutes; set your own.",
    "H5": "Guests who join the queue and leave, or look at it and walk on, across the lunch peak. Average of your three days.",
    "I5": "Lunch takings ÷ lunch orders, from the till report.",
    "J5": "From Toolkit 1: how far the site is below break-even each week, as a positive number. Leave blank if it is above.",
    "M5": "Little's Law turned round: queue ÷ served a minute. Holds while the till is busy and the queue isn't growing.",
    "N5": "What the till must serve to hit the target wait: queue ÷ target wait.",
}.items():
    ws[cell].comment = Comment(text, "WRW Hospitality")
ws["A27"] = ("Examples are illustrative. SITE 10 is Episode 3: 12 ÷ 2 a minute = a 6-minute wait; 10 a day × £8.50 × 6 days = £510 a week, "
             "98% of its £520 gap. SITE 1's counts are made up to show a site within target.")
ws["A27"].font = B.note_font
B.sign_off(ws, 29)
B.background(ws, LAST_COL, 30)
B.finish(ws, landscape=True, print_rows="$5:$5", page_numbers=True)

# ---------------- Counting guide ----------------
gd = wb.create_sheet("Counting guide")
B.band(gd, "How to count, and where the noon queue slows",
       "Three lunchtimes, ten minutes each. Count orders, not heads: a group paying together is one order.", 3)
for i, h in enumerate(["Count", "How", "Watch out for"], start=1):
    B.header(gd.cell(row=4, column=i, value=h))
counts = [
    ("The queue at 12:10", "At exactly 12:10, count every order waiting to order or pay. Do it on three different days and the sheet averages them.",
     "People waiting for collection have already been served at the till; leave them out and note it if that's where the crowd is."),
    ("Served in 5 minutes", "From 12:10, count orders completed at the till for five minutes. The sheet divides by five.",
     "Count from the till, not the door. A screen or till report by the minute does the job if you have one."),
    ("Walk-aways", "Across the lunch peak, tally anyone who joins and leaves, or looks at the queue and walks on.",
     "Ask whoever is nearest the door to keep the tally: the till can't see it."),
    ("Average spend", "Lunch takings ÷ lunch orders, from the till report for the same days.", "Use lunch only: breakfast and afternoon change the average."),
]
for r, row in enumerate(counts, start=5):
    for i, v in enumerate(row, start=1):
        c = gd.cell(row=r, column=i, value=v)
        c.font = Font(name=F, size=10, bold=(i == 1), color=B.INK)
        c.fill, c.border = PatternFill("solid", fgColor=B.WHITE), B.box
        c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
    gd.row_dimensions[r].height = 48
for i, h in enumerate(["Where it slows", "The quick test", "The usual fix"], start=1):
    B.header(gd.cell(row=10, column=i, value=h), result=True)
bottlenecks = [
    ("Taking the order", "Is one person taking orders and making drinks?", "Split the roles from 12:00 to 13:00, even if only for the hour."),
    ("Payment", "How long from 'that's £8.50' to the receipt?", "Contactless first; a second card reader at the end of the counter."),
    ("Making", "Does the queue move while orders wait at the machine?", "Pre-batch the top three lunch items; a second person on the machine at noon."),
    ("Collection", "Is the crowd at the pick-up point, not the till?", "Call orders by name; a clear collection spot away from the queue."),
    ("Deciding", "Do guests decide at the till?", "A short lunch menu readable from the back of the queue."),
]
for r, row in enumerate(bottlenecks, start=11):
    for i, v in enumerate(row, start=1):
        c = gd.cell(row=r, column=i, value=v)
        c.font = Font(name=F, size=10, bold=(i == 1), color=B.INK)
        c.fill, c.border = PatternFill("solid", fgColor=B.WHITE), B.box
        c.alignment = Alignment(wrap_text=True, vertical="top", indent=1)
    gd.row_dimensions[r].height = 34
for col, wdt in zip("ABC", (26, 60, 60)):
    gd.column_dimensions[col].width = wdt
gd["A17"] = "Fix one bottleneck at a time, then count again at 12:10. The fixes are common practice, not a guarantee: test them on your own counts."
gd["A17"].font = B.note_font
B.sign_off(gd, 19)
B.background(gd, 3, 20)
B.finish(gd, landscape=True)

# ---------------- Group ----------------
g = wb.create_sheet("Group")
B.band(g, "The group at a glance", "Calculated from the Sites tab. The site losing most at lunch is the first one to fix.", 3)
S = "Sites!"
rows = [("Sites counted", f"=COUNT({S}M{FIRST}:M{LAST})", "0", False),
        ("Sites over their target wait", f'=COUNTIF({S}T{FIRST}:T{LAST},"Over*")', "0", True),
        ("Average wait at 12:10", f'=IF(COUNT({S}M{FIRST}:M{LAST})=0,"",AVERAGE({S}M{FIRST}:M{LAST}))', MIN, False),
        ("Longest wait", f'=IF(COUNT({S}M{FIRST}:M{LAST})=0,"",MAX({S}M{FIRST}:M{LAST}))', MIN, False),
        ("…at", f'=IF(B7="","",INDEX({S}A{FIRST}:A{LAST},MATCH(B7,{S}M{FIRST}:M{LAST},0)))', "General", False),
        ("Lost at lunch, a week", f'=SUM({S}P{FIRST}:P{LAST})', GBP, True),
        ("Lost at lunch, a year", f'=SUM({S}Q{FIRST}:Q{LAST})', GBP, True),
        ("Site losing most", f'=IF(COUNT({S}P{FIRST}:P{LAST})=0,"",INDEX({S}A{FIRST}:A{LAST},MATCH(MAX({S}P{FIRST}:P{LAST}),{S}P{FIRST}:P{LAST},0)))', "General", True),
        ("…a week", f'=IF(COUNT({S}P{FIRST}:P{LAST})=0,"",MAX({S}P{FIRST}:P{LAST}))', GBP, False)]
for i, (label, fml, fmt, key) in enumerate(rows, start=4):
    a = g.cell(row=i, column=1, value=label)
    b = g.cell(row=i, column=2, value=fml)
    a.font = Font(name=F, size=10, bold=key, color=B.INK)
    b.font, b.number_format = Font(name=F, size=10, bold=key, color="008000"), fmt
    a.fill = b.fill = PatternFill("solid", fgColor=B.RESULT if key else B.WHITE)
    a.border = b.border = B.box
    g.row_dimensions[i].height = 21.75
g.column_dimensions["A"].width = 40; g.column_dimensions["B"].width = 24; g.column_dimensions["C"].width = 3
B.sign_off(g, 15)
B.background(g, 3, 16)
B.finish(g, landscape=False)

# ---------------- How to use ----------------
h = wb.create_sheet("How to use")
B.band(h, "How to use this across a group", None, 2)
h.column_dimensions["A"].width = 112; h.column_dimensions["B"].width = 3
steps = [
    "1. Give each site manager the Counting guide. Three lunchtimes, ten minutes each: the queue at 12:10 and what the till serves in the next five minutes.",
    "2. Fill in one row per site. Set a target wait you'd accept as a guest; the sheet tells you what the till must serve at noon to hit it.",
    "3. Read the Rank column: rank 1 loses the most at lunch. Start there, not with the site that complains loudest.",
    "4. Fix the bottleneck at noon, not the rota all day. One change at a time, then count again.",
    "5. Add the gap to break-even from Toolkit 1. A site below break-even with a long lunch queue may be losing its missing money at the door.",
    "",
    "Wesley's note (to be written by Wesley): the noon bottleneck he finds most often, and the cheapest fix.",
]
for i, t in enumerate(steps, start=3):
    c = h.cell(row=i, column=1, value=t)
    c.font = Font(name=F, size=11, color=B.INK)
    c.fill = PatternFill("solid", fgColor=B.WHITE)
    c.alignment = Alignment(wrap_text=True, vertical="center", indent=1)
    h.row_dimensions[i].height = 30
c = h.cell(row=11, column=1, value="Queues at more than one site? Message Wesley Williams on LinkedIn: WRW Hospitality helps multi-site operators find the minutes their lunch peak is losing.")
c.font, c.fill = Font(name=F, size=11, bold=True, color=B.WHITE), PatternFill("solid", fgColor=B.RED)
c.alignment = Alignment(vertical="center", indent=1); h.row_dimensions[11].height = 30
h["A12"] = ("Little's Law (John Little, Operations Research, 1961) holds for averages in a steady queue: read the wait as a guide while the till is busy. "
            "Examples are illustrative. This tool is general guidance, not financial advice.")
h["A12"].font = B.note_font
h["A12"].alignment = Alignment(wrap_text=True)
h.row_dimensions[12].height = 26
B.sign_off(h, 14)
B.background(h, 2, 15)
B.finish(h, landscape=True)

B.properties(wb, "Lunch-peak capacity for every site · The Operator's Toolkit", "Little's Law, queue, lunch peak")
wb.save(OUT)
print("saved", OUT)
