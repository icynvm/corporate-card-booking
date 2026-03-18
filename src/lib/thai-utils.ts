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
 * Inserts zero-width spaces between Thai words to enable accurate word-wrapping in pdfmake and other rigid layouts.
 */
export const wrapThaiText = (text: string = "") => {
    if (!text) return "";
    
    // Normalize first
    const normalized = normalizeThai(text);

    // If no Intl.Segmenter available (older environments), return as is
    if (typeof Intl === 'undefined' || !Intl.Segmenter) return normalized;

    try {
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
        const segments = segmenter.segment(normalized);
        let wrapped = '';
        
        for (const segment of segments) {
            wrapped += segment.segment;
            // Add zero-width space after the word ends if it's a Thai sequence
            // but don't add if it's whitespace to avoid double spacing issues
            if (segment.isWordLike && !/\s/.test(segment.segment)) {
                wrapped += '\u200B';
            }
        }
        return wrapped;
    } catch (e) {
        return normalized;
    }
};
