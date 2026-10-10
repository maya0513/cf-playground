export const catalog = [
  {
    number: 1,
    slug: "01-workers",
    title: "Workers：HTTP観察",
    path: "/workers/",
  },
  {
    number: 2,
    slug: "02-assets",
    title: "Static Assets：配信の観察",
    path: "/static-assets/",
  },
  {
    number: 3,
    slug: "03-d1",
    title: "D1：ブックマーク",
    path: "/d1/",
  },
  {
    number: 4,
    slug: "04-kv",
    title: "KV：お知らせ",
    path: "/kv/",
  },
  {
    number: 5,
    slug: "05-r2",
    title: "R2：ファイル置き場",
    path: "/r2/",
  },
  {
    number: 6,
    slug: "06-cache",
    title: "Workers Cache：時刻API",
    path: "/cache/",
  },
  {
    number: 7,
    slug: "07-turnstile",
    title: "Turnstile：検証付きフォーム",
    path: "/turnstile/",
  },
  {
    number: 8,
    slug: "08-access",
    title: "Access：保護ページ",
    path: "/access/",
  },
  {
    number: 9,
    slug: "09-cron",
    title: "Cron Triggers：実行履歴",
    path: "/cron/",
  },
  {
    number: 10,
    slug: "10-queues",
    title: "Queues：テキスト集計",
    path: "/queues/",
  },
  {
    number: 11,
    slug: "11-durable-objects",
    title: "Durable Objects：共有カウンター",
    path: "/durable-objects/",
  },
  {
    number: 12,
    slug: "12-websockets",
    title: "WebSockets：部屋別チャット",
    path: "/websockets/",
  },
  {
    number: 13,
    slug: "13-workflows",
    title: "Workflows：模擬注文",
    path: "/workflows/",
  },
  {
    number: 14,
    slug: "14-rpc",
    title: "Service Bindings / RPC：内部呼び出し",
    path: "/rpc/",
  },
] as const;

export function topicForPath(pathname: string) {
  return catalog.find(
    (topic) => pathname === topic.path.slice(0, -1) || pathname.startsWith(topic.path),
  );
}
