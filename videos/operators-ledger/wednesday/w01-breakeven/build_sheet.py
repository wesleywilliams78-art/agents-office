"""Builds the gated multi-site break-even calculator for The Operator's Toolkit, Wednesday 1.
The shared file is Wesley's branded version, 'WRW Toolkit 01 - Break even for every site.xlsx'; this script only rebuilds the unbranded draft.
Run: python build_sheet.py   ->  WRW-Toolkit-01-Break-even-for-every-site.xlsx (then recalc with the xlsx skill's recalc.py)"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.comments import Comment
from openpyxl.worksheet.datavalidation import DataValidation

OUT = "WRW-Toolkit-01-Break-even-for-every-site.xlsx"
INK, BONE, RED, SAND, SAGE, OCHRE = "201E1D", "F3F2F2", "EC3013", "E9D8BD", "7E9C82", "F2C14E"
F = "Arial"
GBP = '£#,##0;(£#,##0);-'
PCT = '0.0%;(0.0%);-'
input_font = Font(name=F, size=10, color="0000FF")
input_fill = PatternFill("solid", fgColor="FFF2CC")
calc_font = Font(name=F, size=10, color="000000")
head_font = Font(name=F, size=10, bold=True, color=BONE)
head_fill = PatternFill("solid", fgColor=INK)
thin = Side(style="thin", color="D6D2CF")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
FIRST, LAST = 6, 25          # 20 site rows

wb = Workbook()

# ---------------- Sites ----------------
ws = wb.active
ws.title = "Sites"
ws["A1"] = "Break-even for every site"
ws["A1"].font = Font(name=F, size=16, bold=True, color=INK)
ws["A2"] = "The Operator's Toolkit · Wednesday 1 · from The Operator's Ledger, Episode 1: Unit economics · WRW Hospitality"
ws["A2"].font = Font(name=F, size=9, color="4A4644")
ws["A3"] = "Fill in the yellow cells (blue text) for each site: weekly averages over the last 8 weeks. Everything else calculates. Rows 6 and 7 are worked examples from the episode: overwrite them with your own sites."
ws["A3"].font = Font(name=F, size=9, color="4A4644")

headers = [
    ("Site", 18), ("Trading days a week", 10), ("Weekly sales (£)", 13),
    ("Core labour (£/wk)", 13), ("Rent and service charge (£/wk)", 14), ("Rates and insurance (£/wk)", 13), ("Other fixed costs (£/wk)", 13),
    ("Total fixed (£/wk)", 13),
    ("Food and drink (% of sales)", 12), ("Other variable (% of sales)", 12), ("Total variable (% of sales)", 12),
    ("Kept from each £1 of sales", 12), ("Break-even sales (£/wk)", 14), ("Break-even per trading day (£)", 14),
    ("Gap to break-even (£/wk)", 14), ("Margin of safety (%)", 12), ("Four-wall profit (£/wk)", 14),
    ("Rank (1 = most exposed)", 10), ("Status", 26), ("Contribution (£/wk)", 13),
]
for i, (h, wdt) in enumerate(headers, start=1):
    c = ws.cell(row=5, column=i, value=h)
    c.font, c.fill = head_font, head_fill
    c.alignment = Alignment(wrap_text=True, vertical="center")
    ws.column_dimensions[c.column_letter].width = wdt
ws.row_dimensions[5].height = 54
group_row = ws.cell(row=4, column=4, value="FIXED COSTS: stay the same in a quiet week")
group_row.font = Font(name=F, size=9, bold=True, color=INK)
ws.cell(row=4, column=9, value="VARIABLE COSTS: rise and fall with sales").font = Font(name=F, size=9, bold=True, color=INK)
ws.cell(row=4, column=12, value="RESULTS").font = Font(name=F, size=9, bold=True, color=INK)

examples = {
    6: ["SITE 1 (example)", 7, 20000, 5600, 2000, 0, 0, 0.28, 0.10],
    7: ["SITE 10 (example)", 7, 13000, 5200, 2600, 0, 0, 0.30, 0.12307692],
}
for r in range(FIRST, LAST + 1):
    vals = examples.get(r, [None] * 9)
    for col, v in enumerate(vals, start=1):
        c = ws.cell(row=r, column=col, value=v)
        c.font, c.fill, c.border = input_font, input_fill, box
        c.number_format = GBP if col in (3, 4, 5, 6, 7) else (PCT if col in (8, 9) else "General")
    # col 8 is food % in examples list index 7 -> place correctly
    if r in examples:
        e = examples[r]
        for col, v in zip(range(1, 8), e[:7]):
            ws.cell(row=r, column=col, value=v)
        ws.cell(row=r, column=8, value=None)
        ws.cell(row=r, column=9, value=e[7]); ws.cell(row=r, column=10, value=e[8])
    for col in (9, 10):
        c = ws.cell(row=r, column=col)
        c.font, c.fill, c.border, c.number_format = input_font, input_fill, box, PCT
    R = str(r)
    f = {
        8:  f'=IF(C{R}="","",SUM(D{R}:G{R}))',
        11: f'=IF(C{R}="","",I{R}+J{R})',
        12: f'=IF(C{R}="","",1-K{R})',
        13: f'=IF(C{R}="","",IF(L{R}>0,H{R}/L{R},""))',
        14: f'=IF(OR(M{R}="",B{R}="",B{R}=0),"",M{R}/B{R})',
        15: f'=IF(M{R}="","",C{R}-M{R})',
        16: f'=IF(OR(M{R}="",C{R}=0),"",(C{R}-M{R})/C{R})',
        17: f'=IF(C{R}="","",C{R}*L{R}-H{R})',
        18: f'=IF(P{R}="","",RANK(P{R},$P${FIRST}:$P${LAST},1))',
        19: f'=IF(M{R}="","",IF(C{R}<M{R},"Below break-even",IF(P{R}<0.1,"At risk: under 10% cushion","Above break-even")))',
        20: f'=IF(C{R}="","",C{R}*L{R})',
    }
    for col, formula in f.items():
        c = ws.cell(row=r, column=col, value=formula)
        c.font, c.border = calc_font, box
        c.number_format = {8: GBP, 11: PCT, 12: '£0.00', 13: GBP, 14: GBP, 15: GBP, 16: PCT, 17: GBP, 18: "0", 19: "General", 20: GBP}[col]
        if col == 8:
            c.fill = PatternFill(fill_type=None)

ws.freeze_panes = "B6"
rng = f"A{FIRST}:T{LAST}"
ws.conditional_formatting.add(f"S{FIRST}:S{LAST}", FormulaRule(formula=[f'LEFT(S{FIRST},5)="Below"'], fill=PatternFill("solid", fgColor="F8C9BF"), font=Font(name=F, color="B6240E", bold=True)))
ws.conditional_formatting.add(f"S{FIRST}:S{LAST}", FormulaRule(formula=[f'LEFT(S{FIRST},7)="At risk"'], fill=PatternFill("solid", fgColor="FBE6B0")))
ws.conditional_formatting.add(f"O{FIRST}:O{LAST}", FormulaRule(formula=[f'AND(O{FIRST}<>"",O{FIRST}<0)'], font=Font(name=F, color="B6240E")))
dv_pct = DataValidation(type="decimal", operator="between", formula1="0", formula2="1", showErrorMessage=True,
                        error="Enter a percentage between 0% and 100%, for example 30%.")
ws.add_data_validation(dv_pct); dv_pct.add(f"I{FIRST}:J{LAST}")
dv_days = DataValidation(type="whole", operator="between", formula1="1", formula2="7", showErrorMessage=True, error="Trading days a week: 1 to 7.")
ws.add_data_validation(dv_days); dv_days.add(f"B{FIRST}:B{LAST}")

notes = {
    "D5": "The rota you need just to open the doors, whatever the sales: managers, the minimum team per shift, their employer costs. Extra hours added on busy days can go in Other variable instead.",
    "E5": "Weekly: annual rent plus service charge, divided by 52.",
    "F5": "Weekly: business rates, insurance, licences, equipment leases, divided by 52.",
    "I5": "Food and drink cost as a share of sales, after waste. Use the site's own figure, not the brand average.",
    "J5": "Everything else that rises with sales: packaging, card fees, delivery commission, the energy that follows trade, extra hours on busy shifts.",
    "J7": "Example: SITE 10's running costs from Episode 1, £1,600 on £13,000 of sales (12.3%).",
    "L5": "Of every £1 a guest spends, what is left to pay the fixed costs. Also called the contribution margin.",
    "P5": "How far sales could fall before the site stops paying for itself. Under 10% is a site with no cushion.",
    "R5": "Ranks every site by margin of safety. 1 is the most exposed: start there.",
}
for cell, text in notes.items():
    ws[cell].comment = Comment(text, "WRW Hospitality")
ws["A27"] = "Examples (rows 6 and 7) are illustrative, weekly, from The Operator's Ledger Episode 1. Check: SITE 1 break-even £12,258, profit £4,800; SITE 10 break-even £13,520, loss £300."
ws["A27"].font = Font(name=F, size=9, italic=True, color="4A4644")

# ---------------- Group ----------------
g = wb.create_sheet("Group")
g["A1"] = "The group at a glance"; g["A1"].font = Font(name=F, size=16, bold=True, color=INK)
g["A2"] = "Calculated from the Sites tab. A healthy group total can hide a site that is losing money, so read both."; g["A2"].font = Font(name=F, size=9, color="4A4644")
S = "Sites!"
rows = [
    ("Sites entered", f"=COUNT({S}C{FIRST}:C{LAST})", "0"),
    ("Total weekly sales", f"=SUM({S}C{FIRST}:C{LAST})", GBP),
    ("Total fixed costs", f"=SUM({S}H{FIRST}:H{LAST})", GBP),
    ("Kept from each £1 of sales, group", f'=IF(B5=0,"",SUM({S}T{FIRST}:T{LAST})/B5)', '£0.00'),
    ("Group break-even sales", f'=IF(OR(B7="",B7<=0),"",B6/B7)', GBP),
    ("Group four-wall profit", f"=SUM({S}Q{FIRST}:Q{LAST})", GBP),
    ("…of which from sites above break-even", f'=SUMIF({S}Q{FIRST}:Q{LAST},">0")', GBP),
    ("…of which lost at sites below break-even", f'=SUMIF({S}Q{FIRST}:Q{LAST},"<0")', GBP),
    ("Sites below break-even", f'=COUNTIF({S}S{FIRST}:S{LAST},"Below*")', "0"),
    ("Sites at risk (under 10% cushion)", f'=COUNTIF({S}S{FIRST}:S{LAST},"At risk*")', "0"),
    ("Most exposed site", f'=IF(B4=0,"",INDEX({S}A{FIRST}:A{LAST},MATCH(MIN({S}P{FIRST}:P{LAST}),{S}P{FIRST}:P{LAST},0)))', "General"),
    ("Its margin of safety", f'=IF(B4=0,"",MIN({S}P{FIRST}:P{LAST}))', PCT),
]
for i, (label, formula, fmt) in enumerate(rows, start=4):
    a = g.cell(row=i, column=1, value=label); a.font = Font(name=F, size=10)
    b = g.cell(row=i, column=2, value=formula); b.font, b.number_format = Font(name=F, size=10, color="008000"), fmt
    a.border = b.border = box
g.column_dimensions["A"].width = 40; g.column_dimensions["B"].width = 22

# ---------------- How to use ----------------
h = wb.create_sheet("How to use")
h.column_dimensions["A"].width = 110
lines = [
    ("How to use this across a group", 16, True),
    ("", 10, False),
    ("1. One row per site, from the last 8 weeks' averages. Not your best week, not your worst.", 11, False),
    ("2. Fixed means it would not fall in a quiet week: the core rota, rent and service charge, rates, insurance, licences, equipment leases.", 11, False),
    ("3. Variable means it rises and falls with sales: food and drink, packaging, card fees, delivery commission, the energy that follows trade.", 11, False),
    ("4. Use each site's own percentages. A brand average hides the site that is drifting.", 11, False),
    ("5. Read the Rank column first. Rank 1 is the most exposed site. Deal with Below break-even, then At risk.", 11, False),
    ("6. For each exposed site, pick one lever: more sales (Episodes 3 and 4), a lower variable % (food cost, waste, channel mix), or lower fixed costs (rota, rent review).", 11, False),
    ("7. Divide break-even by trading days and give each manager their daily number.", 11, False),
    ("8. Re-run it monthly. A falling margin of safety is the earliest warning you will get.", 11, False),
    ("", 10, False),
    ("Wesley's note (to be written by Wesley): which site he would look at first in a group like yours, and why.", 11, False),
    ("", 10, False),
    ("Want help reading yours? Message Wesley Williams on LinkedIn: WRW Hospitality works with multi-site operators on exactly this.", 11, True),
    ("Figures in the example rows are illustrative. This tool is general guidance, not financial advice.", 9, False),
]
for i, (t, size, bold) in enumerate(lines, start=1):
    c = h.cell(row=i, column=1, value=t); c.font = Font(name=F, size=size, bold=bold, color=INK); c.alignment = Alignment(wrap_text=True)

wb.save(OUT)
print("saved", OUT)
