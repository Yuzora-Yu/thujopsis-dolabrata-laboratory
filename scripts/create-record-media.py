"""Render the canonical research records into dated, in-world print editions."""
from datetime import datetime
from pathlib import Path
from io import BytesIO
from xml.sax.saxutils import escape
import json
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Path as InkPath, Rect, String
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

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
    "group-review": ("Gothic", "#263f62", "#e9eef6", "評価統括／結果提出", "strip"),
    "individual": ("Office", "#414948", "#edf0eb", "評価統括／個票再録", "form"),
    "consent": ("Mincho", "#423c36", "#f1eee8", "居住環境実証部会", "form"),
    "trial-intake": ("Office", "#3d4c55", "#eaf0f1", "居住実証運用室／評価個票", "form"),
    "daily-check": ("Office", "#3d4949", "#edf1ef", "評価統括／検査記録保管", "form"),
    "minutes": ("Mincho", "#37342d", "#eeece6", "議事記録", "formal"),
    "memo": ("Mincho", "#484337", "#f3f0e7", "手控え", "memo"),
    "letter": ("Mincho", "#483c30", "#f0ece2", "回答書控え", "formal"),
    "ledger": ("Office", "#414c4e", "#eaeeee", "管理簿複写", "form"),
    "watch-log": ("Office", "#393c3b", "#eeeeeb", "居住実証運用室／当直連絡", "form"),
    "workshop-receipt": ("Office", "#574937", "#f1ebe2", "工房受付／預かり控え", "form"),
    "shop-change": ("Office", "#554a37", "#f1ece3", "工房／製作変更控え", "form"),
    "maintenance": ("Gothic", "#3f5861", "#e8eff0", "施設保守・作業完了", "strip"),
    "operations": ("Gothic", "#1f4a44", "#e3ece7", "区画運用報告", "strip"),
    "decision": ("Gothic", "#313c52", "#eceef2", "事業再編／決裁原議", "strip"),
}

def signature_comparison(labels, font):
    drawing = Drawing(BODY, 72)
    column = (BODY - 16) / 2
    # Two extracts reproduce the same fictional fragment. The last stroke has
    # a small break that remains in both copies, including the older approval.
    strokes = [
        (1.25, (4, 25), [(13, 29, 23, 36, 30, 33), (36, 30, 20, 23, 19, 17)]),
        (1.05, (28, 36), [(24, 28, 23, 18, 32, 15), (39, 12, 48, 16, 52, 25)]),
        (.90, (34, 23), [(42, 32, 53, 35, 56, 29), (57, 25, 49, 18, 45, 16)]),
        (1.20, (58, 32), [(58, 25, 55, 16, 63, 14), (69, 13, 75, 17, 78, 20)]),
        (.78, (82, 23), [(85, 25, 89, 29, 91, 29)]),
    ]
    for i, label in enumerate(labels):
        left = i * (column + 16)
        drawing.add(String(left, 60, label, fontName=font, fontSize=9))
        drawing.add(Rect(left, 6, column, 47, fillColor=colors.HexColor("#f6f5ef"),
                         strokeColor=colors.HexColor("#a2a39e"), strokeWidth=.5))
        start = left + (column - 95) / 2
        for weight, (x, y), curves in strokes:
            ink = InkPath(strokeColor=colors.HexColor("#373933"), strokeWidth=weight,
                          fillColor=None, strokeLineCap=1)
            ink.moveTo(start + x, y + 2)
            for x1, y1, x2, y2, x3, y3 in curves:
                ink.curveTo(start + x1, y1 + 2, start + x2, y2 + 2, start + x3, y3 + 2)
            drawing.add(ink)
    return drawing


def render(record, style_key, target):
    font, accent_hex, pale_hex, register, frame = STYLES[style_key]
    accent, pale = colors.HexColor(accent_hex), colors.HexColor(pale_hex)
    dark = colors.HexColor("#232824")
    compact = style_key in {"individual", "workshop-receipt", "trial-intake", "daily-check", "decision", "watch-log", "shop-change"} or record["id"] in {"YH-2013-014", "ENV-2022-031", "HC-2021-031-R"}
    tables = record.get("tables", [])
    participant_sheet = next((item for item in tables if item.get("participantCopy")), None)
    participant_form = {
        "heading": "日次確認票",
        "series": "生活環境継続試験",
        "formCode": "検査様式 02",
        "instruction": "体調や設備の利用について、ご記入ください。",
        "reminder": "次回の確認時刻まで、この控えはお手元にお持ちください。",
    }
    if participant_sheet and isinstance(participant_sheet["participantCopy"], dict):
        participant_form.update(participant_sheet["participantCopy"])
    issue_date = datetime.strptime(record.get("updated", record["date"]), "%Y年%m月%d日").strftime("%Y%m%d")
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

    def table(headers, rows, widths=None):
        values = [headers, *rows]
        if widths is None:
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

    if participant_sheet:
        flow.extend([p("本人控え", meta), p(participant_form["heading"], title),
                     p(participant_form["instruction"]), Spacer(1, 8)])
        table(participant_sheet["head"], participant_sheet["rows"], [122, BODY - 122])
        flow.append(p(participant_form["reminder"], meta))
        flow.append(PageBreak())
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
    for t in tables:
        if t is participant_sheet:
            continue
        flow.append(p(t["caption"] + ("　" + t["date"] if t.get("date") else ""), sub))
        widths = [BODY * weight for weight in (.33, .32, .35)] if style_key == "group-review" else None
        table(t["head"], t["rows"], widths)
    if record.get("signatureClips"):
        flow.extend([p("署名欄の複写（右端）", sub), signature_comparison(record["signatureClips"], font)])
    for entry in record.get("entries", []):
        if entry["at"] == record.get("printFollowupFrom"):
            flow.extend([PageBreak(), p("後日受領した書面", title)])
        flow.extend([p(entry["at"] + "　" + entry.get("by", ""), sub), p(entry["text"])])
    if record.get("signoff"):
        flow.append(p(record["signoff"], meta))
    addendum_title = {"decision": "決裁後の追記", "watch-log": "保存時の照合注記", "shop-change": "納入後の訂正・保全"}.get(style_key)
    if addendum_title and record.get("addenda"):
        flow.extend([PageBreak(), p(addendum_title, title)])
    for note in record.get("addenda", []):
        flow.append(p("追記　" + note["date"] + "　" + note["by"], sub))
        sections(note.get("sections", []))
    if record.get("quote"):
        flow.append(p(record["quote"]))

    def stationery(c, doc):
        c.setDateFormatter(lambda *_: "D:" + issue_date)
        c.setFillColor(accent)
        c.setStrokeColor(accent)
        if frame == "strip":
            c.rect(X + 6, H - 57, BODY, 15, stroke=0, fill=1)
            c.setFillColor(colors.white)
            c.setFont(font, 8)
            c.drawString(X + 13, H - 52, register)
            c.drawRightString(W - X - 13, H - 52, record["id"])
        else:
            recipient_copy = participant_sheet and doc.page == 1
            c.setFont(font, 9)
            c.drawString(X + 6, H - 45, participant_form["series"] if recipient_copy else register)
            c.drawRightString(W - X - 6, H - 45, participant_form["formCode"] if recipient_copy else record["id"])
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

if "--records-only" not in sys.argv:
    archive = ROOT / "public/assets/archive"
    for record in ("KS-1943-06", "KS-1945-02"):
        name = record.lower()
        scan(archive / (name + ".pdf"), archive / (name + "-scan.jpg"), record)
    print("Updated the public historical scans.")
print(f"Created {len(payload['media'])} protected files.")
