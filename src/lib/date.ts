import { format, parseISO } from "date-fns";
import { id } from "date-fns/locale/id";

export function formatDate(date: string | Date, fmt = "dd MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}

export function formatDateTime(
  date: string | Date,
  fmt = "dd MMM yyyy HH:mm"
): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: id });
}
