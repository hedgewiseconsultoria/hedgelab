import { createHash } from "node:crypto";

export function dataframeToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const fields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [fields.join(","), ...rows.map(row => fields.map(field => escape(row[field])).join(","))].join("\n");
}

export function sha256Text(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}
