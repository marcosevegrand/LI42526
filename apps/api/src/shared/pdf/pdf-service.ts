import PDFDocument from 'pdfkit';

export function createInvoicePreviewPdf(title: string) {
  const document = new PDFDocument();
  const buffers: Buffer[] = [];

  document.on('data', (chunk: Buffer) => buffers.push(Buffer.from(chunk)));
  document.text(title);
  document.end();

  return new Promise<Buffer>((resolve) => {
    document.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
