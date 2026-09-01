// SPDX-License-Identifier: MIT

export function readBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

export function isAuthorized(authorization: string | undefined, expectedToken: string): boolean {
  const received = readBearerToken(authorization);
  if (received === null || received.length !== expectedToken.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expectedToken.charCodeAt(index);
  }
  return difference === 0;
}

export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export type Page<T> = Readonly<{
  data: readonly T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

export function paginate<T>(items: readonly T[], page: number, pageSize: number): Page<T> {
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;
  const offset = (safePage - 1) * safePageSize;
  return {
    data: items.slice(offset, offset + safePageSize),
    page: safePage,
    pageSize: safePageSize,
    total: items.length,
    totalPages: Math.ceil(items.length / safePageSize),
  };
}
