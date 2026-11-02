from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib import colors

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/archive';OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('JP',r'C:\Windows\Fonts\YuGothR.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('Mincho',r'C:\Windows\Fonts\yumin.ttf'))
W,H=A4
def para(c,text,x,y,width,size=10,leading=18,font='Mincho'):
 p=Paragraph(text,ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,wordWrap='CJK',textColor=colors.HexColor('#302e28')))
 _,height=p.wrap(width,1000);p.drawOn(c,x,y-height);return y-height
def paper(name,title,date):
 c=canvas.Canvas(str(OUT/name),pagesize=A4);c.setTitle(title);c.setAuthor('産業継続研究資料 保存室')
 c.setFillColor(colors.HexColor('#f5f1e6'));c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(colors.HexColor('#302e28'));c.setStrokeColor(colors.HexColor('#504a40'))
 c.setFont('JP',8);c.drawString(38,H-30,'産業継続研究資料 保存室　複写収録');c.drawRightString(W-38,H-30,date)
 return c

c=paper('ks-1943-06.pdf','第二種国土継続研究 実施概要','収蔵番号 KS-1943-06')
c.setLineWidth(.7);c.rect(40,55,W-80,H-110)
c.setFont('Mincho',14);c.drawCentredString(W/2,H-105,'第二種國土繼續研究')
c.setFont('Mincho',21);c.drawCentredString(W/2,H-145,'實　施　概　要')
c.setFont('Mincho',11);c.drawRightString(W-65,H-185,'昭和十八年六月　継舟計畫準備室')
y=H-232
sections=[
 ('一　目的','資源途絶ノ際ニ於テ生活基盤及ビ技術ノ連續ヲ確保スル爲、食糧、動力、設備並ニ人的資源ノ保全方法ヲ定ム。'),
 ('二　配分ノ序列','利用可能ナル資源ノ總量ニ應ジ保存優先、隨伴、負擔ノ區分ヲ設ク。標準條件下ニ於ケル作業適應ヲ以テ判定ス。'),
 ('三　設備ノ統一','個別ノ要求ニ依ル設備變更ヲ抑ヘ、共同區畫ニ於ケル條件ヲ統一ス。標準ニ適合セザル記録ハ別綴トシ、集計ニ含メズ。'),
 ('四　個票ノ管理','區分ノ確定及ビ變更ハ主管者ノ決裁ニ依ル。本人ノ申出ハ判定資料トシテ記録スルモ、退出ノ決定トハ區別ス。'),
]
for title,text in sections:
 c.setFont('Mincho',12);c.drawString(68,y,title);y-=25;y=para(c,text,80,y,W-158,11,21)-30
c.setFont('JP',8);c.drawString(66,88,'保存注記：1945年に研究凍結。処理簿 KS-1945-02 を参照。')
c.save()

def newspaper(name,issue,headline,subhead,paragraphs,code):
 c=paper(name,'夕凪日報 '+issue,code)
 c.setFont('Mincho',34);c.drawString(40,H-90,'夕 凪 日 報')
 c.setFont('Mincho',10);c.drawRightString(W-40,H-72,issue+'　地域面')
 c.setFont('JP',8);c.drawRightString(W-40,H-92,'社会・暮らし　｜　保存切抜')
 c.setLineWidth(2);c.line(40,H-110,W-40,H-110)
 c.setFont('Mincho',23);c.drawString(44,H-153,headline)
 c.setFont('Mincho',17);c.drawString(44,H-183,subhead)
 c.setLineWidth(.5);c.line(44,H-202,W-44,H-202)
 y=H-230
 for text in paragraphs:y=para(c,'　'+text,50,y,W-100,12,23)-16
 c.setFont('JP',8);c.drawString(50,70,'複写元：地域版保存紙面　／　原本の改変なし')
 c.save()

newspaper('younagi-20211104.pdf','2021年11月4日（木） 初刷','交流施設前理事長死亡','服毒による自殺か',[
 '産業支援交流施設「あすなろ」の前理事長、榊原恒一氏（70）が三日朝、施設内で死亡した。施設運営事務局は本紙取材に、本人の服用による可能性があると説明した。',
 '同氏は二〇一〇年にあすなろ産業振興機構を設立。二〇一二年に施設を開設し、生活支援の道具や設備を、企業と利用者が共同で研究する事業を進めてきた。近年は施設内で療養していたという。',
 '一方、家族への詳しい説明は行われておらず、経緯の確認が続いている。施設は同日、病気による逝去とする告知を掲載した。',
 '関係者によると、榊原氏は共同事業の記録について運営側に説明を求めていた。事務局は、その内容と今回の死亡との関係について回答していない。',
],'収蔵番号 NK-2021-1104')
newspaper('younagi-20211105.pdf','2021年11月5日（金）','おわびと訂正','榊原恒一氏に関する記事について',[
 '四日付地域版初刷の榊原恒一氏の死亡に関する記事で、自殺の可能性について記しましたが、死因及び本人の意思を裏付ける確認が取れなかったため、当該記述を撤回します。',
 '取材時の施設側説明と、確認済みの事実の区別が不十分でした。関係者の皆様におわびいたします。',
 '施設からの公式告知は、病気による逝去としております。本紙は、死亡に至る経緯を引き続き確認します。',
],'収蔵番号 NK-2021-1105')
print('Created 3 archival PDFs.')
