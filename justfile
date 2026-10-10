vp := "mise exec -- pnpm exec vp run"

# コマンド一覧を表示する
[default]
help:
    @just --list

# 依存をインストールし、全題材のローカルデータを準備する
setup:
    mise exec -- pnpm install --frozen-lockfile
    {{ vp }} setup:local

# ホームと全14題材を起動する（停止はCtrl+C）
dev:
    {{ vp }} dev

# サーバー停止後、全題材のローカルデータを削除して作り直す
reset:
    {{ vp }} reset:local

# CIと同じ全チェックを実行する
check:
    {{ vp }} ci:check

# 全Workerをローカルでビルドする
build:
    {{ vp }} build
