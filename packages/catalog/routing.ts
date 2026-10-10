import { topicForPath } from "./index.ts";

export function canonicalTopicUrl(requestUrl: string) {
  const url = new URL(requestUrl);
  const topic = topicForPath(url.pathname);
  if (!topic || url.pathname !== topic.path.slice(0, -1)) return undefined;
  url.pathname = topic.path;
  return url.href;
}
