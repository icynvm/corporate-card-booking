/**
 * Truncates text with ellipsis if it exceeds max length.
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};
