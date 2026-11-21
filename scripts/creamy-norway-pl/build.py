import sys
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.dml import MSO_LINE

out = sys.argv[1]
TITLE = "Creamy Norway - simplified P&L - 2025 baseline (DRAFT)"
def C(h): return RGBColor.from_string(h.lstrip('#'))
GROUND,PANEL,HAIR,TEXT,MUTED,PINK,SOFT,PLUM = '0A0A0A','141414','2E2E2E','F4EFF2','B9B1B6','ED1589','FF7FC4','4B1F37'
FONT='Calibri'
W,H=13.333,7.5; M=0.6

prs=Presentation(); prs.slide_width=Inches(W); prs.slide_height=Inches(H)
prs.core_properties.title=TITLE

def text(sl,x,y,w,h,s,size=14,color=TEXT,bold=False,italic=False,align=PP_ALIGN.LEFT,anchor=MSO_ANCHOR.TOP):
    tb=sl.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h)); tf=tb.text_frame
    tf.word_wrap=True; tf.margin_left=tf.margin_right=tf.margin_top=tf.margin_bottom=0
    tf.vertical_anchor=anchor
    p=tf.paragraphs[0]; p.alignment=align
    r=p.add_run(); r.text=s; f=r.font; f.name=FONT; f.size=Pt(size); f.bold=bold; f.italic=italic; f.color.rgb=C(color)
    return tb

def rect(sl,x,y,w,h,fill=None,line=None,lw=0.75,dash=False):
    s=sl.shapes.add_shape(MSO_SHAPE.RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h))
    s.shadow.inherit=False
    if fill: s.fill.solid(); s.fill.fore_color.rgb=C(fill)
    else: s.fill.background()
    if line:
        s.line.color.rgb=C(line); s.line.width=Pt(lw)
        if dash: s.line.dash_style=MSO_LINE.DASH
    else: s.line.fill.background()
    return s

def base(extra_footer=False):
    sl=prs.slides.add_slide(prs.slide_layouts[6])
    sl.background.fill.solid(); sl.background.fill.fore_color.rgb=C(GROUND)
    text(sl,M,0.38,3,0.45,"creamy",26,PINK,bold=True,italic=True)
    b=rect(sl,W-M-3.7,0.4,3.7,0.4,PANEL,PINK,1.25)
    tf=b.text_frame; tf.margin_left=tf.margin_right=Inches(0.1); tf.margin_top=tf.margin_bottom=0
    tf.vertical_anchor=MSO_ANCHOR.MIDDLE; p=tf.paragraphs[0]; p.alignment=PP_ALIGN.CENTER
    r=p.add_run(); r.text="DRAFT: internal, not for prospects"; r.font.name=FONT; r.font.size=Pt(12); r.font.bold=True; r.font.color.rgb=C(PINK)
    foot="2025 baseline, two shops combined. NOK, net of VAT. Source: Creamy Master Budget Template Norway, Sales & Cost Sheet."
    if extra_footer:
        text(sl,M,6.72,W-2*M,0.22,foot,10,MUTED)
        text(sl,M,6.97,W-2*M,0.22,"Creamy's own 2025 baseline. Not a forecast. Not a promise of results for a franchisee.",10,MUTED)
    else:
        text(sl,M,6.97,W-2*M,0.22,foot,10,MUTED)
    return sl

# ---- Slide 1
s1=base()
text(s1,M,0.95,12,0.55,"Where the sales krone goes",32,TEXT,bold=True)
SALES=9308123
rows=[
 ("Sales",9308123,"in-store 6,866,999 + Wolt and Foodora 2,441,124",False,False,False),
 ("Cost of sales, after supplier rebate",3061123,None,False,False,False),
 ("Gross profit",6247000,"includes supplier rebate 331,215",True,False,False),
 ("People",3002358,None,False,False,False),
 ("Delivery commission",788849,None,False,False,False),
 ("Royalty, notional (7%, not paid today)",651569,None,False,False,True),
 ("Rent",378093,None,False,False,False),
 ("Other running costs",1123757,None,False,False,False),
 ("EBITDA",302374,None,True,True,False),
]
bx=7.1; bw=W-M-bx
y=1.65
for label,v,sub,bold,pink,dashed in rows:
    rh=0.64 if sub else 0.46
    col=PINK if pink else TEXT
    lh=0.3
    text(s1,M,y+(0.04 if sub else 0.08),4.7,lh,label,15,col,bold=bold)
    if sub: text(s1,M,y+0.33,4.7,0.22,sub,11,MUTED)
    text(s1,5.3,y+(0.04 if sub else 0.08),1.6,lh,f"{v:,}",15,col,bold=bold,align=PP_ALIGN.RIGHT)
    bl=max(v/SALES*bw,0.03); by=y+(0.11 if sub else 0.15)
    if dashed: rect(s1,bx,by,bl,0.14,None,PINK,1.25,dash=True)
    else: rect(s1,bx,by,bl,0.14,PINK)
    y+=rh
    ln=rect(s1,M,y-0.01,W-2*M,0.01,HAIR)
text(s1,M,y+0.15,12,0.3,"Cost of sales is sales less gross profit. Other running costs groups 18 smaller lines.",12,MUTED)

# ---- Slide 2
s2=base(True)
text(s2,M,0.95,12,0.55,"Out of every 100 kr of sales",32,TEXT,bold=True)
segs=[("Cost of sales","32.89",32.89,dict(fill=HAIR,line=HAIR),"What the food and drink costs, after the supplier rebate."),
 ("People","32.26",32.26,dict(fill=PLUM,line=PLUM),"The whole team, plus employer tax, pension and holiday pay."),
 ("Delivery commission","8.47",8.47,dict(fill=MUTED,line=MUTED),"What Wolt and Foodora keep on delivery orders."),
 ("Royalty, notional","7.00",7.00,dict(fill=None,line=PINK,dash=True),"A 7% brand fee shown for illustration. Not paid today."),
 ("Rent","4.06",4.06,dict(fill=SOFT,line=SOFT),"Rent for the two shops."),
 ("Other running costs","12.07",12.07,dict(fill=PANEL,line=HAIR),"Supplies, utilities, cleaning, travel, marketing, card and bank fees, insurance, accounts, software."),
 ("EBITDA","3.25",3.25,dict(fill=PINK,line=PINK),"What is left before tax, interest and depreciation.")]
tw=W-2*M; x=M
for n,f,v,st,_ in segs:
    w=tw*v/100
    rect(s2,x,1.7,w,0.75,st['fill'],st['line'],1.25 if st.get('dash') else 0.75,st.get('dash',False))
    x+=w
y=2.8
for n,f,v,st,line in segs:
    pk=(n=="EBITDA")
    rect(s2,M,y+0.14,0.24,0.24,st['fill'],st['line'],1.25 if st.get('dash') else 0.75,st.get('dash',False))
    text(s2,M+0.45,y,3.0,0.52,n,16,PINK if pk else TEXT,bold=True,anchor=MSO_ANCHOR.MIDDLE)
    text(s2,3.9,y,1.7,0.52,f"{f} kr",24,PINK if pk else TEXT,bold=True,align=PP_ALIGN.RIGHT,anchor=MSO_ANCHOR.MIDDLE)
    text(s2,6.0,y,W-M-6.0,0.52,line,13,MUTED,anchor=MSO_ANCHOR.MIDDLE)
    y+=0.55
    rect(s2,M,y-0.015,W-2*M,0.01,HAIR)
prs.save(out)
