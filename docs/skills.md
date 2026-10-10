# 公式skill

`.agents/skills`へプロジェクトローカルに導入。グローバル設定は変更していない。

| skill                  | 用途                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------- |
| cloudflare             | 製品選択、最新cfドキュメント、無料枠                                                  |
| workers-best-practices | request state、binding、I/O、型、ログ                                                 |
| durable-objects        | SQLite、RPC、Hibernation、公式ランタイムテスト                                        |
| turnstile-spin         | Siteverify、hostname/action、失敗処理。今回リモート作成wizardは実施しない             |
| cloudflare-one         | JWT検証、実Accessとローカルfixtureの区別、後続Zero Trust                              |
| web-perf               | 静的ファイル、転送量、初期表示とレイアウト。実測していないCore Web Vitalsを報告しない |

[Cloudflare公式skills](https://github.com/cloudflare/skills/tree/main/skills)から取得。専用のcf skillは見つからず、cloudflare skillのcf向けルーティングと[cf agents](https://developers.cloudflare.com/cf/agents/)を使っている。cfの使用指示をWrangler向けの例より優先する。
