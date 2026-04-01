/**
 * Clean Thai text combining mark order and typos.
 * Swaps tone marks and above/below vowels if they are in the wrong sequence 
 * for canonical normalization, which helps with PDF rendering (mojibake prevention).
 */
export const normalizeThaiText = (text: string = ""): string => {
  if (!text) return "";
  
  return text
    .normalize("NFC")
    // Reorder Tone Mark (0E48-0E4C) before Vowel Above/Below (0E31-0E3A) -> should be Vowel then Tone
    .replace(/([\u0E48-\u0E4C])([\u0E31-\u0E3A])/g, "$2$1")
    // Reorder SARA AA (0E32) after Tone Mark
    .replace(/า([\u0E48-\u0E4C])/g, "$1า")
    // Fix double SARA AA resulting from SARA AM (0E33) + SARA AA
    .replace(/\u0E33\u0E32/g, "\u0E33");
};

/**
 * Truncates text with ellipsis if it exceeds max length.
 */
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};
