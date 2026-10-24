"""WRW Hospitality branding for Toolkit spreadsheets, matching Wesley's branded Wednesday 1 sheet.
Every tab: red title band with the logo, warm background, sign-off, copyright line, © footer, protected formulas."""
import os
from openpyxl.drawing.image import Image
from openpyxl.drawing.spreadsheet_drawing import TwoCellAnchor, AnchorMarker
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

RED, CRIMSON, INK, BG, HEAD, RESULT, LINE, MUTED, WHITE = "FF3131", "C41E1E", "2A1C1A", "F7F2EB", "EFE6DA", "FFE4E1", "E0D5C7", "6E605C", "FFFFFF"
F = "Arial"
COPYRIGHT = "© 2026 WRW Hospitality (Wesley Williams). Free for use in your own business. Not to be resold, rebranded or redistributed."
SIGNOFF = "WRW Hospitality  ·  Wesley Williams  ·  The Operator's Toolkit"
FOOTER = "© 2026 WRW Hospitality · The Operator's Toolkit"
PW_HASH = "c71f"  # the same sheet password Wesley set on Wednesday 1
LOGO = os.path.join(os.path.dirname(__file__), "assets", "wrw-sheet-logo.png")

line = Side(style="thin", color=LINE)
box = Border(left=line, right=line, top=line, bottom=line)
fill = lambda c: PatternFill("solid", fgColor=c)
input_font, input_fill = Font(name=F, size=10, color="0000FF"), fill(WHITE)
calc_font, calc_fill = Font(name=F, size=10, color=INK), fill(BG)
group_font = Font(name=F, size=8.5, bold=True, color=CRIMSON)
note_font = Font(name=F, size=8.5, color=MUTED)


def header(c, result=False):
    c.font = Font(name=F, size=9, bold=True, color=CRIMSON if result else INK)
    c.fill = fill(RESULT if result else HEAD)
    c.alignment = Alignment(wrap_text=True, vertical="center", indent=1)
    c.border = box


def band(ws, title, subtitle, last_col):
    """Red title band (rows 1-2) with the logo in the top-left corner and the title indented past it."""
    for r in (1, 2):
        for col in range(1, last_col + 1):
            ws.cell(row=r, column=col).fill = fill(RED)
    ws["A1"] = title
    ws["A1"].font = Font(name=F, size=18, bold=True, color=WHITE)
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=12)
    ws.row_dimensions[1].height = 49.5
    if subtitle:
        ws["A2"] = subtitle
        ws["A2"].font = Font(name=F, size=9, color=WHITE)
        ws["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=12)
    ws.row_dimensions[2].height = 19.5
    img = Image(LOGO)
    img.anchor = TwoCellAnchor(_from=AnchorMarker(col=0, row=0, colOff=114480, rowOff=47520),
                               to=AnchorMarker(col=0, row=0, colOff=666720, rowOff=599760))
    ws.add_image(img)


def background(ws, last_col, last_row):
    """Warm background on every cell not already filled."""
    for row in ws.iter_rows(min_row=1, max_row=last_row, max_col=last_col):
        for c in row:
            if c.fill is None or c.fill.fill_type is None:
                c.fill = fill(BG)


def sign_off(ws, row):
    ws.cell(row=row, column=1, value=SIGNOFF).font = Font(name=F, size=9, bold=True, color=RED)
    ws.cell(row=row + 1, column=1, value=COPYRIGHT).font = note_font


def finish(ws, landscape=True, print_rows=None, page_numbers=False):
    ws.sheet_view.showGridLines = False
    ws.oddFooter.left.text = FOOTER
    if page_numbers:
        ws.oddFooter.right.text = "Page &P of &N"
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    if print_rows:
        ws.print_title_rows = print_rows
    ws.protection.set_password(PW_HASH, already_hashed=True)
    ws.protection.sheet = True


def properties(wb, title, keywords):
    p = wb.properties
    p.creator = p.lastModifiedBy = "WRW Hospitality"
    p.title, p.subject, p.keywords = title, "The Operator's Toolkit", f"WRW Hospitality, Wesley Williams, {keywords}"
    p.description = COPYRIGHT
