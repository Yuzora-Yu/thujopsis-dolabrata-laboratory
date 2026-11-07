# 公開先と運用

## 実行先と保存方式

| 実行先 | 用途 | 認証・状態 |
| --- | --- | --- |
| Node.js・localhost:4173 | 手元での制作と確認 | サーバー側で資料を絞り、非公開ファイルへ進行状態を保存 |
| GitHub Pages | 公開URLでの確認 | 架空会員ごとの暗号化済み資料を、入力した認証情報で復号。進行はブラウザー内に保存 |
| Cloudflare Pages Free | 追加のホスティング費をかけない公開 | 静的版と同じ認証・ブラウザー内保存。作中の別サイトは同じドメイン内のディレクトリへ配置 |
| Cloudflare Workers + Durable Objects | サーバー保存を使う公開方式 | サーバー側の認証・閲覧制御と、プレイヤーごとの永続保存 |

文章・画像・資料・ページ番号は共通のソースから生成する。GitHub Pages版は現実の個人情報を取り扱う会員サービスではなく、ARGの確認版。Worker版の会員資料は公開アセットへ書き出さない。Cloudflare Pagesの静的版では、GitHub Pages版と同じ暗号化済みの資料を配信する。

## GitHubへの反映

mainへのPushで.github/workflows/pages.ymlが動く。テスト、公開HTML生成、Worker用資料生成、型確認、Pages用ビルドを通してから公開する。

公開URL：https://yuzora-yu.github.io/thujopsis-dolabrata-laboratory/

手元で同じ版を確認する場合は、npm run build:pages、npm run preview:pagesを実行する。確認先はhttp://127.0.0.1:4817/thujopsis-dolabrata-laboratory/。

## 追加費用をかけない最小構成

2026年11月2日、読み取り専用APIでyu-zora.comがactive、Free Website、full構成であることを確認した。Workersの課金契約は別枠であり、現在のOAuth権限では請求情報を閲覧できなかった。default_usage_modelのstandardは課金プランの有料・無料を示すものとして扱わない。

最低限の公開にはCloudflare Pages Freeへ静的版を置く。`npm run build:cloudflare-pages`で、ドメイン直下用のdist/pagesをローカル生成する。作成処理はCloudflareへ接続せず、DNSや契約を変更しない。Cloudflare側のGit連携を使う場合も、出力ディレクトリはdist/pages、ビルドコマンドは同じものを指定できる。

候補はasunaro.yu-zora.com。既存ドメインのサブドメインを使い、別のドメインを購入しない。最小構成では資料室、保全窓口、監査室を/historical-records/、/records-center/、/independent-review/へ配置する。別オリジンではIndexedDB・localStorageの保存領域が共有されないため、静的版を単純に複数のサブドメインへ分ける設定にはしない。

後日用途を分ける場合の候補はasunaro-archive.yu-zora.com、hozen.yu-zora.com、asunaro-guide.yu-zora.com。いずれも未設定。複数サイト間で進行を連携する方式は、公開構成を決めてから選ぶ。

静的版はログイン、資料照会、ZIPの受領と提出、三つの結末をブラウザーで処理する。Functions、Workers、R2、外部データベースを追加しない。端末間の進行共有は行わず、ブラウザーデータを消すと進行も失われる。実際の個人情報を預かるサービスではない。

ケースの進行はIndexedDBへ保存し、既存localStorageから初回に同じケースを引き継ぐ。localStorageは通知用のミラーとしても維持する。探索記録とエンド後の任意再開は[作者用の仕様](player-record.md)を参照。結末だけを戻す操作はプレイヤーが確認して選び、デプロイや初回移行で実行しない。

Cloudflare Pagesの静的ファイルへのリクエストは無料・無制限。Freeプランは月500ビルド、20,000ファイル、1ファイル25MiB、1プロジェクト100カスタムドメインまで。今回の配布物はこれらの範囲内。既存ドメインの維持費に加えるホスティング費は0円にできる。[静的配信の料金](https://developers.cloudflare.com/pages/functions/pricing/)、[無料枠の上限](https://developers.cloudflare.com/pages/platform/limits/)、[独自ドメイン設定](https://developers.cloudflare.com/pages/configuration/custom-domains/)。

## サーバー側の進行保存を使う場合

wrangler.jsoncとworker/index.tsを使用する。npm run build、npm run build:workerを実行してから、npm run dev:cloudflareでローカル確認できる。

独自ドメインを設定する際の一例はasunaro.yu-zora.com。公開時にCloudflareのCustom Domainへ接続し、ASUNARO_ORIGINへそのURLを指定する。HOZEN_ORIGIN、AUDIT_ORIGIN、ARCHIVE_ORIGINを空にした場合は、同じホスト内の別ディレクトリを使用する。各URLの変更とルーティングは実装しているが、別サブドメインに分離した公開は未検証であり、特に旧資料室と主サイトの照会ケース・測定結果を引き継ぐ方式は追加の設計・検証が必要。現在は同一ホスト内の構成を使用する。ドメイン設定はまだ変更していない。

Durable Objectsは一人の進行単位ごとに分け、SQLiteへ状態を保存する。同じプレイヤーから複数タブで届く更新は順に処理する。新しいデプロイで進行記録を消去する処理は入れない。認証の有効期間と、物語の進行記録の保存期間は分けて扱う。

private/runtime-state.json、.work、.wrangler、.dev.varsはGitの対象外。会員資料と実ZIPはWorkerのコードへ含め、ASSETSからは配信しない。公開アセットのルートはpublic/assetsに限定する。

## ページ番号と成長段階

src/experience.mjsのexperienceSettingsでshowPageIndex、showGrowthStageを切り替える。ページ・文書・企業・制作物の登録から番号と合計を算出するため、合計の手入力は不要。新しい種類のページを作った際だけ、同ファイルの登録元へ追加する。growthStagesでSEED、ROOT、SPROUT、SAPLING、BRANCH、CANOPY、HEARTWOODの表示名を一括編集できる。番号と段階は最下部のⓒYU-ZORAの右横に配置する。

## 参照した公式資料

- [GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [WorkersのStatic Assets Binding](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Durable ObjectsのSQLiteストレージ](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Workersの開発上の指針](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
