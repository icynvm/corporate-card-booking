/**
 * Comprehensive Thai Text Normalization & Processing
 * 
 * This module provides unified utilities to handle Thai character encoding, 
 * cluster reordering, and word segmentation. It is critical for preventing 
 * "mojibake" (corrupted characters) and ensuring professional PDF rendering.
 */

/**
 * Normalizes Thai text by fixing common character sequence errors 
 * and applying canonical decomposition/composition (NFC).
 */
export const normalizeThai = (text: string = ""): string => {
  if (!text) return "";
  
  return text
    .normalize("NFC")
    // 1. Reorder Tone Marks (0E48-0E4C) and Vowels Above/Below (0E31-0E3A, 0E34-0E39)
    // The correct sequence is Consonant + Vowel + Tone.
    .replace(/([\u0E48-\u0E4C]+)([\u0E31-\u0E3A\u0E34-\u0E39]+)/g, "$2$1")
    
    // 2. Reorder SARA AA (0E32) and Tone Marks
    // Correct: Consonant + Tone + SARA AA
    .replace(/า([\u0E48-\u0E4C])/g, "$1า")
    .replace(/([ก-ฮ])า([่-๋])/g, "$1$2า")

    // 3. Fix SARA AM (0E33) corruption (often happens with double SARA AA)
    .replace(/\u0E33\u0E32/g, "\u0E33")
    
    // 4. Fix common broken leading vowel patterns (e.g., SARA E + Tone + Consonant)
    .replace(/เ([่-๋])([ก-ฮ])/g, "เ$2$1")
    
    // 5. Clean up any accidental double spaces or control characters often found in copy-pasted Thai
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "");
};

/**
 * Inserts Zero-Width Spaces (ZWSP) at Thai word boundaries
 * using the browser-native Intl.Segmenter API. 
 * Essential for correct word wrapping in PDF generators (like pdfmake).
 */
export const insertZeroWidthSpaces = (text: string = ""): string => {
  if (!text) return "";
  
  // Attempt high-quality segmentation via native Intl API
  if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
    try {
      const segmenter = new (Intl as any).Segmenter("th", { granularity: "word" });
      const segments = Array.from(segmenter.segment(text)) as any[];
      return segments.map(s => s.segment).join("\u200B");
    } catch (err) {
      console.error("Intl.Segmenter failed, falling back to regex cluster-break", err);
    }
  }
  
  // Safe fallback regex: break strictly after complete Thai clusters
  // [ก-ฮ] base consonant + [\u0E30-\u0E4E]* zero or more stacking vowels / tone marks
  return text.replace(/([ก-ฮ][\u0E30-\u0E4E]*)/g, "$1\u200B");
};
