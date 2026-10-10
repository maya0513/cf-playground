import type { ZodType } from "zod";
import { hydrate } from "preact-iso";
import type { ComponentType } from "preact";

export function mount<T extends object>(View: ComponentType<{ initial: T }>, schema: ZodType<T>) {
  const element = document.getElementById("app");
  const data = document.getElementById("initial");
  if (!element || !data?.textContent) throw new Error("SSR document is incomplete");
  const initial = schema.parse(JSON.parse(data.textContent));
  hydrate(<View initial={initial} />, element);
  element.dataset["hydrated"] = "true";
}

export async function api(path: string, method = "GET", data?: unknown) {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(value));
  return value;
}
