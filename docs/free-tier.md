# 無料枠

2026-10-10にWorkersの上限とStatic Assetsの課金条件を再確認。各製品の無料枠は下記公式資料を参照。公開直前にも再確認してください。Workers Freeを維持し、R2はStandardの無料枠を使います。ローカル実行にはアカウントや支払い方法は不要です。

| 製品                   | 無料の目安・条件                                                                    | 公式資料                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Workers / Cron / RPC   | 100,000リクエスト/日、1呼出しCPU 10ms。アカウント全体で共有                         | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)              |
| Static Assets          | 本実装はassets-first。静的アセット配信は無料、SSR/APIはWorker枠を消費               | [Billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| D1                     | 読込500万行/日、書込10万行/日、保存5GB合計                                          | [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)                        |
| KV                     | 読込10万/日、書込・削除・list各1,000/日、保存1GB                                    | [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/)                        |
| R2 Standard            | 月10GB-month、Class A 100万、Class B 1,000万。利用開始時の支払い設定は別途必要      | [R2 pricing](https://developers.cloudflare.com/r2/pricing/)                                 |
| Workers Cache          | 別料金なし。HITや静的配信もWorkersリクエスト枠を使う                                | [Cache pricing](https://developers.cloudflare.com/workers/cache/#pricing)                   |
| Turnstile              | Freeで試す。ローカルは公式テストキー                                                | [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/)                       |
| Access                 | Zero Trust Freeは50ユーザーまで。local fixtureは本物のAccess認証を使用しない        | [Zero Trust plans](https://www.cloudflare.com/plans/zero-trust-services/)                   |
| Queues                 | 10,000 operations/日、保持24時間。通常1配信に書込・読込・削除の3操作。再試行も消費  | [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/)                |
| SQLite DO / WebSockets | FreeではSQLiteのみ。10万リクエスト/日、13,000GB-s/日。SQLの読書き・保存にも枠がある | [DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)           |
| Workflows              | 3,000 steps/日、保存1GB-month。リクエスト枠はWorkersと共有                          | [Workflows pricing](https://developers.cloudflare.com/workflows/reference/pricing/)         |

実装上の上限：ブックマーク100件、JSON body 4KiB、R2 10スロット×256KiB、チャット3部屋×履歴20件×500文字（各20接続）、ジョブ・注文履歴100件。Turnstileメッセージ/Queueテキストは3,000bytes、URLは2,048bytes、タイトルは200bytesです。

件数・容量の上限と、アカウントの無料操作数は別です。共有公開デモを使うときはDashboardの使用量も確認します。R2の無料枠はInfrequent Accessには適用されません。

Workerの配置はcf-playgroundの1件のみ。FreeのWorker bundle上限はgzip後3MiB。[Workers limits](https://developers.cloudflare.com/workers/platform/limits/)を参照。ビルドで確認したサイズは[検証記録](verification.md)へ記録する。Worker数を減らしても日次リクエスト枠・CPU・各bindingの無料枠は引き続き消費する。
