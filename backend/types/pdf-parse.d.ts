declare module 'pdf-parse' {
    interface PDFData {
        numpages: number;
        numrender: number;
        info: any;
        metadata: any;
        text: string;
        version: string;
    }

    interface PDFOptions {
        normalizeWhitespace?: boolean;
        disableCombineTextItems?: boolean;
        max?: number;
    }

    function pdfParse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
    export = pdfParse;
}