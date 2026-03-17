import pdfMake from "pdfmake/build/pdfmake";
import { SARABUN_REGULAR_BASE64, SARABUN_BOLD_BASE64 } from "./fonts-base64";

// Configure virtual file system for pdfmake
if (typeof pdfMake !== "undefined") {
    pdfMake.vfs = pdfMake.vfs || {};
    pdfMake.vfs["Sarabun-Regular.ttf"] = SARABUN_REGULAR_BASE64;
    pdfMake.vfs["Sarabun-Bold.ttf"] = SARABUN_BOLD_BASE64;

    // Define font mappings
    pdfMake.fonts = {
        Sarabun: {
            normal: "Sarabun-Regular.ttf",
            bold: "Sarabun-Bold.ttf"
        }
    };
}

export default pdfMake;
