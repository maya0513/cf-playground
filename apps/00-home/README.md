# 学習ホームと入口Worker

`just dev`で単一Workerを起動し、<http://localhost:4100/>を開く。ホームと全14題材を同じサーバーで提供する。

`packages/catalog/index.ts` → `src/view.tsx` → `packages/catalog/routing.ts` → `src/index.tsx` → `src/client.tsx`の順に読む。題材リンクは同一オリジンのサブパス。ホームへのリンクは常に`/`。末尾スラッシュなしはクエリを保持して308転送する。

`src/index.tsx`がURLで題材のfetchへ振り分ける。CronとQueue handler、DO・Workflow・RPCのクラスもここからexportする。元のRequestを渡すので、ストリーム本文・認証ヘッダー・WebSocket Upgradeを保持する。開発プロキシや別ポートは不要。

`src/client.tsx`はURLに対応する題材のhydration entryだけを動的に読む。SSR shellは全題材共通、静的アセットはassets-firstで配信する。

[公開手順](../../docs/publishing.md)に従い、cf-playground一つを配置する。今回リモート操作は行っていない。無料枠と本番の制約は[確認記録](../../docs/verification.md)を読む。
