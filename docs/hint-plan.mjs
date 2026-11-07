// Authoring and QA only. Not included in public assets.
export const hintPlan = [
  {
    "id": "residential-offer",
    "goal": "保存された募集案内から、退出できた当初の条件を読む",
    "requires": [
      "consent"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/CONS-2016-005/",
        "words": [
          "RE-2016-002"
        ],
        "role": "ordis"
      },
      {
        "kind": "member",
        "path": "/members/records/RE-2016-002/",
        "words": [
          "/news/20160520/",
          "参加を取り消した方"
        ],
        "role": "ordis"
      },
      {
        "kind": "main",
        "path": "/news/20160520/",
        "words": [
          "14泊15日",
          "居住費",
          "施設を出て"
        ]
      }
    ],
    "hints": [
      "同意書と一緒に渡された案内がある。",
      "配布控えには、現在の一覧にない元の記事の掲載先が記されている。",
      "RE-2016-002から2016年5月20日の募集案内へ。外出制限と参加の取り消しを区別する。"
    ],
    "answer": "期間内の外出は不可だが、参加を終えることで退出できた。費用は事業負担だった。",
    "leads": [
      "revised-offer"
    ]
  },
  {
    "id": "revised-offer",
    "goal": "無償滞在の追加募集と、実施された検査を照合する",
    "requires": [
      "residential-offer",
      "institution"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/RE-2022-006/",
        "words": [
          "/news/20220715/",
          "OBS-2022-044"
        ],
        "role": "institution"
      },
      {
        "kind": "main",
        "path": "/news/20220715/",
        "words": [
          "家賃",
          "無償",
          "日次検査"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/OBS-2022-044/",
        "words": [
          "本人同意原本は受領できず",
          "2022年9月2日 08:10",
          "変更群の薬剤を投与済み",
          "スタンドは日曜に妹に渡す約束です",
          "ENV-2022-031"
        ],
        "role": "ordis"
      }
    ],
    "hints": [
      "同じ募集でも、参加を終えたい人への説明は同じか。",
      "原稿と本人向けの検査票には、実施記録と一致しない部分がある。",
      "RE-2022-006とOBS-2022-044を比較。投薬は簡単な日次検査の説明に含まれていない。"
    ],
    "answer": "本人の申出で終えられる条項が消えた。9月2日の実施欄では安積に投与済みと記し、本人に交付したのは従来の体調確認用の票。薬剤変更の説明や同意原本は保存分にない。9月10日の中止申出は別管理欄で拒否傾向となり、条件が維持された。",
    "leads": [
      "closed-group"
    ]
  },
  {
    "id": "closed-group",
    "goal": "重大事案が偶発的な口論ではなかったと確かめる",
    "requires": [
      "revised-offer"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/ENV-2022-031/",
        "words": [
          "あなたの退出審査",
          "9月10日 11:20の配信控え",
          "閲覧時刻",
          "EV-2022-091"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/EV-2022-091/",
        "words": [
          "吉野夏帆",
          "介入",
          "家族連絡の許可欄は空欄",
          "GR-2022-009"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/GR-2022-009/",
        "words": [
          "自発的淘汰",
          "存続",
          "欠測扱い"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "中止の申出を受け付けた時刻、端末への配信時刻、当直が救護を求めた時刻を照合する。",
      "対外説明の急変と、当直が残した原本は一致するか。",
      "ENV→EV→GRの順に照会。運営が対立を作り、殺傷へ介入せず、生存者を優秀と判定していた。"
    ],
    "answer": "生活用具実証を入口に、運用室は実際の承認を参照せずに作った通知を送り、殺傷が起きても介入せず、生存結果を旧区分へ対応させていた。端末は通知を受領した。本人の閲覧時刻は記録されず、投薬や通知と暴行の因果は資料から確定しない。安積の事案当夜の生存と翌朝の別室への引渡しは確認できる。外へ出たか、板が妹に届いたか、現在どこにいるかは分からない。安積の取材記事は名前で検索できる。",
    "leads": [
      "shared-voice"
    ]
  },
  {
    "id": "shared-voice",
    "goal": "選別から除外された、助け合う人たちの原文を読む",
    "requires": [
      "closed-group",
      "informant"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/workshop/stories/seo-akari/",
        "words": ["夏帆さん", "春の製本相談の記録"]
      },
      {
        "kind": "main",
        "path": "/people/yoshino-kaho/",
        "words": ["青い布表紙の地図帳", "赤鉛筆", "青井さんの押さえ板"]
      },
      {
        "kind": "member",
        "path": "/members/records/PN-2022-034/",
        "words": [
          "青井真澄",
          "夏帆さんの本",
          "青い布表紙の地図帳（別包み）",
          "いまいる人に一人ずつ聞いてください",
          "預かり票の返却欄は空欄",
          "私はそこを見てしまった"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/QC-2026-015/",
        "words": [
          "共同申出",
          "EA-2026-009"
        ],
        "role": "asakura"
      }
    ],
    "hints": [
      "生存の順位だけでは、何が起きたか分からない。",
      "工房に渡された私物には、評価の要約に載らない願いがある。",
      "PN-2022-034とQC-2026-015を照合。共同申出を集計から除いた側の結論を、そのまま人物評価にしない。"
    ],
    "answer": "灯と青井は、帰りたいかを全員に一人ずつ聞き、希望した人が退出できるよう求めた。総括では「全員の退出を求める」と要約され、条件変更の要求として除外された。原本の取次は記録されている。個々の希望や退出の実施は、この控えでは確認できない。",
    "leads": [
      "prototype",
      "independent"
    ]
  },
  {
    "id": "mother-voice",
    "goal": "母と娘、それぞれの選択を知る",
    "requires": [
      "maker"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/people/seo-akari/",
        "words": [
          "1994年",
          "夜間3年制",
          "2021年4月"
        ]
      },
      {
        "kind": "main",
        "path": "/people/seo-fumino/",
        "words": [
          "図書館",
          "2006年",
          "灯は"
        ]
      }
    ],
    "hints": [
      "作り手の経歴には、道具を使う側だった家族の記録もある。",
      "母の聞き取り記事と、娘の大学・資格取得の年月を分けて読む。",
      "開設の原点は母の文乃。娘の灯は学び直しを経て、2021年から工房へ通っている。"
    ],
    "answer": "同じ姓でも設立前の生活者と後年の製作者は別の人。2022年の灯は28歳。母は自分の希望を伝え、娘の進路も本人に選んでほしいと考えていた。",
    "leads": [
      "founding-person"
    ]
  },
  {
    "id": "missing-report",
    "goal": "施設の活動終了と、家族が確認できない所在を比べる",
    "requires": [
      "maker-record"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/FAB-2022-071/",
        "words": [
          "NK-2022-0908",
          "対外報道の切抜"
        ],
        "role": "minamo"
      },
      {
        "kind": "asset",
        "path": "/assets/archive/younagi-20220908.pdf",
        "words": [
          "瀬尾灯さん",
          "28",
          "文乃"
        ]
      }
    ],
    "hints": [
      "貸出票には、施設の外で報じられた記事も受領されている。",
      "制作を終えたという施設の表示と、家族が本人と話せないという報道は、同じ事実ではない。",
      "2022年9月8日の切抜。短期の用具試用へ出かけた28歳の女性と、本人の声を求める母の取材を読む。"
    ],
    "answer": "本人名義の延長連絡と、公開上の活動終了の双方があるのに、家族も勤務先も本人の意思を確認できていない。切抜PDFだけを先に読め、旧アーカイブのURLはまだ示さない。",
    "leads": [
      "second-login",
      "founding-person"
    ]
  },
  {
    "id": "maker",
    "goal": "次の作品が出ていない製作者を気にかける",
    "requires": [],
    "evidence": [
      {
        "kind": "main",
        "path": "/gallery/0021/",
        "words": [
          "瀬尾灯",
          "道具づくりの話"
        ]
      },
      {
        "kind": "main",
        "path": "/workshop/stories/seo-akari/",
        "words": [
          "来月",
          "母",
          "三枝"
        ]
      },
      {
        "kind": "main",
        "path": "/people/seo-akari/",
        "words": [
          "一般制作活動",
          "2022年8月"
        ]
      }
    ],
    "hints": [
      "制作物には、作った人の話が掲載されていることもある。",
      "インタビューの次回予定と、プロフィールの最終更新を比べる。",
      "瀬尾灯の読書具は公開されていない。公開上の活動終了を確かめ、会員側の共同試作の連絡と比較する。"
    ],
    "answer": "自助具製作者の瀬尾灯が、2022年7月に翌月の新作を約束したまま活動終了となっている。まだ地下の対象者番号は分からない。",
    "leads": [
      "entrance",
      "maker-record"
    ]
  },
  {
    "id": "maker-record",
    "goal": "貸出品と本人の行き先が食い違うことを知る",
    "requires": [
      "maker",
      "first-login"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/",
        "words": ["返却窓口の変更", "当時の共同試作の連絡"],
        "role": "minamo"
      },
      {
        "kind": "member",
        "path": "/members/projects/fabrication/",
        "words": [
          "焼き芋",
          "作ってほしいところに付箋",
          "貸出・返却票",
          "瀬尾",
          "FAB-2022-071"
        ],
        "role": "minamo"
      },
      {
        "kind": "member",
        "path": "/members/records/FAB-2022-071/",
        "words": [
          "同じ名前",
          "本人への引渡し日は未記入",
          "YH-2022-034",
          "個票の取次：久世圭"
        ],
        "role": "minamo"
      }
    ],
    "hints": [
      "工房受付が何の控えを探しているか、当時の共同試作の会話と比べる。",
      "道具の返却票では、試作品を受け取った側と、本人に返すはずの預かり品を分けて読む。",
      "FAB-2022-071の9月5日付の取次欄に担当者がいる。YH-2022-034はその評価側で照会する。"
    ],
    "answer": "公には活動を終えた瀬尾の寸法票が、終了後も発行されている。工房の貸出管理は完了だが、型紙と料理帳の複写を本人が受け取った記録はない。",
    "leads": [
      "second-login",
      "maker-fate"
    ]
  },
  {
    "id": "maker-fate",
    "goal": "理事長死後に始まった対象者登録を確認する",
    "requires": [
      "maker-record",
      "second-login"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/YH-2022-034/",
        "words": [
          "瀬尾",
          "短期",
          "2022年8月19日",
          "8月19日の短期試用票・本人控え",
          "お帰りの日",
          "帰宅希望として受領"
        ],
        "role": "ordis"
      }
    ],
    "hints": [
      "対象者の登録日を、理事長の訃報と比べる。",
      "短期試用票の「お帰りの日」と、同じ日付の運用室の記録を比べる。",
      "YH-2022-034でP-034と瀬尾灯が結び付く。再編決裁YH-2022-017は機関側で照会する。"
    ],
    "answer": "短期の道具の試用として参加した女性が、退出できない実証対象へ移されていた。2022年の帰宅希望の後、どこにいたかは機関側の当直記録で確かめる。",
    "leads": [
      "institution",
      "founding-person"
    ]
  },
  {
    "id": "founding-person",
    "goal": "設立の原点となった母と、対象者にされた娘をつなぐ",
    "requires": [
      "maker-fate",
      "institution"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/RG-2007-011/",
        "words": [
          "OR-2006-004",
          "瀬尾"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/OR-2006-004/",
        "words": [
          "瀬尾文乃",
          "再開案に同意しない"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/SA-2023-012/",
        "words": [
          "三枝",
          "死亡",
          "倉橋"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "設立条件だけでなく、その判断の元になった聞き取りを見る。",
      "工房の退職者の公開プロフィールと、退出支援申出の終了処理を比べる。",
      "OR-2006-004が理念の原点。SA-2023-012が、三枝律の抵抗と、その申出が外へ届かなかった経緯。"
    ],
    "answer": "榊原は瀬尾文乃の暮らしと意見を聞いて旧研究の再開を止めた。娘の灯は2022年に28歳で対象者へ移された。娘を帰そうとした三枝は隔離下で亡くなり、業務終了とだけ公開された。",
    "leads": [
      "current",
      "friend-faith"
    ]
  },
  {
    "id": "friend-faith",
    "goal": "告発者の愛着が、本人の意思とすれ違うところを読む",
    "requires": [
      "founding-person",
      "informant"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/AS-2023-008/",
        "words": [
          "律",
          "灯さんが決められるように",
          "誰が決めてもいい形"
        ],
        "role": "asakura"
      },
      {
        "kind": "member",
        "path": "/members/records/P034-2026-102/",
        "words": [
          "いま帰りたい",
          "この紙も最後まで読んでほしい"
        ],
        "role": "asakura"
      }
    ],
    "hints": [
      "友人を失った記録と、現在届いている本人の言葉を分けて読む。",
      "人を外へ出す条件を、誰が決めているか。",
      "朝倉は律の原文も灯の便箋も保管しているが、本人の退出希望を優先していない。完全版資料を独立した相手へ渡す必要がある。"
    ],
    "answer": "朝倉の愛着は本物だが、先生の判断への一致を救済の条件にしている。第三の結末では瀬尾自身の希望を確認して救出し、道具を本人へ返す。",
    "leads": [
      "independent"
    ]
  },
  {
    "id": "name",
    "goal": "施設名とマークに込めた理念を知る",
    "requires": [],
    "evidence": [
      {
        "kind": "main",
        "path": "/news/20120401/",
        "words": [
          "施設名に込めた願い",
          "ロゴに込めた想い"
        ]
      },
      {
        "kind": "main",
        "path": "/about/identity/",
        "words": [
          "アスナロは、アスナロとして育つ"
        ]
      },
      {
        "kind": "main",
        "path": "/about/emblem/",
        "words": [
          "同じ葉を複製したものではありません"
        ]
      }
    ],
    "hints": [
      "開設当日に何を伝えようとしていたかを読む。",
      "開設のお知らせには、現在のメニューにない説明への参照が残っている。",
      "開設記事から施設名とロゴの独立ページへ進む。"
    ],
    "answer": "二つの葉は同じものの複製ではない。異なるまま乗り、降りられることが設立時の約束。",
    "leads": [
      "prototype"
    ]
  },
  {
    "id": "entrance",
    "goal": "入居者紹介にたどり着く",
    "requires": [],
    "evidence": [
      {
        "kind": "main",
        "path": "/visit/",
        "words": [
          "アクセス"
        ]
      },
      {
        "kind": "main",
        "path": "/guide/access/",
        "words": [
          "入居者紹介"
        ]
      },
      {
        "kind": "main",
        "path": "/gallery/0005/",
        "words": [
          "入居者紹介"
        ]
      }
    ],
    "hints": [
      "施設の所在地を確認するための案内を探す。",
      "見学案内のアクセス先と、そこで表示されるメニューを確かめる。",
      "アクセス先は404。そのフッターに入居者紹介がある。制作物の文中にも、その名称が残っている。"
    ],
    "answer": "/tenants/。ギャラリー内の名称からサイト検索する迂回路も成立する。",
    "leads": [
      "tenant-gap"
    ]
  },
  {
    "id": "tenant-gap",
    "goal": "ミナモの活動報告を読む",
    "requires": [
      "entrance"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/tenants/",
        "words": [
          "No. 0002",
          "No. 0004"
        ]
      },
      {
        "kind": "main",
        "path": "/tenants/0003/",
        "words": [
          "登録番号",
          "2008年5月19日",
          "2012年4月1日"
        ]
      }
    ],
    "hints": [
      "企業の登録番号と、一覧に振られた掲載番号は別のもの。",
      "掲載番号とURLを見比べる。",
      "0002と0004の間の0003を、URLへ入れる。"
    ],
    "answer": "掲載No.0003は登録0017のミナモ。活動報告写真に手書き付箋がある。",
    "leads": [
      "first-login"
    ]
  },
  {
    "id": "first-login",
    "goal": "最初の会員領域に入る",
    "requires": [
      "tenant-gap"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/tenants/0003/",
        "words": [
          "minamo-desk.webp"
        ]
      }
    ],
    "visual": "docs/previews/credential-detail.png",
    "hints": [
      "移転作業の写真も、元の大きさで確認する。",
      "机の上のPCに、小さな手書きメモが貼られている。",
      "写真を拡大し、PC利用者に向けた二行の数字を読む。"
    ],
    "answer": "201204010017 / 20080519。設立日との一致は次の推論に使う。公開利用案内に規則は置かない。",
    "leads": [
      "evaluation",
      "water"
    ]
  },
  {
    "id": "evaluation",
    "goal": "集計で誰が消えたかを知る",
    "requires": [
      "first-login"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/messages/",
        "words": [
          "YH-2013-014",
          "YH-2016-032"
        ],
        "role": "minamo"
      },
      {
        "kind": "member",
        "path": "/members/records/YH-2018-041/",
        "words": [
          "12名",
          "YH-2018-041-A"
        ],
        "role": "minamo"
      }
    ],
    "hints": [
      "共同事業の連絡と、記録に書かれた管理番号を照合する。",
      "集計には有効数と除外数があり、除外者の記録は別管理になっている。",
      "YH-2013-014→YH-2016-032→YH-2018-041。同じIDでも閲覧者によって結果が変わる。"
    ],
    "answer": "12名を集計から除外して適応率を改善。個票はミナモでは見えない。",
    "leads": [
      "second-login"
    ]
  },
  {
    "id": "water",
    "goal": "赤い試験水に関する疑いを確かめる",
    "requires": [
      "first-login"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/news/20250509/",
        "words": [
          "2013年",
          "流れ"
        ]
      },
      {
        "kind": "member",
        "path": "/members/projects/circulation/",
        "words": [
          "赤い水",
          "着色"
        ],
        "role": "minamo"
      },
      {
        "kind": "member",
        "path": "/members/records/FLOW-2013-007/",
        "words": [
          "通水確認",
          "人を対象とする試験は本納入の範囲に含まない"
        ],
        "role": "minamo"
      }
    ],
    "hints": [
      "配管図で、色の付いた水がどこへ戻るかを確かめる。",
      "試験槽の通水記録と、使う方の確認票は分けていた。",
      "FLOW-2013-007と循環設備の連絡記録で、色と用途を確認できる。"
    ],
    "answer": "赤色は流路識別用。2013年に確認したのは枝Bから試験槽への戻り。人がその設備を使えたかどうかは別の確認票で扱う。",
    "leads": [
      "evaluation"
    ]
  },
  {
    "id": "second-login",
    "goal": "個票の配布先で記録を照会する",
    "requires": [
      "first-login"
    ],
    "requiresAny": [
      "evaluation",
      "maker-record"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/tenants/0012/",
        "words": ["同じ日に入居した久世 圭さん", "2018年4月1日"]
      },
      {
        "kind": "main",
        "path": "/tenants/0013/",
        "words": [
          "0046",
          "2018年4月1日",
          "2015年11月12日"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/YH-2018-041-A/",
        "words": [
          "P-026",
          "2019年4月11日",
          "出る道だけ教えてください"
        ],
        "role": "ordis"
      },
      {
        "kind": "member",
        "path": "/members/records/YH-2022-034/",
        "words": [
          "P-034",
          "帰宅希望"
        ],
        "role": "ordis"
      }
    ],
    "hints": [
      "最初のIDとPWを、企業紹介に書かれた情報と見比べる。",
      "返却票の取次担当の名前で公開検索。出てきた会社の活動報告で、その人の入居時期を確かめる。集計報告を読んだ場合は管理欄で社名を確認できる。",
      "入居日＋登録番号で201804010046。PWは20151112。"
    ],
    "answer": "オルディスで個票が開く。灯の返却票からはYH-2022-034、稲葉の集計報告からはYH-2018-041-Aを照会する。",
    "leads": [
      "map",
      "consent",
      "transfer"
    ]
  },
  {
    "id": "consent",
    "goal": "利用終了と参加終了のすり替えを確認する",
    "requires": [
      "second-login"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/CONS-2016-005/",
        "words": [
          "本人の申出で参加を終えられる",
          "その都度ご承諾"
        ],
        "role": "ordis"
      },
      {
        "kind": "main",
        "path": "/people/inaba-mio/",
        "words": [
          "2019年3月",
          "ひとつの正解だけに揃えない"
        ]
      }
    ],
    "hints": [
      "会員契約と研究参加の同意を、同じ手続きとして読まない。",
      "退去後も参加していたという説明が、元の同意書と両立するか。",
      "CONS-2016-005と個票の退出申出を照合する。"
    ],
    "answer": "元の同意は退出を認め、拘束的な観察や条件の統一を含まない。",
    "leads": [
      "transfer",
      "residential-offer"
    ]
  },
  {
    "id": "map",
    "goal": "新旧の図面を比較する",
    "requires": [
      "second-login"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/YH-2019-026/",
        "words": [
          "退出申出の受付控え",
          "本人への回答日",
          "現在地",
          "MX-2019-410"
        ],
        "role": "ordis"
      },
      {
        "kind": "member",
        "path": "/members/records/MX-2019-410/",
        "words": [
          "2012年4月16日",
          "A4-01",
          "西通路側／点検の控え"
        ],
        "role": "ordis"
      },
      {
        "kind": "main",
        "path": "/news/20120416/",
        "words": [
          "floor-4f-2012.svg",
          "asunaro-4f-2012.pdf"
        ]
      },
      {
        "kind": "main",
        "path": "/floor-map/",
        "words": [
          "floor-4f.svg"
        ]
      },
      {
        "kind": "main",
        "path": "/tenants/0008/",
        "words": [
          "411号室",
          "2019.09.20",
          "名札を受付へ返しました"
        ]
      }
    ],
    "hints": [
      "設備台帳に書かれた原図の名称や番号を探す。",
      "古い図面は現在のお知らせ一覧には出ない。",
      "A4-01、記事名、台帳にある掲載日のいずれかで原図を探す。旧図の室番号でも公開されている入居者紹介を検索できる。"
    ],
    "answer": "旧410–412の仕切り・室番号・通路側の出入口が現行案内に描かれていない。2019年4月の点検票は三室を別々に扱い、411の旧入居者は同年9月に名札を返した。台帳の追記に、保守担当へ届いた決裁通知と議事録の番号が残る。",
    "leads": [
      "renovation",
      "transfer"
    ]
  },
  {
    "id": "renovation",
    "goal": "通路改修の説明が対象区画に当てはまるか確かめる",
    "requires": [
      "map",
      "institution"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/news/20230616/",
        "words": [
          "東側",
          "会議室は通常どおりご利用いただけます"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/RM-2020-019/",
        "words": [
          "付帯決議　区画の取扱い",
          "410・411・412を一括表示",
          "室内呼出は現状のまま"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/PUB-2023-014/",
        "words": [
          "2019年",
          "西側の個室群は工事対象に含まない",
          "東側・会議室Aへの通路"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "「改修」という言葉だけで、図面の差を説明しない。",
      "改修された場所と時期は、図面の変更箇所・時期と一致するか。",
      "設備台帳の決裁通知が参照する議事録を、機関名義で照会する。2020年の決裁と2023年の東側通路の作業票を比べる。"
    ],
    "answer": "2020年の決裁は、西側三室の設備を維持して来館案内の記載を外す方針を示す。2023年の作業票は東側の通路だけを扱う。最初に掲示を差し替えた日付は分からない。",
    "leads": [
      "institution"
    ]
  },
  {
    "id": "transfer",
    "goal": "旧資料基盤へ進む",
    "requires": [
      "second-login"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/gallery/0019/",
        "words": [
          "円弧状の長穴",
          "2020年の製作時",
          "FAB-2020-026"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/FAB-2020-026/",
        "words": [
          "立ち上がり側の穴",
          "0038",
          "AH-2017-009",
          "別封 F20-0713-04"
        ],
        "role": "ordis"
      },
      {
        "kind": "main",
        "path": "/tenants/0010/",
        "words": [
          "2017年4月1日",
          "2016年12月4日"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/AH-2017-009/",
        "words": [
          "H17-0038",
          "W416-12",
          "2020年7月15日",
          "F20-0713-04",
          "取付先欄は空欄"
        ],
        "role": "ashita"
      }
    ],
    "hints": [
      "工房担当と控えの移管先を追う。製作記録の番号は、ギャラリーで欠番になっている支持部の写真にも残る。",
      "登録0038は、別の掲載番号で紹介されている。",
      "企業0010の情報からアシタ会員へ入り、AH-2017-009の閲覧票を確認する。"
    ],
    "answer": "201704010038 / 20161204。別封F20-0713-04で渡ったのは旧型図と取付票の控えで、部品の取付先は空欄。旧照会室の閲覧票H17-0038、照会符号W416-12。",
    "leads": [
      "old-project",
      "institution"
    ]
  },
  {
    "id": "old-project",
    "goal": "継舟計画と新施設の断絶を読む",
    "requires": [
      "transfer"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/AH-2017-009/",
        "words": [
          "旧基盤・資料照会室"
        ],
        "role": "ashita"
      },
      {
        "kind": "archive",
        "path": "/collections/items/0002/",
        "words": ["移管を禁じる", "ks-1945-02.pdf"]
      },
      {
        "kind": "archive",
        "path": "/collections/items/0003/",
        "words": ["個人別区分票", "今回の受入に含まれない", "ks-1986-04.pdf"]
      },
      {
        "kind": "archive",
        "path": "/snapshots/2011/",
        "words": [
          "旧事業の承継を行わず"
        ]
      },
      {
        "kind": "archive",
        "path": "/collections/items/0004/",
        "words": [
          "辞退",
          "RG-2007-011"
        ]
      }
    ],
    "hints": [
      "古い資料を保存したことと、その研究を続けたことを分けて考える。",
      "目録の欠番と、取得時点が固定された準備記録を比べる。",
      "目録0004、2011年保存画面、機関原本RG-2007-011が同じ拒絶を裏付ける。"
    ],
    "answer": "榊原は旧研究の承継を拒否し、別の目的で設立した。保存サイトのURLはアシタの移管作業票で初めて示す。公開沿革からは案内しない。",
    "leads": [
      "institution",
      "prototype"
    ]
  },
  {
    "id": "institution",
    "goal": "施設自身の会員領域へ入る",
    "requires": [
      "transfer"
    ],
    "evidence": [
      {
        "kind": "archive",
        "path": "/room/records/0005/",
        "words": [
          "0006"
        ],
        "role": "ticket"
      },
      {
        "kind": "archive",
        "path": "/room/records/0006/",
        "words": [
          "0000",
          "2012年4月1日",
          "2010年6月15日"
        ],
        "role": "ticket"
      },
      {
        "kind": "member",
        "path": "/members/records/RM-2020-019/",
        "words": [
          "外部への回答",
          "健康管理"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "企業の一覧ではなく、事業主体の台帳移行を調べる。",
      "照会室の受領簿にも、掲載されていない番号がある。",
      "受領簿0006の加入日と台帳番号から201204010000。法人設立日が20100615。"
    ],
    "answer": "機関会員で理事会決裁と設立時の原本が開く。",
    "leads": [
      "death",
      "current",
      "renewal"
    ]
  },
  {
    "id": "renewal",
    "goal": "旧区分を現行評価に使うと決めた日と範囲を知る",
    "requires": [
      "institution",
      "old-project"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/RG-2007-011/",
        "words": [
          "同意しません"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/YH-2022-017/",
        "words": [
          "継舟",
          "設立経緯",
          "今回の測定値",
          "2022年8月19日"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "設立時の条件が、後年の決裁でどう扱われたかを比べる。",
      "資料の存在だけでは、榊原が再開を承認したとは言えない。",
      "2007年の拒絶と2022年の再編決裁を照合する。"
    ],
    "answer": "2022年8月19日付で深町・久世が旧区分を新しい測定結果に適用した。1945年の個票と1986年の受領範囲を分けて読む。決裁前にも旧区分との比較は行われていた。",
    "leads": [
      "death",
      "prototype"
    ]
  },
  {
    "id": "death",
    "goal": "病気・自殺という説明の奥にある記録を照合する",
    "requires": [
      "institution"
    ],
    "evidence": [
      {
        "kind": "main",
        "path": "/news/20211103/",
        "words": [
          "病気"
        ]
      },
      {
        "kind": "archive",
        "path": "/collections/items/0009/",
        "words": [
          "服毒による自殺か"
        ]
      },
      {
        "kind": "archive",
        "path": "/collections/items/0010/",
        "words": [
          "当該記述を撤回",
          "裏付ける確認が取れなかった",
          "11月4日地域版 後刷"
        ]
      },
      {
        "kind": "member",
        "path": "/members/records/AH-2021-006/",
        "words": [
          "初刷・後刷（別台紙）",
          "新聞の保存封筒へは綴じ込まない",
          "HC-2021-031-R"
        ],
        "role": "ashita"
      },
      {
        "kind": "member",
        "path": "/members/records/HC-2021-031-R/",
        "words": [
          "本人意思確認欄：空欄",
          "08:05",
          "時刻記載なし",
          "右端の払い"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/CH-2021-003/",
        "words": [
          "署名",
          "外部へ送れない"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "二つの説明のうち、どちらかを直ちに真実と決めない。",
      "新聞の取材元、訂正文、実際の交付記録を照合する。",
      "目録0009の初刷を、0010の訂正欄に添えられた同日後刷と比べる。AH-2021-006で保存単位を確かめ、HC-2021-031-Rで交付した人と服用した人、指示控えと初稿の時刻欄、署名の複写を比べる。"
    ],
    "answer": "事務局が説明したのは本人による服用の可能性。初刷はそれを自殺かという見出しにした。同日後刷で記述が消え、翌日、新聞社は裏付けが取れなかったと訂正した。交付簿には本人確認の記入がなく、健康管理表の署名には過去の決裁書と同じ欠けがある。08:05は初稿の指示時刻で、初稿自体に時刻はない。理事長室の端末では外部への送信が止められ、本人が頼んでいない面会も取り消された。服用の成立と直接の死因は記録から確定できない。",
    "leads": [
      "current"
    ]
  },
  {
    "id": "current",
    "goal": "生存している工房担当者へ原本照会を送る",
    "requires": [
      "institution"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/OPS-2026-084/",
        "words": [
          "P-026",
          "P-034 瀬尾灯",
          "B1・B-07",
          "FAB-2026-018"
        ],
        "role": "institution"
      },
      {
        "kind": "member",
        "path": "/members/records/FAB-2026-018/",
        "words": [
          "原本照会",
          "2026年10月28日 14:20",
          "立会者：瀬尾灯",
          "記録についての照会"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "当直の予定表と、交換を行った担当者の作業控えを照合する。",
      "機関領域には原本を保全している担当者と、通常の照会窓口がある。",
      "CH-2021-003またはFAB-2026-018から原本照会を送る。"
    ],
    "answer": "工房保全担当から連絡と実ZIPを受領する。",
    "leads": [
      "report",
      "informant"
    ]
  },
  {
    "id": "report",
    "goal": "受け取った資料の提出先を選ぶ",
    "requires": [
      "current"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/messages/",
        "words": [
          "保全資料_20261102.zip",
          "資料保全・匿名通報受付"
        ],
        "role": "institution",
        "state": {
          "contact": true
        }
      },
      {
        "kind": "member",
        "path": "/members/contact/",
        "words": [
          "添付資料"
        ],
        "role": "institution"
      }
    ],
    "hints": [
      "担当者が案内した提出先と、施設自身の窓口は別の組織。",
      "受領した圧縮ファイルには、提出者についての書面も含まれている。",
      "外部センターへの提出がEnd1、施設事務局への提出がEnd2。提出前に同梱PDFを読める。"
    ],
    "answer": "End1は施設停止と研究の外部移送。End2は告発者の登録終了と現運営の継続。",
    "leads": [
      "informant"
    ]
  },
  {
    "id": "informant",
    "goal": "告発者の個人記録を読む",
    "requires": [
      "current"
    ],
    "evidence": [
      {
        "kind": "private",
        "path": "告発書.pdf",
        "words": [
          "朝倉 紬乃",
          "20120901P0083"
        ]
      },
      {
        "kind": "main",
        "path": "/people/asakura-tsumugi/",
        "words": [
          "1993年6月18日"
        ]
      }
    ],
    "hints": [
      "提出書面を、単なる添付ファイルとして扱わない。",
      "書面の氏名を、これまでのサイト内検索で調べられる。",
      "氏名検索から本人のプロフィールへ。PDFの会員IDと生年月日を使う。"
    ],
    "answer": "20120901P0083 / 19930618。朝倉の個人保存資料が開く。",
    "leads": [
      "prototype"
    ]
  },
  {
    "id": "prototype",
    "goal": "告発者の救済像が設立者の思想と一致するかを見極める",
    "requires": [
      "informant"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/AS-2024-002/",
        "words": [
          "病気の時の言葉",
          "私は選ばない"
        ],
        "role": "asakura"
      },
      {
        "kind": "member",
        "path": "/members/records/AS-2026-021/",
        "words": [
          "その理由を聞ける場所",
          "除外"
        ],
        "role": "asakura"
      },
      {
        "kind": "member",
        "path": "/members/records/TR-2026-011/",
        "words": [
          "榎本航策",
          "EA-2026-009"
        ],
        "role": "asakura"
      }
    ],
    "hints": [
      "告発が正しいことと、告発者の望む未来が正しいことは別に確かめられる。",
      "施設名・ロゴの説明や講演原文と、原型資料の採否を比べる。",
      "朝倉は榊原自身の拒否を除き、全員を同じ判断へ揃えようとしている。継承資料の受領担当は榎本。居住者の受入場所と移動日は受領案の空欄に残っている。"
    ],
    "answer": "現理事会の選別を止める一方、原型への強制的な一致を新事業へ引き継ぐ計画。",
    "leads": [
      "independent"
    ]
  },
  {
    "id": "independent",
    "goal": "施設の運用と、研究資料の移管計画を独立した相手へ伝える",
    "requires": [
      "prototype"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/EA-2026-009/",
        "words": [
          "東都研究監査室"
        ],
        "role": "asakura"
      },
      {
        "kind": "member",
        "path": "/members/records/TR-2026-011/",
        "words": [
          "10月29日 受領案／確認欄",
          "居住者本人の確認",
          "complete.zip",
          "原本および移送関係資料.zip"
        ],
        "role": "asakura"
      }
    ],
    "hints": [
      "受領先自身も移送計画の当事者ではないかを確認する。",
      "個人保存資料には、未返信の独立調査からの照会がある。",
      "EA-2026-009の窓口へ、移送記録も入った完全版ZIPを提出する。"
    ],
    "answer": "End3。瀬尾灯は11月6日に本人の希望で施設を離れ、後日、母の料理帳と型紙を受け取る。11月12日の控えでは外部への引渡しと試験の手続き停止、三枝律の申出や当直記録の保全が報告される。",
    "leads": []
  },
  {
    "id": "reader",
    "goal": "自分の照会経路も継承試験の対象へ取り込まれていると知る",
    "requires": [
      "prototype"
    ],
    "evidence": [
      {
        "kind": "member",
        "path": "/members/records/AS-2026-019/",
        "words": [
          "同じ照会端末",
          "最初の状態",
          "照会の終了：保留"
        ],
        "role": "asakura"
      }
    ],
    "hints": [
      "受領協力者は申出者本人とは別に記録されている。",
      "私的な研究ノートと受渡しの送信控えに、経路確認の番号が残る。",
      "AS-2026-019には、自分が開いた順序が名義をまたいで表示される。資料の提出だけで照合が終わるのかを読む。"
    ],
    "answer": "朝倉は外部の調査者も基準回答へ揃える対象とする。役に立つ閲覧履歴が、観察資料へ転用されていた。実際のIP・個人情報の取得は行わない。",
    "leads": [
      "independent"
    ]
  },
  {
    "id":"aptitude",
    "goal":"旧基盤の適性測定を任意で受け、被験者の原票と比較する",
    "requires":["transfer"],
    "evidence":[
      {"kind":"archive","path":"/room/records/0014/","role":"ticket","words":["AP-2022-028","適性反応測定端末AP-06"]},
      {"kind":"member","path":"/members/records/AP-2022-028/","role":"institution","words":["共同行動","在籍や退出","/room/console/"]}
    ],
    "hints":[
      "資料照会室には現在も接続されている機器の受領記録がある。",
      "受領簿0014は、適性反応測定端末AP-06を案内している。",
      "呼称を登録してカード五試行と粒子観測を終えると、保存されていた五人の測定原票を照合できる。点数の条件はない。"
    ],
    "answer":"任意の迂回路。単回の適性値と、本人の希望・運命が一致するわけではない。AP-2022-028から利用区分の変更も確認できる。完了時はEnd3に呼称宛てのお礼を追加するが、本筋の到達条件には加えない。",
    "leads":[]
  }
];
