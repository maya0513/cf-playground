# Queues：テキスト集計

## 目的

producer、consumer、再配信と冪等性を学ぶ。

## 読む順番

1. `apps/00-home/cloudflare.config.ts`：全題材のbinding、trigger、export。
2. `src/index.tsx`：APIとbinding操作。
3. `src/view.tsx`：画面ごとのSignalsと更新操作。
4. `src/client.tsx` → `packages/ui/client.tsx`：SSRと同じ初期値でhydrate。
5. `tests/workers/`：成功、不正入力、上限、保存失敗の検証。

## 処理と設計理由

D1にpending保存後、Queueへ投入。consumerはWHERE state=pendingで結果を一度だけ確定しack。保存失敗はretry。送信失敗で残ったpendingは同じIDで再送。履歴100件。

共通SSRは`packages/ui/server.tsx`。初期値をHTMLとJSONへ埋め込み、JSONの`<`をエスケープする。クライアントは同じ値でhydrateし、初回の再fetchをしない。Signalsは各画面インスタンス内で作る。更新は同一オリジンAPI、エラーは`{error:{code,message}}`。

## 起動・確認・初期化

ルートで実行する。

```sh
just setup
just dev
```

ホーム`http://localhost:4100/` → 題材`http://localhost:4100/queues/`。

投入→状態更新でdone。同じIDで再送。wordsは空白区切りであり、日本語の形態素解析ではない。

停止後に`just reset`。単一Workerの`apps/00-home/.cloudflare/state`を削除し、全題材のローカルデータを初期化する。本番資源には触れない。

## 無料枠・ローカルとの差

[無料枠一覧](../../docs/free-tier.md)を参照。ローカルは分散拠点、課金、本番のレイテンシを再現しない。データ件数の制限は操作回数の無料枠を保証しないので、公開時にはアカウント全体の使用量を確認する。

## 公開・削除

公開済みサイトの変更も[公開手順](../../docs/publishing.md)で、単一Workerと必要な共通資源を準備する。ローカル識別子を実IDへ対応させ、localを使わずcf build→cf deploy。認証題材は本番設定を完成させてから実行する。

Workerの削除は全題材を停止する。題材だけの削除は、共通設定のtrigger/bindingと参照を整理してから行う。共有D1を削除すると他の題材のデータも失われる。DOのexport削除は[cf構成資料](https://developers.cloudflare.com/cf/projects/cloudflare-config/)の状態移行を読む。保存データも失われる。

## 変更課題

試行回数を表示する際のジョブIDと配信IDの扱いを考える。

## 公式資料

- [製品ドキュメント](https://developers.cloudflare.com/queues/)
- [cf構成](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
