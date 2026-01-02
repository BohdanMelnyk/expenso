/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * (NOT UTC, which toISOString uses)
 *
 * This prevents timezone shift issues where dates in local time
 * get converted to UTC before string extraction, potentially shifting
 * the date backward by a day.
 */
export const formatDateLocal = (date: Date): string => {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
};
