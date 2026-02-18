import { format, parseISO } from "date-fns";

export function normalizeDateString(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  
  if (typeof dateValue === 'string') {
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    try {
      return format(parseISO(dateValue), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }
  
  if (dateValue instanceof Date) {
    return format(dateValue, 'yyyy-MM-dd');
  }
  
  try {
    return format(parseISO(String(dateValue)), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function parseDateSafe(dateValue: string | Date | null | undefined): Date {
  if (!dateValue) return new Date();
  
  const normalized = normalizeDateString(dateValue);
  if (!normalized) return new Date();
  
  try {
    return parseISO(normalized);
  } catch {
    return new Date();
  }
}
