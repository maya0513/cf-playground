# Cloudflare 学習帳

Cloudflareの機能を、1つのWorker内の14個の小さな題材で学ぶリポジトリです。各題材はSSRとhydrationを持ち、必要なbindingをその題材内で直接扱います。日本語の学習資料は各`apps/*/README.md`にあります。

## はじめる

```sh
mise install
just setup
just dev
```

<http://localhost:4100/> を開いて題材へ移動します。`just dev`は全14題材を持つWorkerを1つ起動します。

ホームのREADMEリンクは、同じ配色のHTML閲覧ページを開きます。見出しの目次、コード・表、題材へ戻るリンクがあり、JavaScriptなしでも読めます。原稿は各`apps/*/README.md`と`docs/*.md`を直接使うため、テキストファイルへの複製は不要です。以前の`/guides/*.txt`は新しい閲覧URLへ転送します。

停止はCtrl+C。全題材の初期化は停止後に`just reset`。ローカルのデータだけを削除します。Cloudflareのログインや支払い設定は不要です。

`just`だけでコマンド一覧を表示します。[justfile](justfile)は既存のVite Taskを呼ぶ入口です。justもmiseのメジャー指定で管理し、各レシピ内の`mise exec`でNodeとpnpmを揃えます。個別起動用のレシピはありません。

| コマンド     | 用途                                 |
| ------------ | ------------------------------------ |
| `just setup` | 依存インストール・ローカルデータ準備 |
| `just dev`   | 単一Workerの起動                     |
| `just reset` | 全題材のローカルデータを削除・再作成 |
| `just check` | CIと同じ全チェック                   |
| `just build` | 単一Workerのビルド                   |

## 読む順番

| 順  | 題材                    | 実装                                                    |
| --- | ----------------------- | ------------------------------------------------------- |
| 1   | Workers・HTTP観察       | [01-workers](apps/01-workers/README.md)                 |
| 2   | Static Assets           | [02-assets](apps/02-assets/README.md)                   |
| 3   | D1ブックマークCRUD      | [03-d1](apps/03-d1/README.md)                           |
| 4   | KVお知らせ・TTL         | [04-kv](apps/04-kv/README.md)                           |
| 5   | R2ファイル保存          | [05-r2](apps/05-r2/README.md)                           |
| 6   | Workers Cache           | [06-cache](apps/06-cache/README.md)                     |
| 7   | Turnstile・Siteverify   | [07-turnstile](apps/07-turnstile/README.md)             |
| 8   | Access・JWT検証         | [08-access](apps/08-access/README.md)                   |
| 9   | Cron Triggers           | [09-cron](apps/09-cron/README.md)                       |
| 10  | Queues・冪等性          | [10-queues](apps/10-queues/README.md)                   |
| 11  | SQLite Durable Objects  | [11-durable-objects](apps/11-durable-objects/README.md) |
| 12  | WebSockets・Hibernation | [12-websockets](apps/12-websockets/README.md)           |
| 13  | Workflows               | [13-workflows](apps/13-workflows/README.md)             |
| 14  | Service Bindings・RPC   | [14-rpc](apps/14-rpc/README.md)                         |

Node 26とpnpm 12はmiseのメジャー指定、ツールはVite Plus、画面はPreact/Signals、hydrationはpreact-iso、HTTPはHonoです。汎用の業務処理層を作らず、各題材の`src/index.tsx`にbinding操作を残しています。画面の共通コードは`packages/ui`、題材一覧とURLは`packages/catalog`、Viteの共通設定は`packages/tooling`です。ブラウザのURLはすべて4100のサブパスです。設定とデプロイ対象は`apps/00-home`の`cf-playground`一つ。HTTP・Cron・Queuesの入口、DO・Workflow・RPCのクラスを同じWorkerからexportします。RPCのINTERNAL bindingも同じWorker内の名前付き入口を呼びます。D1は1つのDB内の題材別テーブルで、その他のデータはbindingごとに分けます。静的アセットはassets-firstで配信します。

## 検証

```sh
pnpm exec playwright install --with-deps chromium
just check
```

既存の`/opt/google/chrome/chrome`がある環境ではそれを使用します。GitHub Actionsはbundled Chromiumをインストールします。`pnpm exec vp run ci:check`は整形確認、型生成、lint、型検査、全テスト、統合カバレッジ、単一cf build、ブラウザテストを実行します。

行・文・関数・分岐は全体とファイル単位で100%必須。計測対象の独立したファイル一覧も検査し、未計測ファイルを見逃しません。レポートは`coverage/merged/index.html`。UI/NodeはVitest 5、Workersは独立workspaceのVitest 5と公式プラグイン、両方Istanbulです。Workflowsの意図的失敗・restart/terminateは、成功したテスト中にもworkerdの診断ログを出します。

## 開発の規約

`package.json`のscriptsは使いません。タスクはルート`vite.config.ts`の`run.tasks`にあり、キャッシュを無効にしています。justfileにはVite Taskを呼ぶ短いコマンドだけを置きます。全workspaceのscripts禁止もテストします。

依存は最新安定版を基点とする範囲指定とlockfileで管理し、cfとCloudflare Vite plugin 2系だけ対応するベータを固定します。バージョン更新タスクや自動更新PRはありません。TypeScriptとVite出力はESNextです。

Oxlintの型情報付き解析と型検査を有効にし、correctness/suspicious/perf、Promise、import、Hooks、アクセシビリティ、テストのルールをエラーにします。警告も失敗します。Preactの自動JSXに不要なReact変数とSignalsの`.value`更新だけ、TSXに限定して例外を設けています。CSSと型宣言の副作用importは用途を明示して許可しています。

## cfベータの接続について

- `cf`はプロジェクト内の固定バージョン。グローバル設定は変更しません。
- `cf`はViteプロジェクトで`vite`を呼びます。`packages/vite-command`がそれをローカルVite Plusへ渡します。
- `cf d1 raw --local`は結果の出力後に終了しないため、初期化スクリプトが完全なJSON成功結果を確認した後、自分のcf子プロセス群だけを終了します。30秒のタイムアウトも設けています。ローカルD1のIDは公式環境の`DB-<Worker名>`に合わせます。
- runtime/binding型は`cf workers types`と設定からの`InferEnv`を利用。DO/RPC/Workflowのクラス型だけ具体化しています。
- 公式テストプラグインの内部依存としてWranglerがlockfileに存在しますが、Wrangler CLIや設定ファイルは利用していません。

## その他の資料

- [無料枠](docs/free-tier.md)
- [公開・削除の手順](docs/publishing.md)
- [確認状況とローカルの制約](docs/verification.md)
- [後続ロードマップ](docs/roadmap.md)
- [導入した公式skill](docs/skills.md)

デプロイ準備は[公開手順](docs/publishing.md)と[設定のひな形](.env.example)を参照。アップロード前チェックは`pnpm exec vp run deploy:dry-run`です。[GitHub ActionsのDeploy](.github/workflows/deploy.yml)はmainを対象とする手動公開です。APIトークン権限とproduction Environmentのsecrets/variablesは[公開手順](docs/publishing.md#5-github-actionsから公開する)に記載しています。旧構成のローカルデータは移行せず、新しい単一Worker用の保存先で初期化します。

今回はローカル実装と公開準備までです。リモート資源作成、課金設定、デプロイは実行していません。
