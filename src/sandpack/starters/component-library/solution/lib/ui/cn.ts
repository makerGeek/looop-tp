type Cls = string | false | null | undefined;
export const cn = (...parts: Cls[]): string =>
  parts.filter(Boolean).join(" ");
