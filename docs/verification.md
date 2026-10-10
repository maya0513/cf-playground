# 検証記録

## 確認済み（2026-10-10・単一Worker化後）

`pnpm exec vp run ci:check`が成功。Node/UI 107テスト、Workers 20テスト、Playwright 3テストが成功。自作実行コード76ファイルをIstanbulで計測し、行730/730、文787/787、関数251/251、分岐270/270。全体・各ファイルの4指標が100%。型生成、警告ゼロのlint、型検査、単一Workerのcf buildと出力検査も成功。

Build OutputのWorkerディレクトリは`default`一つのみ。名前は`cf-playground`。Counter/ChatRoom/OrderWorkflow/Internal、CronとQueue consumerは同じWorkerに含まれる。RPCのINTERNAL bindingも`cf-playground#Internal`を指す。公開用bundleはgzip後約91KiBで、ビルド処理はWorkers Freeの3MiB上限も検査する。

`pnpm exec vp run deploy:dry-run`（`cf deploy --dry-run --provision=false`）も成功。アップロード・自動provisionは行っていない。これはローカルの仮IDと空の本番認証設定による構成・bundleの確認であり、実アカウントの資源ID・secret・Access/Turnstileの確認ではない。

ローカルD1の連続初期化を確認。旧構成のローカルデータは移行せず、保存先を`apps/00-home/.cloudflare/state`に集約して新しく初期化する。旧題材の保存先は使用しない。ユーザー調整済みのjustfileは変更していない。

`just dev`でホームと14題材のHTTP 200、4101〜4114に題材サーバーがないこと、4100のローカルscheduled発火とCron履歴への保存を確認。Ctrl+Cで停止した。

CIと新しいDeployの両workflowをactionlint 1.7.12とShellCheck 0.11.0で検査済み。Deployはmainの手動実行、CI成功後の本番ビルド・prebuilt dry-run・公開、production Environment、同時公開の直列化を設定した。ビルドとdry-runの子プロセスに親のAPIトークン・Turnstile secretを再導入しないこと、準備失敗時に公開しないこともテストした。GitHubリモートはmaya0513/cf-playground。初回commit `ade65ff`をmainへpushし、[実際のCI](https://github.com/maya0513/cf-playground/actions/runs/38047829205)も全ステップ成功した。production Environmentを作成し、デプロイ可能なブランチをmainだけに限定した。CLOUDFLARE_API_TOKENはユーザーがrepository secretへ登録済み。残りのVariablesとTurnstile secretは未設定。

新しい`deploy:check`タスク（単一Workerのbuild→`cf deploy --prebuilt --mode production --dry-run --provision=false`）も成功。デプロイ処理はcfをモックし、必須設定の欠落、仮ID・公式テストキーの拒否、secretのJSONエンコード・ファイル権限、成功・書き込み失敗・アップロード失敗時の削除を検証した。実APIトークンの権限や本番secretを使ったアップロードは未確認。

## ローカルで確認する範囲

環境はmiseのNode.js 26.11.1 / pnpm 12.10.1。Cloudflare認証情報なしでCI共通チェックを実行する。UI/NodeはVite Plus内蔵Vitest 5、Workersは別workspaceのVitest 5.0.3と公式プラグイン1.4.0。カバレッジは両方Istanbul。

- 自作コードの行・文・関数・分岐をファイル単位と全体で100%判定する。実ファイル一覧と計測結果を照合し、未計測ファイルも失敗する。
- Vitest 5が設定ファイル・設定依存を除外するため、Vite設定とNodeテスト設定は同じソースをテスト内でIstanbul計測付きで実行する。カウンターや実行回数を手動で作らない。
- 公式Miniflare/workerdでD1/KV/R2/Queues/DO/Workflowsを検証する。SQLite DOの並行更新、退避後の永続化、WebSocketの切断/再接続とHibernationを含む。
- 統合入口から全14題材のSSRとAPIを確認。クエリ、本文、ステータス、308、ページ/API/静的ファイルの404を検査する。複数Worker向けのプロキシ・未起動503・個別起動は廃止した。
- Siteverifyの成功・拒否・通信失敗・不正応答はWorkersテストで応答を制御する。ブラウザではウィジェットを制御し、実サービスに依存しない。公式テストキーの実challengeは別途手動確認する。
- Accessの署名、issuer、audience、期限、必須claim、改ざん、本番設定不足時の拒否を検証。Cookieは`/access/`に限定する。
- developmentのブラウザテストはJS無効のSSR、全14画面のhydration、ホームからの移動、直接URL、再読み込みと主要操作を確認する。WebSocket再接続、Queueの完了、Workflowの完了を含む。
- productionテストは単一の本番bundleをVite preview/公式workerdで4200へ起動する。全14題材のSSR、JSとStatic AssetsのCSS/画像/テキスト、308、404、401、R2のバイナリ取得とヘッダー、hydration、WebSocket、同一WorkerへのHTTP/RPCを確認する。
- `cf dev`がBuild Outputを削除するため、productionテストは開発テスト後にcf buildを再実行し、実際の成果物を読む。終了時は起動したプロセス群を停止し、ログをtest-resultsへ保存する。

## 現行ベータ版との接続

- Viteの`local`は予約mode。起動には`development`を使い、development/test時だけ認証fixtureを有効にする。production/指定なしでは有効にしない。
- 単一Viteのbaseは`/`。全題材で同じSSR shellを使い、ブラウザの入口がURLに応じたhydration moduleだけを動的importする。静的ファイルはassets-firstで配信し、他の要求を統合fetchへ渡す。
- D1のローカルIDは`DB-cf-playground`。初期化は3題材のSQLをまとめ、同じIDと永続化ディレクトリへ一度の`cf d1 raw --local`で適用する。
- cf beta.14のローカルrawは結果出力後も終了しない。成功JSONを確認してから自分の子プロセス群を終了する。古いプロキシを次回が発見しないよう、初期化用registryは呼び出しごとに分離し、成功・失敗の両方で後片付けする。開発時のregistryとは共有しない。
- 開発サーバーはcfの子プロセスを一つ起動し、SIGINT/SIGTERMで自身の子プロセス群だけを停止する。PlaywrightはSIGTERMでこの後片付けを確認する。
- Workers CacheのローカルではエッジのHIT/伝播を再現できず、`cache.purge`も未提供。APIは`LOCAL_UNSUPPORTED`を返す。テストで制御したpurge成功応答はAPI契約の確認である。
- Workflowsの意図的失敗やterminate、および一部のWebSocket診断は成功したテスト中もworkerdのログに出る。
- Cloudflare設定からimportした実行ファイルはViteのfs.denyに入る。公開画面も使うcatalogをCloudflare設定からimportしない。
- cfのworkspace自動検出警告が出るが、公開対象のapps/00-homeは明示的な設定を持つ。グローバル設定は変更していない。

## 実サービスで未確認

リソース作成、課金設定、secret登録、デプロイは行っていない。[公開手順](publishing.md)と`.env.example`で必要な値を一覧化した。

実アカウントの資源ID・secretでのdry-run、workers.devへの初回配置、KVの拠点間伝播、エッジCache、実Turnstile、AccessのIdPとパス単位ポリシー、実Cron/Queue/DO/Workflow、無料枠の消費は公開時に確認する。hostname/path単位Accessの手順は公式資料で確認済みだが、実アカウントでは未実施。

Deploy workflowの実行は未実施。ローカルcfは未ログインのため、Cloudflare側の資源と認証設定はユーザーのブラウザ認証後に確認・準備する。
