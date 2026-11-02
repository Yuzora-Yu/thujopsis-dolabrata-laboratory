// Author-only source of the input inventory. Never copy this file to public assets.
export const siteQueries=[
 {word:'入居者紹介',source:'制作物0005の製作者コメント／アクセス先404',destination:'/tenants/',purpose:'入口の迂回。掲載番号の欠番を調べる。'},
 {word:'瀬尾灯',source:'制作物0021、取材記事',destination:'/people/seo-akari/',purpose:'経歴、活動終了、試作貸出票の番号を確認する。'},
 {word:'瀬尾文乃',source:'灯のプロフィール／施設名に込めた願い',destination:'/people/seo-fumino/',purpose:'母の生活と、設立前の聞き取りを読む。'},
 {word:'三枝律',source:'取材記事／共同試作の連絡',destination:'/people/saegusa-ritsu/',purpose:'公開上の業務終了日を、非公開原本と照合する。'},
 {word:'榊原恒一',source:'施設案内、灯の経歴',destination:'/news/20211103/',purpose:'公式な訃報と死因説明を読む。'},
 {word:'A4-01',source:'MX-2019-410',destination:'/news/20120416/',purpose:'一覧から外れた開設時の原図へ進む。'},
 {word:'開設時の区画配置',source:'MX-2019-410',destination:'/news/20120416/',purpose:'A4-01と同じ記事へ至る別の検索語。'},
 {word:'朝倉紬',source:'受領ZIP内の告発書PDF',destination:'/people/asakura-tsumugi/',purpose:'End2になる前に、氏名と生年月日を確認する。'},
];
export const catalogQueries=[
 {word:'NK-2022-0908',source:'FAB-2022-071の新聞切抜／旧基盤入口はAH-2017-009',destination:'/collections/items/0011/',purpose:'活動終了と、家族が確認できない所在の食い違い。'},
 {word:'NK-2023-0622',source:'FAM-2022-009／旧基盤入口はAH-2017-009',destination:'/collections/items/0012/',purpose:'三枝の業務終了と、本人不在を報じる続報。'},
 {word:'NK-2021-1105',source:'新聞初刷、保存目録',destination:'/collections/items/0010/',purpose:'自殺説の撤回を確認する。初刷0009は目録の欠番から直接開く。'},
];
export const directInputs=[
 {kind:'企業URL',input:'/tenants/0003/',source:'No.0002と0004の間の欠番',purpose:'ミナモの移転写真と最初の認証情報。'},
 {kind:'企業URL',input:'/tenants/0013/',source:'No.0012と0014の間の欠番／オルディスの登録番号0046',purpose:'評価企業の入居日・登録番号・設立日。'},
 {kind:'企業URL',input:'/tenants/0010/',source:'No.0009と0011の間の欠番／FAB-2020-026の登録0038',purpose:'アシタの企業情報と移管資料への権限。'},
 {kind:'公開保存資料URL',input:'/collections/items/0004/',source:'保存目録No.0003と0005の欠番',purpose:'旧研究を承継しない回答書。'},
 {kind:'公開保存資料URL',input:'/collections/items/0009/',source:'保存目録No.0008と0010の欠番',purpose:'新聞初刷。自殺説と公式訃報の食い違い。'},
 {kind:'閲覧票',input:'H17-0038 / W416-12',source:'AH-2017-009',purpose:'資料照会室へ。公開保存画面と現在の継続照会を区別する。'},
 {kind:'受領簿URL',input:'/room/records/0006/',source:'認証後の受領簿0005と、一覧の欠番',purpose:'施設自身の加入日、台帳番号、法人設立日。'},
 {kind:'最初の会員認証',input:'201204010017 / 20080519',source:'企業0003の活動報告写真。二行の数字を拡大して読む。',purpose:'最初の一組は写真から。公開案内にパスワード規則を出さない。'},
 {kind:'評価企業の会員認証',input:'201804010046 / 20151112',source:'企業0013の入居年月日＋登録番号／設立日',purpose:'同じ文書IDの個票が見えるようになる。'},
 {kind:'記録企業の会員認証',input:'201704010038 / 20161204',source:'企業0010の入居年月日＋登録番号／設立日',purpose:'旧基盤へ入る移管作業票。'},
 {kind:'機関の会員認証',input:'201204010000 / 20100615',source:'資料照会室の受領簿0006',purpose:'設立原本、理事会決裁、現在の運用。初期配布資料には台帳番号0000を載せない。'},
 {kind:'告発者の会員認証',input:'20120901P0083 / 19930618',source:'告発書の会員ID／氏名検索で出るプロフィールの生年月日',purpose:'告発者の個人保存資料。End2で登録終了する前に読む。'},
];
