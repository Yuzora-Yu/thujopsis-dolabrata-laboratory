"""Render the canonical research records into dated, in-world print editions."""
from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape
import json
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "private" / "record-media"
QA = ROOT / ".work" / "qa" / "record-media"
OUT.mkdir(parents=True, exist_ok=True)
QA.mkdir(parents=True, exist_ok=True)
fonts = Path(r"C:\Windows\Fonts")
for name, filename in [("Gothic", "YuGothR.ttc"), ("Mincho", "yumin.ttf"), ("Office", "msgothic.ttc")]:
    pdfmetrics.registerFont(TTFont(name, str(fonts / filename), subfontIndex=0))

W, H = A4
X = 48
BODY = W - 2 * X - 12
STYLES = {
    "spec": ("Gothic", "#245950", "#e9f2ee", "共同設備仕様", "strip"),
    "bench": ("Office", "#535d50", "#eff0e9", "機器試験票", "form"),
    "transfer": ("Gothic", "#30475d", "#e8edf1", "設備・資料移管", "strip"),
    "evaluation": ("Gothic", "#263f62", "#e9eef6", "評価資料", "strip"),
    "minutes": ("Mincho", "#37342d", "#eeece6", "議事記録", "formal"),
    "memo": ("Mincho", "#484337", "#f3f0e7", "手控え", "memo"),
    "letter": ("Mincho", "#483c30", "#f0ece2", "回答書控え", "formal"),
    "ledger": ("Office", "#414c4e", "#eaeeee", "管理簿複写", "form"),
    "maintenance": ("Gothic", "#3f5861", "#e8eff0", "施設保守・作業完了", "strip"),
    "operations": ("Gothic", "#1f4a44", "#e3ece7", "区画運用報告", "strip"),
}


def render(record, style_key, target):
    font, accent_hex, pale_hex, register, frame = STYLES[style_key]
    accent, pale = colors.HexColor(accent_hex), colors.HexColor(pale_hex)
    dark = colors.HexColor("#232824")
    compact = record["id"] in {"YH-2013-014", "ENV-2022-031"}
    title = ParagraphStyle("title", fontName=font, fontSize=21, leading=29, wordWrap="CJK", textColor=dark, spaceAfter=15)
    base = ParagraphStyle("body", fontName=font, fontSize=10.1 if compact else 10.6, leading=16.1 if compact else 17.6, wordWrap="CJK", textColor=dark, spaceAfter=6 if compact else 9)
    sub = ParagraphStyle("sub", parent=base, fontSize=12.4, leading=18.5, spaceBefore=9 if compact else 12, spaceAfter=4 if compact else 5, textColor=accent, keepWithNext=True)
    meta = ParagraphStyle("meta", parent=base, fontSize=9, leading=15, textColor=accent, spaceAfter=6)
    cell = ParagraphStyle("cell", parent=base, fontSize=9.2, leading=13.4 if compact else 14.4, spaceAfter=0)
    flow = []

    def p(text, style=base):
        return Paragraph(escape(str(text)).replace("\n", "<br/>"), style)

    def sections(items):
        for name, text in items:
            flow.extend([p(name, sub), p(text)])

    def table(headers, rows):
        values = [headers, *rows]
        importance = [max(8, min(42, max(len(str(row[i])) for row in values))) for i in range(len(headers))]
        widths = [BODY * weight / sum(importance) for weight in importance]
        t = Table([[p(value, cell) for value in row] for row in values], colWidths=widths, repeatRows=1, hAlign="LEFT")
        lines = [("BACKGROUND", (0, 0), (-1, 0), pale), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                 ("LINEBELOW", (0, 0), (-1, 0), .65, accent), ("LINEBELOW", (0, 1), (-1, -1), .3, colors.HexColor("#bec9c1")),
                 ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                 ("TOPPADDING", (0, 0), (-1, -1), 5 if compact else 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 5 if compact else 7)]
        if frame == "form":
            lines.append(("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#afb9b4")))
        t.setStyle(TableStyle(lines))
        flow.extend([t, Spacer(1, 10)])

    flow.extend([p(record.get("kindLabel", register), meta), p(record["title"], title)])
    info = [["作成", record["date"]], ["管理・作成者", record["owner"]]]
    if record.get("updated"):
        info.append(["最終更新", record["updated"]])
    if frame == "form":
        table(["管理欄", "記載"], info)
    else:
        for label, value in info:
            flow.append(p(label + "　" + value, meta))
        flow.append(Spacer(1, 6))
    sections(record.get("sections", []))
    for t in record.get("tables", []):
        flow.append(p(t["caption"] + ("　" + t["date"] if t.get("date") else ""), sub))
        table(t["head"], t["rows"])
    for entry in record.get("entries", []):
        flow.extend([p(entry["at"] + "　" + entry.get("by", ""), sub), p(entry["text"])])
    if record.get("signoff"):
        flow.append(p(record["signoff"], meta))
    for note in record.get("addenda", []):
        flow.append(p("追記　" + note["date"] + "　" + note["by"], sub))
        sections(note.get("sections", []))
    if record.get("quote"):
        flow.append(p(record["quote"]))

    def stationery(c, doc):
        c.setFillColor(accent)
        c.setStrokeColor(accent)
        if frame == "strip":
            c.rect(X + 6, H - 57, BODY, 15, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.setFont(font, 8)
            c.drawString(X + 13, H - 52, register)
            c.drawRightString(W - X - 13, H - 52, record["id"])
        else:
            c.setFont(font, 9)
            c.drawString(X + 6, H - 45, register)
            c.drawRightString(W - X - 6, H - 45, record["id"])
            c.setLineWidth(.55 if frame == "memo" else 1.1)
            c.line(X + 6, H - 54, W - X - 6, H - 54)
        c.setStrokeColor(colors.HexColor("#bac2bc"))
        c.setLineWidth(.4)
        c.line(X + 6, 45, W - X - 6, 45)
        c.setFillColor(colors.HexColor("#55645d"))
        c.setFont("Gothic", 7.6)
        c.drawString(X + 6, 31, record["id"] + "　／　あすなろ・作品内資料")
        c.drawRightString(W - X - 6, 31, str(doc.page))

    doc = SimpleDocTemplate(str(target), pagesize=A4, leftMargin=X, rightMargin=X,
                            topMargin=70, bottomMargin=58, title=record["title"], author=record["owner"])
    doc.build(flow, onFirstPage=stationery, onLaterPages=stationery)


def scan(pdf, target, seed):
    """A legible first-page copy; the full PDF remains available beside it."""
    image = Image.open(BytesIO(subprocess.check_output(
        ["pdftoppm", "-f", "1", "-l", "1", "-r", "155", "-singlefile", "-png", str(pdf)]))).convert("L")
    image = image.point(lambda n: int(21 + n * .875))
    image = image.rotate(-.56, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=239)
    w, h = image.size
    texture = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(texture)
    rng = random.Random(seed)
    for _ in range(950):
        x, y = rng.randrange(w), rng.randrange(h)
        draw.point((x, y), fill=rng.randrange(4, 24))
    from PIL import ImageChops
    image = ImageChops.subtract(image, texture.filter(ImageFilter.GaussianBlur(.34)))
    image.save(target, quality=90, optimize=True, dpi=(155, 155))


payload = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
records = {r["id"]: r for r in payload["documents"]}
for entry in payload["media"]:
    out = OUT / entry["filename"]
    if entry["type"] == "application/pdf":
        render(records[entry["id"]], entry["style"], out)
        for prior in QA.glob(entry["id"] + "-*.png"):
            prior.unlink()
        subprocess.run(["pdftoppm", "-r", "88", "-png", str(out), str(QA / entry["id"])], check=True)
    else:
        scan(OUT / (entry["id"] + ".pdf"), out, entry["id"])

scan(ROOT / "public/assets/archive/ks-1943-06.pdf",
     ROOT / "public/assets/archive/ks-1943-06-scan.jpg", "KS-1943-06")
print(f"Created {len(payload['media'])} protected files and the public KS-1943-06 archival scan.")
