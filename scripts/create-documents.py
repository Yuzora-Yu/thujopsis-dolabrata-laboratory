from pathlib import Path
import json, math, html, sys
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A3, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'assets'; PRIVATE=ROOT/'private'
OUT.mkdir(parents=True,exist_ok=True); PRIVATE.mkdir(exist_ok=True)
for candidate in [Path(r'C:\Windows\Fonts\YuGothR.ttc'),Path(r'C:\Windows\Fonts\msgothic.ttc')]:
    if candidate.exists():
        pdfmetrics.registerFont(TTFont('JP',str(candidate),subfontIndex=0));break
else: raise RuntimeError('Japanese TrueType font not found')

INK='#263635'; ROOM='#dce5d3'; COMMON='#e9edc8'; ADMIN='#d9e1e1'

def create_plan(old=False):
    primitives=[]
    def rect(x,y,w,h,fill='none',stroke=INK,sw=1): primitives.append(('rect',(x,y,w,h),fill,stroke,sw))
    def line(x1,y1,x2,y2,stroke=INK,sw=1):primitives.append(('line',(x1,y1,x2,y2),'none',stroke,sw))
    def polygon(points,fill='none',stroke=INK,sw=1):primitives.append(('polygon',points,fill,stroke,sw))
    def text(x,y,value,size=12,anchor='middle',color=INK):primitives.append(('text',(x,y,value,size,anchor),color,'none',0))
    def room(x,y,w,h,label,fill=ROOM):
        rect(x,y,w,h,('#f4f1e6' if old else fill),INK,1.35)
        if label:text(x+w/2,y+(h*.75 if old and h<90 else h/2)+3,label,11)
        if old and h>=70:
            # Door opening and furniture from the source plan's repeated office grid.
            line(x+9,y+h,x+9,y+h-17,INK,.6);line(x+9,y+h-17,x+26,y+h,INK,.6)
            rect(x+w/2-14,y+12,28,12,'none',INK,.45)
            rect(x+w/2-6,y+25,12,8,'none',INK,.4)
    rect(0,0,1200,710,'#f3f0e4' if old else '#fbfcf8','none')
    text(40,34,'あすなろ産業支援交流施設',19,'start')
    text(1160,34,'4F 配置図　2012.04' if old else '4F FLOOR GUIDE',13,'end')
    polygon([(75,90),(1050,90),(1135,190),(1085,382),(995,430),(995,550),(175,550),(175,432),(75,382)],'#f9f7ee' if old else '#fff',INK,2.3)
    # Offices in the west: the repeated north/south arrangement follows the supplied SHIP plan.
    for i in range(6):room(85+i*86,100,86,108,str(402+i))
    room(85,240,95,137,'408')
    for i in range(5):
        number=409+i
        if old or number not in [410,411,412]:room(205+i*63,240,63,90,str(number))
    if not old:rect(268,240,189,90,'#ebeeeb',INK,1.35)
    for i in range(3):room(205+i*85,360,85,72,str(414+i))
    room(480,344,121,49,'工房 2')
    room(480,393,121,49,'工房 1')
    room(619,235,83,94,'管理事務室',ADMIN)
    rect(619,329,83,25,'#f3f0e4' if old else ADMIN,INK,1.2)
    text(660,346,'受付',10)
    # Four meeting rooms in the east, cafe, coworking, hexagonal presentation space.
    room(718,100,102,108,'会議室 A',COMMON)
    room(820,100,76,58,'会議室 D',COMMON)
    room(820,158,38,50,'B',COMMON);room(858,158,38,50,'C',COMMON)
    polygon([(910,100),(1044,100),(1123,193),(1095,250),(1035,230),(985,205),(910,205)],'#f4f1e6' if old else COMMON,INK,1.3)
    text(1012,154,'食堂・カフェ',12)
    if old:
        for x in [940,980,1020]:
            rect(x,169,22,12,'none',INK,.5)
            rect(x,183,7,7,'none',INK,.5)
    rect(718,230,175,170,'#f4f1e6' if old else COMMON,INK,1.3)
    text(805,281,'コワーキング',13);text(805,301,'オープンラウンジ',11)
    polygon([(941,230),(1032,230),(1078,299),(1032,371),(941,371),(897,299)],'#f4f1e6' if old else COMMON,INK,1.3)
    text(988,291,'プレゼンテーション',10);text(988,311,'ホール',12)
    for yy in [321,342,363]:
        line(741,yy,871,yy,INK,.5)
        if old:
            for xx in range(745,870,18):rect(xx,yy-8,10,6,'none',INK,.5)
    # Source plan's lower service spine: vestibules, stairs, lavatories, elevator core.
    for x,w,label in [(185,85,'階段・EV'),(286,110,'トイレ'),(412,132,'エレベーター'),(561,66,'共用'),(718,115,'トイレ'),(850,130,'階段・EV')]:
        rect(x,467,w,73,'#f4f1e6' if old else ADMIN,INK,1.2);text(x+w/2,508,label,10)
        if old:
            for sy in range(475,532,6):line(x+5,sy,x+20,sy,INK,.35)
    text(665,413,'エントランス',11);text(665,433,'↓',16)
    line(603,442,704,442,INK,1)
    text(400,226,'通路',9);text(390,351,'通路',9)
    # Column grid, source proportions and dimensions.
    for x in [85,171,257,343,429,515,601,718,820,896,1049]:
        rect(x-4,96,8,8,'#f8f7f2',INK,1)
    if old:
        line(75,65,1050,65,INK,.55);line(75,58,75,90,INK,.55);line(1050,58,1050,90,INK,.55)
        text(560,59,'69,540',10)
        for i,x in enumerate([85,171,257,343,429,515,601,718,820,896,1049],1):
            text(x,78,'X'+str(i),7)
        line(55,90,55,550,INK,.5);text(39,320,'28,800',9)
        text(80,591,'室名',10,'start');text(280,591,'面積',10,'start');text(365,591,'室名',10,'start');text(585,591,'面積',10,'start')
        entries=[('オフィス 402–407','34.4–48.3 m²','会議室 A','45.8 m²'),('オフィス 408–413','18.4–66.3 m²','会議室 B・C','各12.2 m²'),('オフィス 414–416','17.4–27.9 m²','会議室 D','21.4 m²'),('工房 1・2','30.3 / 27.4 m²','ラウンジ・ホール','交流エリア')]
        for i,row in enumerate(entries):
            y=611+i*18;line(75,y+5,700,y+5,INK,.35)
            for xx,s in zip([80,280,365,585],row):text(xx,y,s,9,'start')
        rect(75,578,625,98,'none',INK,.6)
        text(1130,620,'あすなろ開設準備室',12,'end');text(1130,644,'2012.04.01',14,'end');text(1130,668,'図面番号 A4-01',10,'end')
    else:
        text(85,598,'西側：オフィス・工房',12,'start');text(85,623,'中央：管理事務室・受付',12,'start');text(85,648,'東側：会議室・食堂・ラウンジ・ホール',12,'start')
        text(1128,640,'2026.04',10,'end');text(1128,663,'あすなろ運営事務局',10,'end')
    # Cardinal direction only; lower floors are intentionally not shown.
    text(1135,488,'N',11);line(1135,499,1135,533,INK,1);polygon([(1135,495),(1131,505),(1139,505)],INK,INK,.5)
    text(75,692,'A4-01 / ASUNARO INDUSTRY & EXCHANGE',8,'start')
    return primitives

def write_svg(primitives,target):
    parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 710" role="img"><title>あすなろ産業支援交流施設 4階配置図</title><g font-family="Yu Gothic,Meiryo,sans-serif">']
    for kind,p,fill,stroke,sw in primitives:
        attrs=f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"'
        if kind=='rect':x,y,w,h=p;parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" {attrs}/>')
        elif kind=='line':x1,y1,x2,y2=p;parts.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" {attrs}/>')
        elif kind=='polygon':parts.append(f'<polygon points="'+ ' '.join(f'{x},{y}' for x,y in p)+f'" {attrs}/>')
        else:
            x,y,value,size,anchor=p;parts.append(f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" fill="{fill}">{html.escape(value)}</text>')
    parts.append('</g></svg>');target.write_text('\n'.join(parts),encoding='utf-8')

def write_plan_pdf(primitives,target,old):
    w,h=landscape(A3);c=canvas.Canvas(str(target),pagesize=(w,h),pageCompression=1)
    c.setTitle('あすなろ産業支援交流施設 4階配置図'+(' 2012年4月' if old else ''))
    c.setAuthor('あすなろ開設準備室' if old else 'あすなろ運営事務局')
    scale=min((w-48)/1200,(h-48)/710);ox=(w-1200*scale)/2;oy=(h-710*scale)/2
    def X(x):return ox+x*scale
    def Y(y):return h-oy-y*scale
    for kind,p,fill,stroke,sw in primitives:
        c.setLineWidth(sw*scale)
        def color(value):
            return colors.HexColor('#'+''.join(ch*2 for ch in value[1:]) if len(value)==4 else value)
        if fill!='none':c.setFillColor(color(fill))
        if stroke!='none':c.setStrokeColor(color(stroke))
        if kind=='rect':x,y,rw,rh=p;c.rect(X(x),Y(y+rh),rw*scale,rh*scale,fill=fill!='none',stroke=stroke!='none')
        elif kind=='line':x1,y1,x2,y2=p;c.line(X(x1),Y(y1),X(x2),Y(y2))
        elif kind=='polygon':
            shape=c.beginPath();shape.moveTo(X(p[0][0]),Y(p[0][1]))
            for x,y in p[1:]:shape.lineTo(X(x),Y(y))
            shape.close();c.drawPath(shape,fill=fill!='none',stroke=stroke!='none')
        else:
            x,y,value,size,anchor=p;c.setFont('JP',size*scale)
            if anchor=='middle':c.drawCentredString(X(x),Y(y),value)
            elif anchor=='end':c.drawRightString(X(x),Y(y),value)
            else:c.drawString(X(x),Y(y),value)
    c.showPage();c.save()

if '--statement-only' not in sys.argv:
    old=create_plan(True);current=create_plan(False)
    write_svg(old,OUT/'floor-4f-2012.svg');write_svg(current,OUT/'floor-4f.svg')
    write_plan_pdf(old,OUT/'asunaro-4f-2012.pdf',True);write_plan_pdf(current,OUT/'asunaro-4f.pdf',False)

normal=ParagraphStyle('JP',fontName='JP',fontSize=9.8,leading=18,textColor=colors.HexColor(INK),wordWrap='CJK')
title=ParagraphStyle('Title',parent=normal,fontSize=19,leading=29,spaceAfter=22)
sub=ParagraphStyle('Sub',parent=normal,fontSize=12,leading=22,spaceBefore=16,spaceAfter=8)
story=[]
def p(t,style=normal):story.append(Paragraph(t,style));story.append(Spacer(1,8))
p('あすなろ産業支援交流施設における<br/>研究運用および記録の保全に関する申出',title)
p('2026年11月2日')
table=Table([[Paragraph('申出者',normal),Paragraph('朝倉 紬',normal)],[Paragraph('所属',normal),Paragraph('工房・技術支援',normal)],[Paragraph('会員ID',normal),Paragraph('20120901P0083',normal)]],colWidths=[80,390])
table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#ccd3ce')),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]));story.append(table);story.append(Spacer(1,20))
p('1　保全を求める記録',sub)
p('翌檜計画の参加者のうち、施設利用を終了したとされる人々について、その後も測定・観察が継続されています。P-026稲葉澪、P-034瀬尾灯を含む対象者の所在確認を求めます。瀬尾氏の一般制作活動終了後も測定と退出の申出があり、本人の意思による退去を確認できません。')
p('2　前理事長の記録',sub)
p('榊原恒一前理事長の手控えと、健康管理の決裁原本に不一致があります。本人が承認していない投与変更、外部連絡の制限、照会の保留が記録されています。手控えのみでは確認できない経緯を、添付の原本から照合できます。')
p('3　資料の構成',sub)
p('本書とともに、実験記録および継承資料を同梱しています。原本の構成を保持するため、受領した圧縮ファイル全体を保全してください。閲覧に必要な情報は受領先で管理するものとします。')
p('4　申出',sub)
p('現在の運営体制の下では、施設内部で調査を完結できません。対象者の保護と、記録の改変を防ぐ措置を求めます。瀬尾氏の退出を支援していた元職員・三枝律の処理記録SA-2023-012についても、公開台帳と原本を照合してください。')
def page_footer(c,doc):
    c.setFont('JP',8);c.setFillColor(colors.HexColor('#77847d'));c.drawString(48,28,'記録保全資料 / 2026.11.02');c.drawRightString(A4[0]-48,28,str(doc.page))
if story and isinstance(story[-1],Spacer):story.pop()
SimpleDocTemplate(str(PRIVATE/'expose.pdf'),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=48,bottomMargin=50,title='記録の保全に関する申出',author='朝倉 紬').build(story,onFirstPage=page_footer,onLaterPages=page_footer)

records={'record':'YH / 原本照合','subjects':[{'id':'P-026','name':'稲葉 澪','exit_record':'2019-03-31','last_measurement':'2026-10-26','location':'B1-B04','consent':'退出申出を保留扱いとして継続'}], 'health_record':{'id':'HC-2021-031','subject':'榊原恒一','findings':['本人署名のない投与変更の承認','外部診療照会の保留','事務局による通信先制限','原本と公開管理表の不一致'],'approval':['深町玲司','久世圭']},'production':'FAB-2020-026 / 個別調整を廃止し同一寸法へ統合'}
continuity={'project':'原型継承試験','owner':'朝倉紬','receiver':'災害技術記録保全センター 榎本航','source':'榊原恒一の判断記録','exclusions':'2021年手控えを病状による変化として除外','method':'基準回答と異なる応答を再評価・再訓練へ戻す','handover':['評価モデル','装置図面','応答位置データ','原型資料採否一覧']}
records['subjects'].append({'id':'P-034','name':'瀬尾 灯','exit_record':'2022-08-31','last_measurement':'2026-10-26','location':'B1-B07','consent':'短期の補助具試用として説明。退出申出は運用上保留。','source':'YH-2022-034 / P034-2026-102'})
records['staff_case']={'name':'三枝 律','support_request':'SA-2023-012','public_status':'2023-06-15 業務終了','original_status':'2023-06-14 施設内で死亡。外部診療照会は未承認。','recipient':'倉橋真紀への退出支援申出は未送信'}
records['founding_origin']='OR-2006-004 / 瀬尾文乃の生活と用具の聞き取り、FUM-2010-002の本人意見を踏まえた設立条件'
continuity['subject_transfer']={'subject':'P-034 瀬尾灯','condition':'本人の退出希望ではなく、基準判断への一致を受渡し条件とする','source':'AS-2023-008 / P034-2026-102'}
records['family_inquiry']={'id':'FAM-2022-009','name':'瀬尾 文乃','subject':'娘の瀬尾灯の所在と本人意思の確認','newspaper':'NK-2022-0908','finding':'代理回答に本人の自由意思を確認できる原本がない'}
records['subjects'].append({'id':'P-031','name':'青井 真','last_measurement':'2026-10-26','location':'B1-B06','source':'PN-2022-034 / OPS-2026-084'})
records['closed_group']={'recruitment':['RE-2016-002','RE-2022-006'],'promised':'居住費と飲食費無償、簡単な日次検査、館内設備の利用。期間中の外出不可。','difference':'参加者に告知せず検査に伴う投薬と評価機材を導入。対立と退出条件を作り、群内の殺傷に介入せず生存評価へ採用。','victim':{'id':'P-033','name':'吉野 夏帆','date':'2022-09-11','record':'EV-2022-091'},'sources':['OBS-2022-044','ENV-2022-031','EV-2022-091','GR-2022-009','PN-2022-034','QC-2026-015'],'excluded':'助け合いと全員の退出を求めた共同申出は生存評価の集計から除外。'}
(PRIVATE/'records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
(PRIVATE/'continuity.json').write_text(json.dumps(continuity,ensure_ascii=False,indent=2),encoding='utf-8')
print('Updated statement PDF and archive sources.' if '--statement-only' in sys.argv else 'Created 3 PDFs, 2 SVG floor plans and private archive sources.')
