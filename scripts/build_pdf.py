"""Build the downloadable portfolio from the current project HTML (requires reportlab)."""
from pathlib import Path
import re, html
from io import BytesIO
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape,A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
root=Path(__file__).resolve().parents[1]
font=Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
if font.exists():
 pdfmetrics.registerFont(TTFont('Body',str(font)))
 pdfmetrics.registerFont(TTFont('Heading',str(font.with_name('DejaVuSans-Bold.ttf'))))
else: raise RuntimeError('Install DejaVu Sans fonts before building the PDF.')
W,H=landscape(A4);m=40
c=canvas.Canvas(str(root/'portfolio/Tautvydas-Grigalauskas-Portfolio.pdf'),pagesize=(W,H))
c.setTitle('Tautvydas Grigalauskas — Selected Architecture');c.setAuthor('Tautvydas Grigalauskas')
style=ParagraphStyle('body',fontName='Body',fontSize=10,leading=15,textColor='#34373B')
page=0

def text(s,x,y,size=10,font='Body'):
 c.setFillColorRGB(.09,.10,.11);c.setFont(font,size);c.drawString(x,y,s)
def finish():
 global page
 page+=1;c.setStrokeColorRGB(.85,.85,.84);c.line(m,32,W-m,32)
 text('Tautvydas Grigalauskas · Selected architecture',m,20,8);text(f'{page:02d} / 08',W-m-40,20,8);c.showPage()
def picture(path,x,y,w,h):
 im=Image.open(root/path.lstrip('/')).convert('RGB');im.thumbnail((1600,1600));buffer=BytesIO();im.save(buffer,format='JPEG',quality=82,optimize=True);buffer.seek(0)
 image=ImageReader(buffer);iw,ih=image.getSize();r=min(w/iw,h/ih)
 c.drawImage(image,x+(w-iw*r)/2,y+(h-ih*r)/2,iw*r,ih*r,mask='auto')
text('SELECTED ARCHITECTURE · 2024–2025',m,440,11)
text('Tautvydas',m,355,46,'Heading');text('Grigalauskas',m,297,46,'Heading')
text('Architecture, computational design, and parametric systems.',m,240,12)
text('Jochy Tower · Eternal Pearls · Semey Mall · Urban Block',m,193,10)
text('anothersipofcoffee.github.io',m,120,10);finish()
for slug,title in [('jochy-tower','Jochy Tower'),('eternal-pearls','Eternal Pearls'),('semey-mall','Semey Mall'),('urban-block','Urban Block')]:
 s=(root/'projects'/slug/'index.html').read_text();label=html.unescape(re.search(r'<p class="label"[^>]*>(.*?)</p>',s)[1]);imgs=re.findall(r'<img src="([^"]+)"',s)
 text(label.upper(),m,H-50,10);text(title,m,H-86,27,'Heading')
 body=re.search(r'<div class="body"[^>]*>(.*?)</div>',s,re.S)[1];y=H-118
 for para in re.findall(r'<p>(.*?)</p>',body,re.S):
  p=Paragraph(para,style);_,h=p.wrap(245,450);p.drawOn(c,m,y-h);y-=h+14
 picture(imgs[0],315,65,W-355,H-175);finish()
 if len(imgs)>1:
  text('SELECTED VIEWS',m,H-50,10);text(title,m,H-86,27,'Heading')
  rows=1 if len(imgs)<=3 else 2;cw=(W-2*m-18)/2;ch=(H-165-(rows-1)*20)/rows
  for i,img in enumerate(imgs[1:]):
   x=m+(i%2)*(cw+18);y=H-115-(i//2+1)*ch-(i//2)*20
   picture(img,x,y+15,cw,ch-15);text(f'{i+2:02d} / {title}',x,y,8)
  finish()
c.save()
print('Built 8-page portfolio PDF')
