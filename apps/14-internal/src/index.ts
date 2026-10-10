import { WorkerEntrypoint } from "cloudflare:workers";
export class Internal extends WorkerEntrypoint {
  greet(name: string) {
    return { message: `こんにちは、${name}さん。`, service: "internal" };
  }
  override async fetch(request: Request) {
    return Response.json(this.greet(new URL(request.url).searchParams.get("name") ?? "学習者"));
  }
}

export default {};
