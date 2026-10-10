# 検証記録

## READMEをHTML閲覧ページへ変更（2026-10-10）

全14READMEとdocsの5文書を、元のMarkdownからSSRする白背景のページへ変更した。目次のアンカー、見出し、コード、表、学習ホーム・題材への導線を用意。文書間の相対リンクを閲覧URLへ解決し、ブラウザのタブにも文書タイトルを表示する。publicの重複原稿は削除し、旧txt URLはクエリを保持した308で転送する。

markdown-itはHTML無効で使用し、生HTML・危険なURLを実行しないこと、コード例内のリンク記述を変換しないことを検証した。開発サーバーと本番bundleのローカルpreviewで全19文書、目次移動、資料間移動、戻るリンク、日本語、ダークモードでも明るい配色、390px幅でページが横にはみ出さないことを確認。JavaScript無効のSSRと有効時のhydrationも確認した。

Node/UI 118テスト、Workers 21テスト、Playwright 4テストが成功。自作80ファイルの行775/775・文839/839・関数266/266・分岐301/301で、全体・各ファイルとも100%。整形、型生成、警告ゼロのlint、型検査も成功。ユーザーの開発サーバーを維持するため、Playwrightは一時設定で既存サーバーを再利用した。push・デプロイ・AGENTS.md・justfileの変更は行っていない。

## README文字化けの修正（2026-10-10）

READMEの本文はUTF-8だが、開発時のViteが`Content-Type: text/plain`だけで配信していた。開発用middlewareと本番Static Assetsの`public/_headers`で、テキストファイルに`text/plain; charset=utf-8`を設定した。

全14README・ロードマップ・Static Assetsのサンプルを、開発サーバーと本番bundleのローカルpreviewの両方でChromium確認した。ブラウザのdocument.characterSetがUTF-8で、表示本文がUTF-8のソース全文と一致することを検査した。本番へのアップロードは行っていない。

Node/UI 114テスト、Workers 20テスト、Playwright 4テストが成功。自作77ファイルで行736/736、文794/794、関数254/254、分岐274/274となり、全体・ファイル単位とも100%。整形・型生成・警告ゼロのlint・型検査も成功。Playwrightはユーザーの開発サーバーを停止せず、一時設定で既存サーバーを再利用して実行した。本番確認では通常のbuildスクリプトで単一Workerをビルドし、起動したpreviewだけを終了した。

## GitHubへのpushの取り消し（2026-10-10）

ユーザーの明示承認を得て、GitHubのmainをファイルも親コミットもないルートコミット`18bfdfe`へ戻した。直前のmainが想定SHAと一致する場合だけ更新するforce-with-leaseを使用。ローカルのmain・コード・3コミットは保持した。GitHub APIで空treeのSHAを確認し、repositoryのCLOUDFLARE_API_TOKEN、productionのCF_TURNSTILE_SECRETと7 Variablesが残っていることも確認した。

過去のCI成功は以下の履歴として残す。現在GitHubのmainは空で、今回の修正はpushしていない。AGENTS.mdはユーザーが破棄した状態を維持した。

## 確認済み（2026-10-10・単一Worker化後）

`pnpm exec vp run ci:check`が成功。Node/UI 107テスト、Workers 20テスト、Playwright 3テストが成功。自作実行コード76ファイルをIstanbulで計測し、行730/730、文787/787、関数251/251、分岐270/270。全体・各ファイルの4指標が100%。型生成、警告ゼロのlint、型検査、単一Workerのcf buildと出力検査も成功。

Build OutputのWorkerディレクトリは`default`一つのみ。名前は`cf-playground`。Counter/ChatRoom/OrderWorkflow/Internal、CronとQueue consumerは同じWorkerに含まれる。RPCのINTERNAL bindingも`cf-playground#Internal`を指す。公開用bundleはgzip後約91KiBで、ビルド処理はWorkers Freeの3MiB上限も検査する。

`pnpm exec vp run deploy:dry-run`（`cf deploy --dry-run --provision=false`）も成功。アップロード・自動provisionは行っていない。これはローカルの仮IDと空の本番認証設定による構成・bundleの確認であり、実アカウントの資源ID・secret・Access/Turnstileの確認ではない。

ローカルD1の連続初期化を確認。旧構成のローカルデータは移行せず、保存先を`apps/00-home/.cloudflare/state`に集約して新しく初期化する。旧題材の保存先は使用しない。ユーザー調整済みのjustfileは変更していない。

`just dev`でホームと14題材のHTTP 200、4101〜4114に題材サーバーがないこと、4100のローカルscheduled発火とCron履歴への保存を確認。Ctrl+Cで停止した。

CIと新しいDeployの両workflowをactionlint 1.7.12とShellCheck 0.11.0で検査済み。Deployはmainの手動実行、CI成功後の本番ビルド・prebuilt dry-run・公開、production Environment、同時公開の直列化を設定した。ビルドとdry-runの子プロセスに親のAPIトークン・Turnstile secretを再導入しないこと、準備失敗時に公開しないこともテストした。GitHubリモートはmaya0513/cf-playground。初回commit `ade65ff`をmainへpushし、[実際のCI](https://github.com/maya0513/cf-playground/actions/runs/38047829205)も全ステップ成功した。production Environmentを作成し、デプロイ可能なブランチをmainだけに限定した。CLOUDFLARE_API_TOKENはユーザーがrepository secretへ登録済み。7 VariablesとTurnstile secretも登録済み（下記参照）。

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

## 実アカウントの公開準備で確認済み（2026-10-10）

ローカルcfのOAuthログインで公開先アカウントmaya0513を確認。既存のD1/KV/R2/Queue/Turnstileがないことを調査後、このアプリ専用の以下を作成し、一覧の再取得で確認した。既存のしりとりサイトや課金設定は変更していない。

| 種類           | 作成した資源                    | 確認結果                                                 |
| -------------- | ------------------------------- | -------------------------------------------------------- |
| D1             | cf-playground                   | bookmarks/jobs/ordersをSELECTで確認、初期ブックマーク1件 |
| KV Classic     | cf-learn-notice / cf-learn-cron | 2 namespaceのIDを確認                                    |
| R2 Standard    | cf-learn-files                  | APAC、Standardで作成                                     |
| Queue          | cf-learn-jobs                   | 作成済み、consumerはデプロイ時に設定                     |
| Turnstile Free | cf-playground                   | Managed、公開予定hostnameのみ、追加のEnterprise機能なし  |
| Access Free    | cf-playground Access            | /accessと/access/*のみ、本人メールの再利用Allow policy   |

Turnstileは秘密鍵をメモリ内だけで扱い、Siteverifyがダミートークンを`invalid-input-response`で拒否し、`invalid-input-secret`を返さないことを確認した。これは秘密鍵の受理確認であり、実challengeの成功・再利用拒否の確認ではない。ユーザーの明示承認を得てGitHub productionのCF_TURNSTILE_SECRETへ標準入力で直接登録し、値を取得せずsecret名を再確認した。

ユーザーがZero Trust Freeを初期設定した後、組織のauth_domainがspring-salad-cebc.cloudflareaccess.comであること、既存アプリ・ポリシーがなくCloudflare IdPだけがあることを確認。専用の再利用ポリシーとパス単位アプリを作成した。本人のCloudflareアカウントのメールアドレスだけを許可し、session_duration=1h、HttpOnlyとpath_cookie_attributeを有効にした。作成後の一覧を再取得して対象パス・許可条件・IdP・Cookie設定を照合し、issuerの公開JWKSから署名鍵2件を取得できることも確認した。

GitHub productionに7 Variablesを登録した。CLOUDFLARE_API_TOKENは既存のrepository secret、CF_TURNSTILE_SECRETはEnvironment secret。非秘密設定をローカルのgit対象外.envにも保存し、GitHubから再取得した7 Variablesが完全一致することを確認した。Secretは名前のみを再確認し、productionのmain限定も再取得して検証した。

7つの実設定を使った`pnpm exec vp run deploy:check`も成功。単一Workerをビルドし、同じBuild Outputをprebuilt dry-runした。Turnstile/Access設定とD1/KV/R2/Queueのbindingを確認した。gzip後90.96KiB、アップロードと自動provisionは未実行。このdry-runはGitHubのAPI tokenによるアップロードや実ログインを検証するものではない。

## 実サービスで未確認

[公開手順](publishing.md)と`.env.example`で必要な値を一覧化した。課金設定の変更とデプロイは行っていない。

KVの拠点間伝播、実Turnstileのchallenge・再利用拒否、Accessの本人によるIdPログイン完了・実JWT、Cronの時刻による自動発火、長期運用時の無料枠消費は未確認。初回配置・公開画面・実Queue/DO/WorkflowとAccessの未認証時の転送は、下記の本番確認で検証した。

Deploy workflowの実行は下記のとおり成功した。GitHubに保存したAPI tokenの値は取得せず、実際のアップロード権限をActionsで確認した。DO/Workflow/内部入口とQueue consumerも配置済み。

## GitHub Actionsからの初回公開（2026-10-10）

miseをユーザー指定のNode 24 / pnpm 12へ変更し、Node型定義も24系へ合わせた。justはユーザー変更に従ってmise管理から外した。Node 24.21.0で整形・型生成・lint・型検査・100%カバレッジ・本番bundleのブラウザ確認が成功した。

空に戻したリモート履歴をmergeし、通常pushでmainへ反映。[pushのCI](https://github.com/maya0513/cf-playground/actions/runs/38052020558)と[初回Deploy](https://github.com/maya0513/cf-playground/actions/runs/38052162829)が成功した。Cloudflareの配置一覧でも単一のcf-playgroundの有効なバージョンと配信100%を確認した。

公開URLは https://cf-playground.maya0513.workers.dev/ 。Chromiumで全19文書の日本語・HTML構造・目次・リンク・明るい配色・モバイル幅を確認。Access以外の13題材はSSRとhydrationが成功し、Accessの3パスは未認証でteamのログイン先へ302転送された。D1の登録・編集・削除、R2のバイナリ保存・取得・削除、SQLite DOの加減算、実Queue consumerの完了、実Workflowの待機・発送・完了、RPCのHTTP・型付き呼出し、KV読み込みと手動Cronによる履歴保存を確認。テスト用のブックマークとR2ファイルは削除し、カウンターは元に戻した。QueueとWorkflowの動作確認履歴は各1件残す。

初回公開でWebSocketのコード省略時の切断が約10秒後に1006になることを再現。1000を明示すると約0.1秒で正常切断できたため、切断・再接続・unmountの全経路に1000を指定し、UIテストも追加した。Workers Cacheも初回は有効化設定が不足していたため、単一Workerにcache.enabledを追加し、設定の回帰検査を加えた。動的レスポンスは時刻APIのキャッシュ有効版以外no-storeを維持する。
