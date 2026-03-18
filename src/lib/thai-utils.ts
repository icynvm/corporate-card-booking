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
