"""Typeset the 2012 leaflet's inside spread from its published transcript."""

from pathlib import Path
from subprocess import check_output, run
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from pypdf import PdfReader

import argparse
import hashlib
import json
import re
import shutil
import sys
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'public/assets/tenants/opening-leaflet-20120401.pdf'
PREVIEW = OUTPUT.with_suffix('.png')
W, H = landscape(A4)
INK = colors.HexColor('#183d39')
MUTED = colors.HexColor('#627269')
LIME = colors.HexColor('#c2d95c')


def source_material():
    source = """
      import {tenantMaterials} from './src/world/tenant-materials.mjs';
      console.log(JSON.stringify(tenantMaterials['0016'].find(m=>m.slug==='opening-leaflet')));
    """
    return json.loads(check_output(
        ['node', '--input-type=module', '-e', source], cwd=ROOT, encoding='utf-8'
    ))


def paragraph(c, text, x, top, width, *, font='JP', size=10.5, leading=18.5, bottom):
    p = Paragraph(escape(text), ParagraphStyle(
        'leaflet', fontName=font, fontSize=size, leading=leading,
        wordWrap='CJK', textColor=INK,
    ))
    _, height = p.wrap(width, H)
    if top - height < bottom:
        raise ValueError(f'Leaflet paragraph exceeds its panel: {text}')
    p.drawOn(c, x, top - height)
    return top - height


def room_icon(c, kind, x, y):
    """Small printed pictograms, not room plans or equipment specifications."""
    c.saveState()
    c.translate(x, y)
    c.setLineWidth(1.2)
    c.setStrokeColor(INK)
    c.setFillColor(colors.HexColor('#eef2dd'))
    if kind == 'office':
        c.roundRect(0, 0, 40, 30, 3, fill=1, stroke=0)
        c.line(8, 15, 31, 15)
        c.line(11, 15, 11, 5)
        c.line(28, 15, 28, 5)
        c.rect(15, 19, 12, 7, fill=0, stroke=1)
    elif kind == 'meeting':
        c.roundRect(0, 0, 40, 30, 3, fill=1, stroke=0)
        c.roundRect(10, 9, 20, 12, 2, fill=0, stroke=1)
        for xx in (14, 25):
            c.line(xx, 4, xx, 6)
            c.line(xx, 24, xx, 26)
    elif kind == 'workshop':
        c.roundRect(0, 0, 40, 30, 3, fill=1, stroke=0)
        c.line(9, 8, 31, 8)
        c.line(12, 8, 12, 3)
        c.line(28, 8, 28, 3)
        c.rect(12, 12, 8, 12, fill=0, stroke=1)
        c.line(24, 12, 29, 23)
    else:
        c.roundRect(0, 0, 40, 30, 3, fill=1, stroke=0)
        c.circle(13, 21, 3, fill=0, stroke=1)
        c.circle(27, 21, 3, fill=0, stroke=1)
        c.line(9, 11, 31, 11)
        c.line(12, 11, 12, 5)
        c.line(28, 11, 28, 5)
    c.restoreState()


def create_leaflet():
    material = source_material()
    assert material['date'] == '2012.04.01'
    lead, facilities, visiting = material['paragraphs']
    catch, lead = lead.split('。', 1)

    pdfmetrics.registerFont(TTFont('JP', r'C:\Windows\Fonts\YuGothR.ttc', subfontIndex=0))
    pdfmetrics.registerFont(TTFont('JPBold', r'C:\Windows\Fonts\YuGothB.ttc', subfontIndex=0))
    pdfmetrics.registerFont(TTFont('Mincho', r'C:\Windows\Fonts\yumin.ttf'))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1, invariant=1)
    c.setTitle(material['title'] + ' 中面')
    c.setAuthor('あすなろ産業支援交流施設')
    c.setSubject('2012年4月1日発行 / 二つ折り開設案内・中面')
    c.setCreator('ナギサ編集室')
    c.setProducer('ナギサ編集室')
    c.setDateFormatter(lambda *_: 'D:20120401000000')

    c.setFillColor(colors.HexColor('#f4f1e8'))
    c.rect(0, 0, W / 2, H, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#fffdf8'))
    c.rect(W / 2, 0, W / 2, H, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor('#d9ddcf'))
    c.setLineWidth(.45)
    c.line(W / 2, 0, W / 2, H)

    c.drawImage(str(ROOT / 'public/assets/logo.png'), 44, 528, width=39, height=32.6, mask='auto')
    c.setFillColor(INK)
    c.setFont('JPBold', 20)
    c.drawString(94, 545, 'あすなろ')
    c.setFont('JP', 8.5)
    c.drawString(95, 528, '産業支援交流施設')

    c.setFillColor(INK)
    c.setFont('Mincho', 36)
    c.drawString(43, 449, catch.split('、')[0] + '、')
    c.drawString(43, 394, catch.split('、')[1] + '。')
    paragraph(c, lead, 47, 348, 314, size=11.2, leading=21.5, bottom=255)

    c.setStrokeColor(INK)
    c.setLineWidth(.7)
    c.line(47, 126, 152, 126)
    c.setFillColor(INK)
    c.setFont('Helvetica', 17)
    c.drawString(47, 93, '2012.04.01')
    c.setFont('Helvetica', 9)
    c.drawString(179, 95, 'OPEN')
    c.setFont('JP', 9)
    c.drawString(48, 67, '開設のご案内')
    c.setFillColor(LIME)
    c.rect(47, 157, 21, 5, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#a6bba6'))
    c.rect(71, 157, 21, 5, fill=1, stroke=0)
    c.setFillColor(INK)
    c.rect(95, 157, 21, 5, fill=1, stroke=0)

    right = W / 2 + 43
    c.setFillColor(MUTED)
    c.setFont('JP', 9)
    c.drawString(right, 546, '4階 施設のご案内')
    c.setFillColor(INK)
    c.setFont('JPBold', 21)
    c.drawString(right, 506, '仕事とものづくりを、')
    c.drawString(right, 473, '同じ場所で。')

    for kind, label, x, y in [
        ('office', '個室オフィス', right, 408),
        ('meeting', '会議室', right + 173, 408),
        ('workshop', '工房', right, 354),
        ('exchange', '交流スペース', right + 173, 354),
    ]:
        room_icon(c, kind, x, y)
        c.setFillColor(INK)
        c.setFont('JPBold', 9.5)
        c.drawString(x + 49, y + 10, label)

    paragraph(c, facilities, right, 321, 333, size=9.9, leading=18.2, bottom=216)

    c.setFillColor(colors.HexColor('#eef1df'))
    c.rect(right, 74, 333, 127, fill=1, stroke=0)
    c.setFillColor(LIME)
    c.rect(right, 74, 3, 127, fill=1, stroke=0)
    c.setFillColor(INK)
    c.setFont('JPBold', 11)
    c.drawString(right + 18, 177, '見学のご案内')
    paragraph(c, visiting, right + 18, 160, 296, size=10.5, leading=19, bottom=88)

    c.setFillColor(MUTED)
    c.setFont('JP', 7)
    c.drawString(right, 42, 'あすなろ産業支援交流施設  開設案内')
    c.drawRightString(W - 43, 42, '2012年4月1日')
    c.showPage()
    c.save()
    print(OUTPUT.relative_to(ROOT))


def create_preview():
    renderer = shutil.which('pdftoppm')
    bundled = Path(sys.executable).resolve().parents[1] / 'native/poppler/Library/bin/pdftoppm.exe'
    if not renderer and bundled.exists():
        renderer = str(bundled)
    if not renderer:
        raise RuntimeError('pdftoppm is required to render the leaflet preview')
    run([renderer, '-png', '-singlefile', '-scale-to', '1800',
         str(OUTPUT), str(PREVIEW.with_suffix(''))], check=True)


def update_revision():
    """The PDF and its rendered preview use one publication revision."""
    revision = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()[:16]
    source = ROOT / 'src/world/tenant-materials.mjs'
    previous = source_material()['facsimile']['revision']
    text = source.read_text(encoding='utf-8')
    field = "revision:'" + previous + "'"
    if text.count(field) != 1:
        raise ValueError('The opening leaflet revision field is not unique')
    updated = text.replace(field, "revision:'" + revision + "'")
    if updated != text:
        source.write_text(updated, encoding='utf-8', newline='\n')
    print('Publication revision: ' + revision)


def verify_leaflet(pdf_path):
    material = source_material()
    pdf = PdfReader(pdf_path)
    if len(pdf.pages) != 1:
        raise ValueError('The leaflet inside spread must be one page')
    page = pdf.pages[0]
    if abs(float(page.mediabox.width) - W) > .1 or abs(float(page.mediabox.height) - H) > .1:
        raise ValueError('The leaflet is not an A4 landscape inside spread')
    compact = lambda text: re.sub(r'\s+', '', unicodedata.normalize('NFKC', text))
    text = compact(page.extract_text())
    for paragraph in material['paragraphs']:
        if compact(paragraph) not in text:
            raise ValueError('PDF and published transcript differ: ' + paragraph)
    expected = {
        '/Title': material['title'] + ' 中面',
        '/Author': 'あすなろ産業支援交流施設',
        '/Creator': 'ナギサ編集室',
        '/CreationDate': 'D:20120401000000',
        '/ModDate': 'D:20120401000000',
    }
    for key, value in expected.items():
        if pdf.metadata.get(key) != value:
            raise ValueError('Unexpected leaflet metadata: ' + key)
    fonts = []
    for reference in page['/Resources']['/Font'].values():
        font = reference.get_object()
        if font.get('/Subtype') == '/TrueType':
            descriptor = font['/FontDescriptor']
            if not descriptor.get('/FontFile2') and not descriptor.get('/FontFile3'):
                raise ValueError('Missing embedded Japanese typeface')
            fonts.append(str(font['/BaseFont']))
    if not fonts:
        raise ValueError('No embedded Japanese typeface')
    print(json.dumps({'pages': 1, 'canonicalParagraphs': 3, 'fontsEmbedded': fonts,
                      'publicationDate': material['date']}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify', action='store_true', help='Inspect the existing PDF without regenerating it')
    parser.add_argument('--file', type=Path, default=OUTPUT)
    args = parser.parse_args()
    if not args.verify:
        if args.file != OUTPUT:
            parser.error('--file is only supported with --verify')
        create_leaflet()
        create_preview()
        update_revision()
    verify_leaflet(args.file)
