# 単一Workerの公開準備

公開対象は **cf-playground の1 Workerのみ**。設定は`apps/00-home/cloudflare.config.ts`、入口は`apps/00-home/src/index.tsx`。14題材とCron/Queue consumer、Counter/ChatRoom/OrderWorkflow/Internalを同じWorkerに含める。`apps/14-internal`は名前付き入口のソースであり、独立したデプロイ対象ではない。

2026-10-10、ユーザーの委任に基づくリソース作成とGitHub設定を完了した。課金設定の変更とデプロイは未実施。追加のリソース作成・課金変更・デプロイは別途承認後に行う。ローカルの`just setup`・`just build`・`just check`は認証不要。

## 準備済みの設定

- D1 `cf-playground`、KV Classic `cf-learn-notice` / `cf-learn-cron`、R2 Standard `cf-learn-files`、Queue `cf-learn-jobs`を作成済み。D1には3題材のSQLと初期ブックマーク1件を適用し、SELECTで確認した。これらを再作成する必要はない。
- Turnstile `cf-playground`はManaged、許可hostnameは`cf-playground.maya0513.workers.dev`。秘密鍵をSiteverifyのダミー応答で検査し、ユーザーの明示承認後、GitHub productionの`CF_TURNSTILE_SECRET`へ直接登録した。秘密鍵はローカルへ保存していない。実challengeと再利用拒否は公開後に確認する。
- Zero Trust Freeのteamは`spring-salad-cebc`。Accessアプリ`cf-playground Access`は`cf-playground.maya0513.workers.dev/access`と`/access/*`のみを対象とし、本人のCloudflareアカウントのメールアドレスだけを許可する再利用ポリシー`cf-playground-owner`を参照する。ログインには既存のCloudflare IdPを使い、セッションは1時間、CookieはHttpOnly・パス範囲指定を有効にした。他のWorkerやホームは保護対象に含めていない。
- GitHub productionの7 VariablesとTurnstile secretは登録済み。`CLOUDFLARE_API_TOKEN`は既存のrepository secretを参照する。ローカルのgit対象外`.env`にも非秘密設定だけを保存した。

公開予定先は`https://cf-playground.maya0513.workers.dev/`。Deploy workflowはまだ実行していない。実トークンによるアップロード権限とAccessログイン等は公開後の確認対象。準備の検証結果は[検証記録](verification.md)に記載する。

## 1. 準備するリソース

| 種類           | 名前・用途                                   | 公開前に用意する値                                       |
| -------------- | -------------------------------------------- | -------------------------------------------------------- |
| Worker         | cf-playground                                | アカウントID・workers.devのサブドメイン                  |
| D1             | cf-playground                                | CF_DB_ID。bookmarks/jobs/ordersの3テーブルを同じDBへ作る |
| KV Classic     | cf-learn-notice                              | CF_NOTICE_NAMESPACE_ID                                   |
| KV Classic     | cf-learn-cron                                | CF_HISTORY_NAMESPACE_ID                                  |
| R2 Standard    | cf-learn-files                               | 同名バケット。R2利用開始と支払い方法の設定が必要         |
| Queues         | cf-learn-jobs                                | 同名Queue。consumerはcf-playground自身                   |
| SQLite DO      | Counter / ChatRoom                           | cf設定のexportsがWorkerへの初回配置時に管理              |
| Workflows      | cf-learn-orders / OrderWorkflow              | cf設定のexportsがWorkerと一緒に管理                      |
| Turnstile Free | 公開hostname用ウィジェット                   | CF_TURNSTILE_SITEKEYとsecret binding SECRET              |
| Access Free    | `/access/*`を保護するself-hosted application | CF_ACCESS_ISSUER / CF_ACCESS_AUDIENCE・許可ポリシー      |

D1はDBを共有するが、題材間で他のテーブルを操作しない。KV・R2・Queue・DO・Workflowは別のデータ資源。1 Workerへの集約はリクエスト、CPU、各製品の使用量を無制限にするものではない。[無料枠](free-tier.md)を公開直前に確認する。

## 2. 公開用の設定

ルートの`.env.example`を`.env`へコピーして上表の値を記入する。ID等の非秘密設定だけを含める。`.env`はgit管理対象外。cfの設定評価時に環境変数として渡すため、同じシェルで次を実行する。

```sh
set -a
. ./.env
set +a
```

`CLOUDFLARE_ACCOUNT_ID`はcfの標準設定。その他の`CF_*`は本リポジトリのCloudflare設定が読む。ローカルのdevelopment/testではこれらの値を使わず、ローカル専用IDと公式テストキーを使う。本番設定が空のままならTurnstile/Accessは許可しない。ローカル用の仮IDは公開前に必ず実IDへ置き換える。

TurnstileのSECRETはCloudflareのsecretとして登録する。初回配置では`cf deploy --secrets-file`で渡せる。git対象外の`apps/00-home/.dev.vars.production`を作り、`SECRET=実際の秘密鍵`のみを記入する。これは初回公開の入力用であり、development/testのfixtureを本番へ流用しない。API tokenをこのファイルへ入れない。トークンを使う場合はシェルの安全なsecret管理から`CLOUDFLARE_API_TOKEN`を渡す。

## 3. リモート作成時に使うcf

人が`pnpm exec cf auth login`を行い、Workers Freeの対象アカウントを確認する。CLIはベータなので、まず`pnpm exec cf cli search "create D1 database"`のように匿名の操作名で検索し、見つかったコマンドの`--help`と`cf schema`を確認する。

次は現行CLIのhelpで確認したコマンドの例。**実行するとリモート資源を作るため、承認後だけ実行する。**

```sh
pnpm exec cf d1 create --name cf-playground
pnpm exec cf kv namespaces create --title cf-learn-notice
pnpm exec cf kv namespaces create --title cf-learn-cron
pnpm exec cf queues create --queue-name cf-learn-jobs
```

R2 Standardの作成は`cf cli search "create R2 bucket"`で確認する。返却されたD1/KVのIDを`.env`へ記入する。名前・IDを指定して既存資源の一覧と照合する。自動provisionは公開コマンドで無効にし、意図しない資源作成を避ける。

D1へ次の3ファイルのSQLを適用する。ローカル初期化コマンドをリモート向けに変更しない。

- `apps/03-d1/migrations/0001_bookmarks.sql`
- `apps/10-queues/migrations/0001_jobs.sql`
- `apps/13-workflows/migrations/0001_orders.sql`

`cf d1 query <CF_DB_ID> --sql <SQL本文>`が現行のAPI。`cf cli search "apply D1 migrations"`でファイル指定の手順を確認してもよい。データを消すresetは実行しない。

AccessはZero Trust > Access > Applicationsでself-hosted applicationを作り、`cf-playground.<subdomain>.workers.dev/access/*`を対象にする。`/access`の末尾スラッシュ転送も保護対象に含める。ホームや他題材まで一括保護しない。Worker全体を保護する方式はWebSocketに制限があるため、この構成ではhostname/path単位の方式を使う。[CloudflareのAccess公式資料](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)で設定方法を確認する。issuerは`https://<team>.cloudflareaccess.com`、audienceは作成したアプリのAUD。Worker側でもJWTの署名・issuer・audience・期限を検証する。

## 4. ビルドとデプロイの確認

```sh
just check
# .envをexportした同じシェルで、本番ビルドとアップロード前チェック
pnpm exec vp run deploy:dry-run
```

mode指定なしのproductionを使う。`--mode development`は公開に使わない。`cf deploy --dry-run`はアップロードしないが、アカウントやbindingの照合に認証が必要になる場合がある。今回のローカル確認と実アカウントの確認は[検証記録](verification.md)で区別する。

`just build`は`cf build`後にBuild OutputのWorkerが`default`一つだけであることと、Worker bundle/SSR shellを検査する。静的ファイルと各題材のクライアントchunkは同じWorkerのAssetsへ入る。D1/KV/R2/Queue・secret・Access/Turnstileの準備が完了し、dry-runの対象と出力をレビューしてから公開する。

**以下は別途承認後に実行する。**

```sh
pnpm --dir apps/00-home exec cf deploy --provision=false --secrets-file .dev.vars.production
```

初回配置後も、公開先は`https://cf-playground.<subdomain>.workers.dev/`一つ。Cron/Queue/DO/Workflowの管理設定は同じWorkerに属する。RPCのINTERNAL bindingは`cf-playground`自身の`Internal`入口を参照する。追加Workerの作成は不要。

## 5. GitHub Actionsから公開する

[Deploy workflow](../.github/workflows/deploy.yml)は手動実行のみ。`main`を選んで実行すると、同じcommitに対する既存CIの全チェックが成功した後、`production` Environmentの設定でビルドし、dry-runした同じ出力を`--prebuilt --mode production --provision=false`で公開する。他ブランチの実行はスキップする。pushやPull Requestによる自動公開は行わない。同時公開は直列化し、進行中の公開を取り消さない。

### Cloudflare APIトークン

Cloudflare DashboardのMy Profile > API Tokens > Create Token > Create Custom Tokenで、このリポジトリ専用のトークン（例: `github-cf-playground-deploy`）を作る。Account API tokensを利用できる場合は同等の権限でアカウント所有トークンを使ってもよい。Global API Keyは使わない。[API tokenの作成](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)、[cfのCI認証](https://developers.cloudflare.com/cf/ci/)を参照。

このworkflowは既存リソースへのbindingとWorkerの更新だけを行う。次のAccount権限を指定し、Account Resourcesを **Include > Specific account > 公開先アカウント** に限定する。

| 対象                         | 権限 | 用途                                                             |
| ---------------------------- | ---- | ---------------------------------------------------------------- |
| Account / Workers Scripts    | Edit | Worker・Assets・secret・Cron・DO・Workflow・Queue consumerの配置 |
| Account / Workers KV Storage | Read | 既存KV namespaceの照合                                           |
| Account / Workers R2 Storage | Read | 既存R2 bucketの照合                                              |
| Account / D1                 | Read | 既存D1 databaseの照合                                            |

Dashboardの`Edit`はAPI資料で`Write`と表記される場合がある。根拠は[公式の権限一覧](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)、[Queue consumerの作成](https://developers.cloudflare.com/api/resources/queues/subresources/consumers/methods/create/)、[Workflowの作成・更新](https://developers.cloudflare.com/api/resources/workflows/methods/update/)。Queue consumerとWorkflowの更新は`Workers Scripts Write`で許可されるため、専用のQueues Editは追加しない。実アカウントでの権限照合は初回公開時に確認する。

Zone/DNS/Workers Routes、Access、Turnstile、課金、APIトークン管理の権限は追加しない。公開先はworkers.devで、Access/Turnstileの管理はDashboardで別途行う。Worker実行時のD1/KV/R2読み書きはbinding経由なので、このデプロイ用トークンにデータ書き込み権限を追加する必要はない。D1のSQL適用・リソースの作成はこのworkflowに含めず、前節の手順を別途実施する。

### GitHubの設定

リポジトリ `maya0513/cf-playground` のSettings > Environmentsで **production** を作り、Deployment branchesを`main`に限定する。以下をEnvironmentのsecrets/variablesに登録する。Environmentを利用できない場合は同名のrepository secrets/variablesでも解決されるが、workflowの`environment: production`は維持する。

| 種類     | 名前                    | 値                                                               |
| -------- | ----------------------- | ---------------------------------------------------------------- |
| Secret   | CLOUDFLARE_API_TOKEN    | 上で発行した専用APIトークン                                      |
| Secret   | CF_TURNSTILE_SECRET     | 本番Turnstileウィジェットの秘密鍵。Worker binding `SECRET`へ渡す |
| Variable | CLOUDFLARE_ACCOUNT_ID   | 公開先アカウントID                                               |
| Variable | CF_DB_ID                | 事前作成したD1のUUID                                             |
| Variable | CF_NOTICE_NAMESPACE_ID  | お知らせ用KVのID                                                 |
| Variable | CF_HISTORY_NAMESPACE_ID | Cron履歴用KVのID                                                 |
| Variable | CF_TURNSTILE_SITEKEY    | 本番Turnstileのsitekey                                           |
| Variable | CF_ACCESS_ISSUER        | `https://<team>.cloudflareaccess.com`                            |
| Variable | CF_ACCESS_AUDIENCE      | Access applicationのAUD                                          |

APIトークンとTurnstile secretの値をチャットやコードへ貼らない。`gh`を使う場合は、production Environmentを作成した後、値を引数にせず次の対話入力で登録できる。

```sh
gh secret set CLOUDFLARE_API_TOKEN --env production --repo maya0513/cf-playground
gh secret set CF_TURNSTILE_SECRET --env production --repo maya0513/cf-playground
```

production Environmentとmain限定のbranch policyは作成済み。コードとworkflowの初回push、および[実CI](https://github.com/maya0513/cf-playground/actions/runs/38047829205)は成功した。CLOUDFLARE_API_TOKENはユーザーがrepository secretへ登録済みで、このEnvironmentからも参照できる。7 VariablesとCF_TURNSTILE_SECRETも登録済み。公開時はActions > Deploy > Run workflowでbranch **main** を選ぶ。Deploy workflowはまだ実行していない。

チェックjobへsecretを継承しない。公開jobでも依存インストールにはAPIトークンを渡さず、最後のVite Task `deploy`だけが受け取る。`deploy`内のビルド・dry-runの子プロセスからはAPIトークンとTurnstile secretを環境変数ごと取り除き、公開プロセスにだけ渡す。`scripts/deployment.ts`が設定を検証し、Turnstile secretを権限0600の一時JSONへ書き、cfに`--secrets-file`で渡す。secret値はコマンド引数に入れず、通常終了・書き込み失敗・アップロード失敗のいずれでも一時ディレクトリを削除する。secretファイルを成果物に保存しない。

`pnpm exec vp run deploy`はリモートを更新する実コマンド。ローカルで試す場合も別途承認後だけ実行する。本番値をexportした環境で実行する。`deploy`自身が設定検証、単一Workerのビルド、同じ出力のdry-run、公開を順に行う。公開せず同じ準備処理を確認するには`pnpm exec vp run deploy:check`を使う。このTaskもビルド後に同じ出力をprebuilt dry-runする。cf/Vite設定の読み込みが以前のBuild Outputを削除するため、ビルドとprebuilt処理を別の`vp run`に分けず、一つのTask内で連続実行する。

## 6. 公開後の確認

- 全14サブパスのSSR・hydration・直接URL・308・404、CSS/画像/JSとAPI。
- D1/R2/DOの永続化と削除。bookmarks/jobs/ordersが混ざらないこと。
- KVの拠点間伝播とTTL。CacheのエッジHIT/失効/パージ。
- Turnstileの実challenge、hostname/action、期限切れ・再利用の拒否。
- Accessの許可/拒否・IdPログイン・JWT期限。ホームと他題材の公開アクセス。
- Cronの実スケジュール、Queueの配信・再試行、Workflowの待機・再開。
- WebSocketの接続/配信/切断/再接続とHibernation、同一WorkerへのHTTP/RPC。
- DashboardのWorkerが1件だけ追加されていること、Workers Logs/Tracesと各無料枠の使用量。

## 7. 削除と構成変更

まずCron/Queueの新規実行を停止する。Worker一つの削除は全題材を停止する。特定の題材だけを外す場合、ルーティング、クライアント、binding、trigger、exportを一緒に整理する。

DO/Workflowのexport削除は[cfのライフサイクル設定](https://developers.cloudflare.com/cf/projects/cloudflare-config/)を確認して進める。共有D1の削除は全3題材のデータを消すので、題材だけの削除では必要なテーブルのみを対象にする。全撤去ではWorkerと専用のD1/KV/R2/Queue/Workflow、Turnstile/Accessアプリを削除する。共有IdPやZero Trust組織は削除しない。

削除も`cf cli search "delete …"`→`--help`/`cf schema`→`--dry-run`で対象を確認する。終了コードだけで判断せず、削除後の一覧を確認する。
