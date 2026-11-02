# Thujopsis dolabrata Laboratory

あすなろ産業支援交流施設のWebサイトと、会員資料庫を舞台にしたARG。

## 起動

Node.js 20以降で、依存パッケージのインストールなしで起動できます。

```sh
npm start
```

WindowsでNode.jsがPATHにない場合は、リポジトリ内で次を実行します。システムのNode.js、またはCodexのバンドル済みNode.jsを利用します。

```powershell
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
```

- 施設サイト: http://127.0.0.1:4173/
- 資料保全団体: http://127.0.0.1:4174/
- 独立監査先: http://127.0.0.1:4175/
- 旧基盤・保存資料室: http://127.0.0.1:4176/

4つのWebサイトは同じNode.jsプロセスで起動し、別オリジンとして動作します。フォームはこのアプリケーション内で処理し、外部サービスへメールや通報を送信しません。

認証と各プレイヤーの分岐状態は、通常起動では非公開の`private/runtime-state.json`へ保存します。認証の有効期間は8時間ですが、進行と結末は別に保持し、再起動や認証期限で消去しません。別ブラウザ・別コンテキストの状態は分離しています。テストサーバーの状態は本番側から分離します。

## ファイル構成

| パス | 内容 |
| --- | --- |
| `public/index.html` | 施設トップページ |
| `public/` | 生成済みの公開HTML、CSS、JavaScript、採用画像、4階図面 |
| `src/content.mjs` | 企業、ギャラリー、人物、研究資料、架空アカウントの設定 |
| `src/render.mjs` | 公開ページのHTML生成 |
| `src/member.mjs` | 会員ページ、文書照会、資料提出窓口 |
| `src/world/` | 入居者、制作物、ニュース、追加研究資料、旧基盤の設定 |
| `src/legacy.mjs` | 旧サイトの保存画面、収蔵目録、認証付き資料照会室 |
| `src/archive.mjs` | 実際に解凍できるZIPの生成と同梱資料の暗号化 |
| `private/` | 認証後のダウンロード資料。静的公開対象外 |
| `server.mjs` | HTTP、認証、資料の閲覧制御、フォーム、分岐状態 |
| `docs/story-bible.md` | 登場人物・年表・探索経路・分岐。作者向けネタバレあり |
| `docs/image-prompts.json` | 採用素材の画像生成プロンプト |
| `docs/asset-provenance.md` | 素材の出典と変換内容 |

## HTMLの再生成と確認

```sh
npm run build
npm test
```

公開側は93ページのHTMLとして出力します。会員認証、権限ごとの文書照会、ファイル受領と分岐にはNode.jsサーバーを使用します。`public`のみを静的ホスティングした場合、会員側の機能は動作しません。

`src`、`private`、`docs`を静的配信する設定にしないでください。アプリのHTTPサーバーは、画像等の静的ファイルを`public/assets`に限定し、研究本文は認証したアカウントごとにサーバー側で生成しています。

公開先のオリジンは`ASUNARO_ORIGIN`、`HOZEN_ORIGIN`、`AUDIT_ORIGIN`、`ARCHIVE_ORIGIN`で変更できます。HTTPS環境では`COOKIE_SECURE=1`を指定できます。サーバーの待受先はローカル確認用の127.0.0.1です。

ブラウザ確認スクリプトは`scripts/browser-check.cjs`。PlaywrightとMicrosoft Edgeのheadlessモードを使用します。`ASUNARO_NODE_MODULES`にPlaywrightのあるnode_modulesを指定して実行できます。`BASE_URL`で本番と分離した確認先を指定できます。

## 素材の再生成

画像はすべてリポジトリ内に収録済みです。サイトの起動・ビルドに画像生成APIキーは不要です。

旧新聞記事・研究概要の生成は`scripts/create-history-documents.py`。図面と告発書の生成は`scripts/create-documents.py`（ReportLabと日本語フォントを使用）。Web画像への書き出しは`scripts/prepare-images.cjs`（Sharpを使用）。施設共通画像の生成元一覧は`docs/generated-assets.json`、制作物・企業・貸館・人物・試験写真54点のプロンプトと採用先は`docs/media-assets.json`です。個別写真の書き出しは`scripts/prepare-media.cjs`を使用します。

活動報告写真は、付箋とPC周囲の光・影を画像生成で整えた一枚の`minamo-desk.webp`です。文字はPC利用者が座って読める向きに配置し、全体表示では小さく、原寸の拡大では読める解像度で保存しています。認証情報をHTML本文・altテキスト・検索インデックスには記載していません。

## 公開版とCloudflare

[GitHub Pages確認版](https://yuzora-yu.github.io/thujopsis-dolabrata-laboratory/)はmainへのPushで自動更新します。会員資料も含めた探索を確認できます。

`npm run build:pages`で187ページの静的確認版を生成します。`npm run preview:pages`でプロジェクト配下のURLもローカル検証できます。公開版は架空会員の資料を認証情報で復号し、進行をブラウザー内へ保存します。

Cloudflare公開用の入口は`worker/index.ts`、設定は`wrangler.jsonc`。`npm run build:worker`、`npm run typecheck`、`npm run dev:cloudflare`で準備・検証します。プレイヤーごとのDurable Objectsで進行を保存します。yu-zora.comのドメイン設定は変更していません。詳細は[公開先の運用](docs/publishing.md)を参照してください。

追加費用をかけない最小構成にはCloudflare Pages Freeを使用できます。`npm run build:cloudflare-pages`でドメイン直下用の静的版をローカル生成します。進行はブラウザー内へ保存し、Functionsや有料データベースは追加しません。コマンドは公開先やDNSへ接続しません。

## ページ番号と攻略設計

`src/experience.mjs`でページ番号・総数・成長段階の表示を一括管理します。現在の登録は184ページ。`showPageIndex`と`showGrowthStage`で表示を切り替えられます。

作者用の[攻略・ヒント設計](docs/hint-plan.md)は25段階。必要情報、根拠ページ、段階別ヒント、解答、次の接続を整理しています。`npm run build:hints`でページ番号を同期します。

瀬尾灯・三枝律・朝倉紬と設立者の関係、途絶えた制作記事から救出までの情報順序は[人物の経路](docs/character-thread.md)へ整理しています。

`tests/editorial.test.mjs`はヒントの根拠、時系列、公開期限、番号とLV、保存状態を検証します。`scripts/playtest.cjs`はブラウザー操作で最初の入口から3つの結末まで進みます。
