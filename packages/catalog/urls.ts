import { catalog } from "./index.ts";
export function topicUrl(number: number, path: string) {
  const topic = catalog.find((item) => item.number === number);
  if (!topic) throw new Error("題材番号は1〜14です。");
  return topic.path + path.replace(/^\//, "");
}

export function topicRequestPath(number: number) {
  const base = topicUrl(number, "");
  return (request: Request) => {
    const path = new URL(request.url).pathname;
    return path.startsWith(base) ? "/" + path.slice(base.length) : path;
  };
}
