from pathlib import Path
from subprocess import check_output
import json
import sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.lib import colors

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/archive';OUT.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('JP',r'C:\Windows\Fonts\YuGothR.ttc',subfontIndex=0))
pdfmetrics.registerFont(TTFont('Mincho',r'C:\Windows\Fonts\yumin.ttf'))
W,H=A4
def para(c,text,x,y,width,size=10,leading=18,font='Mincho'):
 p=Paragraph(text,ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,wordWrap='CJK',textColor=colors.HexColor('#302e28')))
 _,height=p.wrap(width,1000);p.drawOn(c,x,y-height);return y-height
def paper(name,title,date,*,height=H):
 c=canvas.Canvas(str(OUT/name),pagesize=(W,height));c.setTitle(title);c.setAuthor('産業継続研究資料 保存室')
 c.setFillColor(colors.HexColor('#f5f1e6'));c.rect(0,0,W,height,fill=1,stroke=0)
 c.setFillColor(colors.HexColor('#302e28'));c.setStrokeColor(colors.HexColor('#504a40'))
 c.setFont('JP',8);c.drawString(38,height-30,'産業継続研究資料 保存室　複写収録');c.drawRightString(W-38,height-30,date)
 return c


def register_table(c, rows, widths, top, font, shade):
    table=Table(rows,colWidths=widths,rowHeights=[27]+[37]*(len(rows)-1))
    table.setStyle(TableStyle([
        ('FONTNAME',(0,0),(-1,-1),font),
        ('FONTSIZE',(0,0),(-1,-1),10),
        ('TEXTCOLOR',(0,0),(-1,-1),colors.HexColor('#302e28')),
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor(shade)),
        ('GRID',(0,0),(-1,-1),.5,colors.HexColor('#6e6a5e')),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',(0,0),(-1,-1),12),
    ]))
    width,height=table.wrapOn(c,W,H)
    table.drawOn(c,(W-width)/2,top-height)
    return top-height


def historical_registers():
    c=paper('ks-1945-02.pdf','継舟計画・研究凍結処理簿','収蔵番号 KS-1945-02')
    c.setDateFormatter(lambda *_: 'D:20170714000000')
    c.setLineWidth(.6)
    c.rect(51,93,W-102,H-158,stroke=1,fill=0)
    c.setFont('Mincho',18)
    c.drawCentredString(W/2,H-138,'繼舟計畫　研究凍結處理簿')
    c.setFont('Mincho',11)
    c.drawRightString(W-76,H-186,'昭和二十年九月　繼舟計畫整理班')
    c.line(74,H-203,W-74,H-203)
    para(c,'本日以後、新規ノ觀察及試驗ヲ停止ス。設備及記録ノ取扱ハ表ノ通リトス。',74,H-227,W-148,11,21)
    y=register_table(c,[
        ['項目','處置','整理先'],
        ['新規觀察及試驗','停止','各試驗係ニ通知'],
        ['設備及器具','返納','機材係'],
        ['個人別區分票','別置','所在受領簿ニ記載'],
    ],[125,90,W-363],H-309,'Mincho','#ebe6d6')
    para(c,'個人別區分票ハ研究繼續ノ爲ニ移管スベカラズ。所在ヲ記シタル受領簿ハ別綴トス。',74,y-42,W-148,11,21)
    c.setFont('Mincho',10)
    c.drawRightString(W-76,151,'整理班　取扱主任')
    c.setFont('JP',8)
    c.drawString(51,61,'保存室注記　2017年7月14日　紙資料から複写収録')
    c.save()

    c=paper('ks-1986-04.pdf','旧継続研究資料・整理記録','収蔵番号 KS-1986-04')
    c.setDateFormatter(lambda *_: 'D:20170714000000')
    c.setFillColor(colors.HexColor('#f8f7ef'))
    c.rect(49,104,W-98,H-170,stroke=0,fill=1)
    c.setStrokeColor(colors.HexColor('#4c514a'))
    c.setFillColor(colors.HexColor('#302e28'))
    c.setFont('JP',17)
    c.drawString(74,H-124,'旧継続研究資料　整理記録')
    c.setFont('JP',10)
    c.drawString(74,H-158,'受入　昭和61年4月')
    c.drawRightString(W-74,H-158,'資料整理係')
    c.line(74,H-178,W-74,H-178)
    para(c,'受入区分　史料保存<br/>引渡元　　旧保管者（民間保管）',74,H-198,W-148,10,18,'JP')
    y=register_table(c,[
        ['資料名','数量','受入確認'],
        ['第二種国土継続研究・実施概要','1冊','照合済'],
        ['継舟計画・研究凍結処理簿','1綴','照合済'],
        ['個人別区分票','-','未受領'],
    ],[248,57,W-453],H-270,'JP','#e8ebe3')
    c.setFont('JP',10)
    c.drawString(74,y-41,'取扱事項')
    para(c,'研究再開の承認書は受領していない。<br/>旧台帳の欠落箇所には、推定による個人情報の補記を行わない。',74,y-56,W-148,10,18,'JP')
    c.setStrokeColor(colors.HexColor('#777b70'))
    c.line(74,163,W-74,163)
    c.drawString(74,141,'受領処理　資料整理係')
    c.setFont('JP',8)
    c.drawString(51,61,'保存室注記　2017年7月14日　紙資料から複写収録')
    c.save()


if '--registers-only' in sys.argv:
    historical_registers()
    print('Created two historical registers.')
    raise SystemExit(0)


if not {'--missing-only', '--corrections-only', '--akari-only'}.intersection(sys.argv):
    historical_registers()
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

def regional_clipping(name, issue, headline, subhead, paragraphs, code, *, correction=False):
    height = 405
    c = paper(name, '夕凪日報 ' + issue, '収蔵番号 ' + code, height=height)
    c.setDateFormatter(lambda *_: 'D:20211112000000')
    c.setFont('Mincho', 34)
    c.drawString(40, height - 87, '夕 凪 日 報')
    c.setFont('Mincho', 10)
    c.drawRightString(W - 40, height - 72, issue)
    c.drawRightString(W - 40, height - 89, '地域面')
    c.setLineWidth(1)
    c.line(40, height - 101, W - 40, height - 101)

    if correction:
        # A single correction box clipped from the regional page.
        x, top, width = 46, height - 121, 271
        c.setFont('Mincho', 14)
        c.drawString(x + 12, top - 23, headline)
        c.setFont('Mincho', 10)
        c.drawString(x + 12, top - 42, subhead)
        y = top - 52
        for paragraph in paragraphs:
            y = para(c, '　' + paragraph, x + 12, y, width - 24, 10, 16) - 6
        c.setLineWidth(.5)
        c.rect(x, y - 6, width, top - y + 6)
    else:
        c.setFont('Mincho', 23)
        c.drawString(44, height - 137, headline)
        c.setFont('Mincho', 15)
        c.drawString(44, height - 163, subhead)
        top, left, right = height - 179, 45, W / 2 + 10
        width = W / 2 - 55
        bottoms = []
        for x, column in zip((left, right), (paragraphs[:2], paragraphs[2:])):
            y = top
            for paragraph in column:
                y = para(c, '　' + paragraph, x, y, width, 11, 17) - 8
            bottoms.append(y)
        y = min(bottoms)
        c.setLineWidth(.4)
        c.line(W / 2, top + 2, W / 2, y)

    c.setFont('JP', 8)
    c.drawString(46, y - 31, '2021年11月12日 受領　／　夕凪日報 地域面の切抜')
    c.save()


if not {'--missing-only', '--akari-only'}.intersection(sys.argv):
    regional_clipping('younagi-20211104.pdf','2021年11月4日（木） 初刷','交流施設前理事長死亡','服毒による自殺か',[
     '産業支援交流施設「あすなろ」の前理事長、榊原惟臣氏（70）が三日朝、施設内で死亡した。施設運営事務局は本紙取材に、本人の服用による可能性があると説明した。',
     '同氏は二〇一〇年にあすなろ産業振興機構を設立。二〇一二年に施設を開設し、生活支援の道具や設備を、企業と利用者が共同で研究する事業を進めてきた。近年は施設内で療養していたという。',
     '一方、家族への詳しい説明は行われておらず、経緯の確認が続いている。施設は三日付で、病気による逝去とする告知を掲載した。',
     '関係者によると、榊原氏は共同事業の記録について運営側に説明を求めていた。事務局は、その内容と今回の死亡との関係について回答していない。',
    ],'NK-2021-1104')
    regional_clipping('younagi-20211104-late.pdf','2021年11月4日（木） 後刷','交流施設前理事長死亡','施設が逝去を公表',[
     '産業支援交流施設「あすなろ」の前理事長、榊原惟臣氏（70）が三日朝、施設内で死亡した。施設は三日付で、病気による逝去とする告知を掲載した。',
     '同氏は二〇一〇年にあすなろ産業振興機構を設立。二〇一二年に施設を開設し、生活支援の道具や設備を、企業と利用者が共同で研究する事業を進めてきた。近年は施設内で療養していたという。',
     '家族への詳しい説明は行われていない。本紙は、死亡に至る経緯を確認している。',
     '関係者によると、榊原氏は共同事業の記録について運営側に説明を求めていた。事務局は、その内容と今回の死亡との関係について回答していない。',
    ],'NK-2021-1104')
    regional_clipping('younagi-20211105.pdf','2021年11月5日（金）','おわびと訂正','榊原惟臣氏に関する記事について',[
     '四日付地域版初刷の榊原惟臣氏の死亡に関する記事で、自殺の可能性について記しましたが、死因及び本人の意思を裏付ける確認が取れなかったため、当該記述を撤回します。',
     '四日付後刷では、当該記述を削除しました。取材時の施設側説明と、確認済みの事実の区別が不十分でした。関係者の皆様におわびいたします。',
     '施設からの公式告知は、病気による逝去としております。本紙は、死亡に至る経緯を引き続き確認します。',
    ],'NK-2021-1105',correction=True)


if '--corrections-only' not in sys.argv:
 article=json.loads(check_output([
  'node','--input-type=module','-e',
  "import {pressClippings} from './src/world/archive-data.mjs'; process.stdout.write(JSON.stringify(pressClippings['NK-2022-0908']));",
 ],cwd=ROOT))
 newspaper('younagi-20220908.pdf',article['issue'],article['headline'],article['subhead'],
           article['paragraphs'],'収蔵番号 NK-2022-0908')

if not {'--corrections-only', '--akari-only'}.intersection(sys.argv):
 newspaper('younagi-20230622.pdf','2023年6月22日（木）','退出支援の元職員とも連絡途絶','工房の三枝律さん（36）',[
  '昨年八月から家族が本人と話せていない作業療法士・瀬尾灯さんの所在について、家族と連絡を取り合っていた工房職員の三枝律さん（36）とも連絡が取れなくなった。',
  '家族らによると、三枝さんは六月八日、本人の道具と書面を返却できるよう、施設側へ説明する予定だと話していた。翌日以降、本人からの返答がなく、予定されていた取材も行えていない。',
  '施設は、三枝さんが十五日付で工房の業務を終了したと回答。退職の経緯と本人への取次については、個別の事情として回答していない。本紙は退職が本人の意思によるものか、現在どこにいるかを確認できていない。',
  '灯さんの母・文乃さんは「道具を返してほしいのも、二人の声を聞きたいのも、まだ同じです」と話す。家族と支援者による照会が続いている。',
 ],'収蔵番号 NK-2023-0622')
print('Updated archival newspaper PDFs.')
