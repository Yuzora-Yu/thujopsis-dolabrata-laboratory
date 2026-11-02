# 公開先と運用

## 同じ内容を使う三つの実行先

| 実行先 | 用途 | 認証・状態 |
| --- | --- | --- |
| Node.js・localhost:4173 | 手元での制作と確認 | サーバー側で資料を絞り、非公開ファイルへ進行状態を保存 |
| GitHub Pages | 公開URLでの確認 | 架空会員ごとの暗号化済み資料を、入力した認証情報で復号。進行はブラウザー内に保存 |
| Cloudflare Workers + Durable Objects | yu-zora.com配下での公開本体 | サーバー側の認証・閲覧制御と、プレイヤーごとの永続保存 |

文章・画像・資料・ページ番号は共通のソースから生成する。GitHub Pages版は現実の個人情報を取り扱う会員サービスではなく、ARGの確認版。Cloudflare版の会員資料は公開アセットへ書き出さない。

## GitHubへの反映

mainへのPushで.github/workflows/pages.ymlが動く。テスト、公開HTML生成、Worker用資料生成、型確認、Pages用ビルドを通してから公開する。

公開URL：https://yuzora-yu.github.io/thujopsis-dolabrata-laboratory/

手元で同じ版を確認する場合は、npm run build:pages、npm run preview:pagesを実行する。確認先はhttp://127.0.0.1:4817/thujopsis-dolabrata-laboratory/。

## Cloudflareへの移行

wrangler.jsoncとworker/index.tsを使用する。npm run build、npm run build:workerを実行してから、npm run dev:cloudflareでローカル確認できる。

独自ドメインを設定する際の一例はasunaro.yu-zora.com。公開時にCloudflareのCustom Domainへ接続し、ASUNARO_ORIGINへそのURLを指定する。HOZEN_ORIGIN、AUDIT_ORIGIN、ARCHIVE_ORIGINは任意。空のままなら同じホスト内の別ディレクトリを使い、別サブドメインを指定すれば作中の外部サイトとして分けられる。ドメイン設定はまだ変更していない。

Durable Objectsは一人の進行単位ごとに分け、SQLiteへ状態を保存する。同じプレイヤーから複数タブで届く更新は順に処理する。新しいデプロイで進行記録を消去する処理は入れない。認証の有効期間と、物語の進行記録の保存期間は分けて扱う。

private/runtime-state.json、.work、.wrangler、.dev.varsはGitの対象外。会員資料と実ZIPはWorkerのコードへ含め、ASSETSからは配信しない。公開アセットのルートはpublic/assetsに限定する。

## ページ番号と秘匿レベル

src/experience.mjsのexperienceSettingsでshowPageIndex、showSecrecyLevelを切り替える。ページ・文書・企業・制作物の登録から番号と合計を算出するため、合計の手入力は不要。新しい種類のページを作った際だけ、同ファイルの登録元へ追加する。

## 参照した公式資料

- [GitHub Pagesのカスタムワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [WorkersのStatic Assets Binding](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Durable ObjectsのSQLiteストレージ](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
- [Workersの開発上の指針](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
