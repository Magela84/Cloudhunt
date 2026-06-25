// pdf-parse's main index.js runs debug code at import time; we import the lib
// entry directly. @types/pdf-parse only declares the package root, so declare
// the subpath here.
declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  }
  function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>,
  ): Promise<PDFParseResult>;
  export default pdfParse;
}
