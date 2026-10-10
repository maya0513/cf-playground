import { z } from "zod";
export const numericId = z.object({ id: z.number() });
export const stringId = z.object({ id: z.string() });
