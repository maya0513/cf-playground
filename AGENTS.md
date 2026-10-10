# このリポジトリの実装方針

- Cloudflareの学習用。日本語で説明し、題材ごとに小さなソースモジュールを用意し、公開Workerはcf-playground一つにまとめる。
- Preact / Signals / preact-iso / Hono、SSRとhydrationを使う。
- Nodeとpnpmはmise.tomlのメジャー指定（26/12）を使う。Vite Plusはローカル依存。
- Cloudflare操作はcf、設定はcloudflare.config.ts。Wrangler CLIや設定を追加しない。
- 公式skillは.agents/skills。cfの最新ドキュメントとインストール済み型を確認する。
- 無料プラン・無料枠の機能だけを扱う。リモート作成、課金、デプロイは別途承認が必要。
- 自作の実行コードは行・文・関数・分岐をファイル単位でも100%にする。未実行ファイルも含める。ignoreや除外で未達を隠さない。
- Workerテストは公式ローカルランタイムとIstanbul。Node/UIとWorkersはVitest 5の別実行環境に分離する。
- pnpm exec vp run ci:checkがローカルとGitHub Actionsの共通チェック。
- 認証fixtureはdevelopment/test mode限定（MODE=local）。本番で設定が足りなければ拒否する。

- ブラウザの入口は4100のみ。URLはpackages/catalog、単一Vite設定はpackages/tooling、HTTP・Cron・Queueと全exportの入口はapps/00-home。題材別のWorkerやプロキシは追加しない。
- package.jsonのscriptsは禁止。タスクはvite.config.tsのrun.tasks、すべてcache:false。実行はpnpm exec vp run <task>。
- 日常操作はjustfileから既存のVite Taskを呼べるようにする。justはmise管理。個別起動用レシピと更新コマンドは追加しない。
- 依存は最新安定版の範囲指定＋lockfile。cfとCloudflare Vite plugin 2系だけ互換ベータを固定する。更新タスク・自動更新PRは作らない。
- ESNext、厳格なTypeScript、型情報付きOxlintと型検査を使用。警告もエラー。lint/coverageの広い無効化で未達を隠さない。
- 変更箇所と既存コードを継続的に整理し、製品固有のbinding操作とSQLは各題材に残す。
- Cloudflare設定の依存ファイルはViteのfs.denyに入る。公開画面が使うcatalogをcloudflare.config.tsへ実行時importしない。RPCのService Bindingは同じWorkerの名前付きInternalへ接続し、追加Workerを作らない。
