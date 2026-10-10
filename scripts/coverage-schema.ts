import { z } from "zod";
const location = z.object({
  line: z.number().default(0),
  column: z
    .number()
    .nullish()
    .transform((value) => value ?? Infinity),
});
const range = z.object({ start: location, end: location });
const file = z.object({
  path: z.string(),
  statementMap: z.record(z.string(), range),
  fnMap: z.record(
    z.string(),
    z
      .object({ name: z.string(), decl: range, loc: range, line: z.number().optional() })
      .transform((value) => ({ ...value, line: value.line ?? value.loc.start.line })),
  ),
  branchMap: z.record(
    z.string(),
    z
      .object({
        loc: range,
        type: z.string(),
        locations: z.array(range),
        line: z.number().optional(),
      })
      .transform((value) => ({ ...value, line: value.line ?? value.loc.start.line })),
  ),
  s: z.record(z.string(), z.number()),
  f: z.record(z.string(), z.number()),
  b: z.record(z.string(), z.array(z.number())),
});
export const coverageSchema = z.record(z.string(), file);
