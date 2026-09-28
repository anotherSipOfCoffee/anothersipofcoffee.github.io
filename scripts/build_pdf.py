"""Build the website portfolio from the supplied PF-2026_v27-ENG.pdf.
Usage: python scripts/build_pdf.py /path/to/PF-2026_v27-ENG.pdf
Requires reportlab and pypdf. Retains source drawing spreads without rasterizing.
"""
from pathlib import Path
from io import BytesIO
import sys
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
root=Path(__file__).resolve().parents[1]
source=PdfReader(sys.argv[1]);w,h=1008,612
font=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
pdfmetrics.registerFont(TTFont('Body',str(font)))
pdfmetrics.registerFont(TTFont('Bold',str(font.with_name('DejaVuSans-Bold.ttf'))))
buf=BytesIO();c=canvas.Canvas(buf,pagesize=(w,h))
c.setFillColorRGB(.91,.91,.91);c.rect(0,0,w,h,fill=1,stroke=0)
c.setFillColorRGB(.20,.20,.20);c.setFont('Body',48);c.drawCentredString(w/2,310,'PORTFOLIO')
c.setFont('Body',18);c.drawCentredString(w/2,274,'TAUTVYDAS GRIGALAUSKAS')
c.setFont('Body',10);c.drawCentredString(w/2,68,'SELECTED ARCHITECTURE · 2024–2025');c.showPage()
c.setFillColorRGB(.91,.91,.91);c.rect(0,0,w,h,fill=1,stroke=0)
c.setStrokeColorRGB(1,1,1);c.setLineWidth(2);c.line(w/2,0,w/2,h)
c.setFillColorRGB(.22,.22,.22);c.setFont('Body',28);c.drawString(70,300,'CONTENTS')
for i,(name,kind,page) in enumerate([('JOCHY TOWER','PROJECT PROPOSAL','03'),('SEMEY MALL','PROJECT PROPOSAL','07'),('ETERNAL PEARLS','CONTEST PROPOSAL','10'),('URBAN BLOCK','ACADEMIC PROJECT','12')]):
 y=380-i*55;c.setFont('Bold',12);c.drawString(550,y,f'{i+1:02d}. {name}');c.setFont('Body',9);c.drawString(550,y-17,kind);c.drawRightString(950,y,page)
c.showPage();c.save();buf.seek(0)
writer=PdfWriter()
for p in PdfReader(buf).pages:writer.add_page(p)
for p in source.pages[2:14]:writer.add_page(p)
writer.add_metadata({'/Title':'Tautvydas Grigalauskas — Selected Architecture','/Author':'Tautvydas Grigalauskas'})
for label,index in [('Contents',1),('Jochy Tower',2),('Semey Mall',6),('Eternal Pearls',9),('Urban Block',11)]:writer.add_outline_item(label,index)
writer.write(root/'portfolio/Tautvydas-Grigalauskas-Portfolio.pdf')
print('Built 14-page portfolio with source project spreads and bookmarks')
