export const normalizeThai = (text: string = "") => {
    if (!text) return "";
    return text
        .normalize("NFC")
        // reorder tone + vowel
        .replace(/([\u0E48-\u0E4C]+)([\u0E31-\u0E3A\u0E34-\u0E39]+)/g, "$2$1")
        
        // reorder Consonant + า + Tone to Consonant + Tone + า
        .replace(/([ก-ฮ])า([่-๋])/g, "$1$2า")

        // fix นำา → นำ
        .replace(/\u0E33\u0E32/g, "\u0E33")
        
        // fix common broken patterns
        .replace(/เ([่-๋])([ก-ฮ])/g, "เ$2$1");
};

/**
 * Inserts Zero-Width Spaces (ZWSP) at Thai word boundaries
 * using the browser-native Intl.Segmenter API, preventing
 * broken/detached marks while supporting word wrapping in `pdfmake`.
 */
export const insertZeroWidthSpaces = (text: string = ""): string => {
    if (!text) return "";
    
    // Check if browser supports Intl.Segmenter
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
        try {
            const segmenter = new (Intl as any).Segmenter("th", { granularity: "word" });
            const segments = Array.from(segmenter.segment(text)) as any[];
            return segments.map(s => s.segment).join("\u200B");
        } catch (err) {
            console.error("Intl.Segmenter failed:", err);
        }
    }
    
    // Safe fallback regex that breaks strictly after complete Thai cluster elements
    // [ก-ฮ] base consonant + [\u0E30-\u0E4E]* zero or more stacking vowels / tone marks
    return text.replace(/([ก-ฮ][\u0E30-\u0E4E]*)/g, "$1\u200B");
};
