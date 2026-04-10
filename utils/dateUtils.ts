/**
 * Returns YYYY-MM-DD string in LOCAL time.
 * This avoids UTC day-shifting issues found in .toISOString()
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date string in LOCAL YYYY-MM-DD format.
 */
export const getTodayLocal = (): string => {
  return formatLocalDate(new Date());
};
