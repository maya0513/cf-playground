# Cron Triggers：実行履歴

## 目的

scheduledイベントとHTTPの入口を分ける。

## 読む順番

1. `apps/00-home/cloudflare.config.ts`：全題材のbinding、trigger、export。
2. `src/index.tsx`：APIとbinding操作。
3. `src/view.tsx`：画面ごとのSignalsと更新操作。
4. `src/client.tsx` → `packages/ui/client.tsx`：SSRと同じ初期値でhydrate。
5. `tests/workers/`：成功、不正入力、上限、保存失敗の検証。

## 処理と設計理由

毎時0分。event.scheduledTimeを記録。同じrun関数をHTTPからも利用。KVの履歴は100件。KVのread-modify-writeは並行実行の厳密集計には向かない。

共通SSRは`packages/ui/server.tsx`。初期値をHTMLとJSONへ埋め込み、JSONの`<`をエスケープする。クライアントは同じ値でhydrateし、初回の再fetchをしない。Signalsは各画面インスタンス内で作る。更新は同一オリジンAPI、エラーは`{error:{code,message}}`。

## 起動・確認・初期化

ルートで実行する。

```sh
just setup
just dev
```

ホーム`http://localhost:4100/` → 題材`http://localhost:4100/cron/`。

手動実行と履歴更新を確認する。scheduledイベントは別ターミナルから公式ローカルランタイムの内部ポートへ発火する（ブラウザ用URLとは別）。

```sh
curl "http://127.0.0.1:4100/cdn-cgi/local/scheduled?cron=0%20*%20*%20*%20*"
```

ブラウザは`http://localhost:4100/cron/`のまま、履歴更新でscheduledの記録を確認する。

停止後に`just reset`。単一Workerの`apps/00-home/.cloudflare/state`を削除し、全題材のローカルデータを初期化する。本番資源には触れない。

## 無料枠・ローカルとの差

[無料枠一覧](../../docs/free-tier.md)を参照。ローカルは分散拠点、課金、本番のレイテンシを再現しない。データ件数の制限は操作回数の無料枠を保証しないので、公開時にはアカウント全体の使用量を確認する。

KVの更新伝播はローカルでの即時読取から判断しない。

## 将来の公開・削除

今回公開していない。[公開手順](../../docs/publishing.md)で、単一Workerと必要な共通資源を準備する。ローカル識別子を実IDへ対応させ、localを使わずcf build→cf deploy。認証題材は本番設定を完成させてから実行する。

Workerの削除は全題材を停止する。題材だけの削除は、共通設定のtrigger/bindingと参照を整理してから行う。共有D1を削除すると他の題材のデータも失われる。DOのexport削除は[cf構成資料](https://developers.cloudflare.com/cf/projects/cloudflare-config/)の状態移行を読む。保存データも失われる。

## 変更課題

履歴をDOに移す場合の整合性の違いを考える。

## 公式資料

- [製品ドキュメント](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
- [cf構成](https://developers.cloudflare.com/cf/projects/cloudflare-config/)
