# Service Bindings / RPC：内部呼び出し

## 目的

HTTP service bindingと型付きRPCを比較する。

## 読む順番

1. `apps/00-home/cloudflare.config.ts`：全題材のbinding、trigger、export。
2. `src/index.tsx`：APIとbinding操作。
3. `src/view.tsx`：画面ごとのSignalsと更新操作。
4. `src/client.tsx` → `packages/ui/client.tsx`：SSRと同じ初期値でhydrate。
5. `tests/workers/`：成功、不正入力、上限、保存失敗の検証。

## 処理と設計理由

INTERNAL bindingは公開インターネットを経由しない。同じWorker内のWorkerEntrypointを継承する名前付きInternalエントリーポイントでgreet/fetchを公開する。別Workerは作らない。Worker間で分離する構成は後続の発展課題とする。

共通SSRは`packages/ui/server.tsx`。初期値をHTMLとJSONへ埋め込み、JSONの`<`をエスケープする。クライアントは同じ値でhydrateし、初回の再fetchをしない。Signalsは各画面インスタンス内で作る。更新は同一オリジンAPI、エラーは`{error:{code,message}}`。

## 起動・確認・初期化

ルートで実行する。

```sh
just setup
just dev
```

ホーム`http://localhost:4100/` → 題材`http://localhost:4100/rpc/`。

HTTP/RPCで同じmessageを比較する。

停止後に`just reset`。単一Workerの`apps/00-home/.cloudflare/state`を削除し、全題材のローカルデータを初期化する。本番資源には触れない。

## 無料枠・ローカルとの差

[無料枠一覧](../../docs/free-tier.md)を参照。ローカルは分散拠点、課金、本番のレイテンシを再現しない。データ件数の制限は操作回数の無料枠を保証しないので、公開時にはアカウント全体の使用量を確認する。

## 将来の公開・削除

今回公開していない。[公開手順](../../docs/publishing.md)で、単一Workerと必要な共通資源を準備する。ローカル識別子を実IDへ対応させ、localを使わずcf build→cf deploy。認証題材は本番設定を完成させてから実行する。

Workerの削除は全題材を停止する。題材だけの削除は、共通設定のtrigger/bindingと参照を整理してから行う。共有D1を削除すると他の題材のデータも失われる。DOのexport削除は[cf構成資料](https://developers.cloudflare.com/cf/projects/cloudflare-config/)の状態移行を読む。保存データも失われる。

## 変更課題

greetに言語引数を加え、HTTP側と型の検証の違いを考える。

## 公式資料

- [製品ドキュメント](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [cf構成](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
