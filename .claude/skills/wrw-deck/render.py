"""Render a .pptx to one PNG per slide plus a contact sheet, so the deck can be looked at before Wesley sees it.
Usage: python render.py deck.pptx [outdir]      (needs LibreOffice, PyMuPDF and Pillow)
Writes outdir/s01.png ... and outdir/contact.png. Keep deck and outdir on short paths."""
import glob, os, subprocess, sys
import pymupdf
from PIL import Image

SOFFICE = next(iter(glob.glob(r"C:\Program Files\LibreOffice\program\soffice.exe") + glob.glob(r"C:\Program Files (x86)\LibreOffice\program\soffice.exe")), None)
if not SOFFICE:
    sys.exit("LibreOffice not found")
deck = os.path.abspath(sys.argv[1])
out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(deck), "render"))
os.makedirs(out, exist_ok=True)
subprocess.run([SOFFICE, "--headless", "--convert-to", "pdf", "--outdir", out, deck], check=True, capture_output=True, timeout=240)
pdf = pymupdf.open(os.path.join(out, os.path.splitext(os.path.basename(deck))[0] + ".pdf"))
ims = []
for i, page in enumerate(pdf):
    z = 1067 / page.rect.width
    fn = os.path.join(out, f"s{i + 1:02d}.png")
    page.get_pixmap(matrix=pymupdf.Matrix(z, z)).save(fn)
    ims.append(Image.open(fn).convert("RGB"))
w, h = ims[0].size
cols, scale = 3, 0.5
tw, th = int(w * scale), int(h * scale)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw + (cols + 1) * 8, rows * th + (rows + 1) * 8), "white")
for i, im in enumerate(ims):
    sheet.paste(im.resize((tw, th)), (8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 8)))
sheet.save(os.path.join(out, "contact.png"))
print(len(ims), "slides ->", out)
