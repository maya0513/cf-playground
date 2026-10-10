# RPCの名前付き入口

[14-rpc](../14-rpc/README.md)から、同じWorker内のInternal入口を呼び出す。独立Workerの起動・デプロイはしない。設定とexportは`apps/00-home`へ集約する。

`src/index.ts`のWorkerEntrypoint、greet、fetchを比較する。INTERNAL Service Bindingのworker名は公開Worker自身の`cf-playground`。HTTPと型付きRPCを公開インターネットを経由せず試せる。Workerを分離する場合の境界設計は発展課題とする。
