import PDFDocument from "pdfkit";

/**
 * Server-side generator for the "Scrapi — Job Application Summary" PDF.
 *
 * Built with pdfkit's standard Helvetica fonts (no external font files), so
 * it works in the Next.js server runtime. Output is collected into a Buffer
 * for direct delivery from an API route.
 */

const PRIMARY = "#1b7a3d";
const DARK = "#1a2e1a";
const MUTED = "#6b7b6b";
const BORDER = "#dde5dd";

export interface PdfAnswer {
  label: string;
  value: string;
}

export interface PdfDocumentRef {
  label: string;
  fileName: string;
  note?: string;
  /** When set, the entry renders as a clickable "view/download" link. */
  url?: string;
}

export interface PdfEmbeddedImage {
  label: string;
  bytes: Buffer;
  kind: "jpg" | "png";
}

export interface ApplicationPdfInput {
  applicationId: string;
  jobTitle: string;
  submittedAtLabel: string;
  statusLabel: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  answers: PdfAnswer[];
  documents: PdfDocumentRef[];
  /** Embedded image uploads (photo, signature); fetch failures are skipped. */
  images: PdfEmbeddedImage[];
}

const PAGE_MARGIN = 50;

function drawHeader(doc: PDFKit.PDFDocument, input: ApplicationPdfInput): number {
  let y = PAGE_MARGIN;

  doc.rect(0, 0, doc.page.width, 86).fill(PRIMARY);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20);
  doc.text("Scrapi", PAGE_MARGIN, 28, { lineBreak: false });

  doc.font("Helvetica").fontSize(10);
  doc.text("Doorstep Scrap Pickup & Recycling", PAGE_MARGIN, 54, {
    lineBreak: false,
  });

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Job Application Summary", PAGE_MARGIN, 70, { lineBreak: false });

  y = 110;

  doc.fillColor(DARK).font("Helvetica-Bold").fontSize(15);
  doc.text(input.jobTitle, PAGE_MARGIN, y, { width: doc.page.width - PAGE_MARGIN * 2 });
  y += 26;

  doc.strokeColor(BORDER).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).stroke();
  y += 14;

  return y;
}

function drawMetaRows(doc: PDFKit.PDFDocument, yStart: number, rows: [string, string][]): number {
  let y = yStart;
  for (const [label, value] of rows) {
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(9);
    doc.text(label.toUpperCase(), PAGE_MARGIN, y, { lineBreak: false });
    doc.fillColor(DARK).font("Helvetica").fontSize(10.5);
    doc.text(value, PAGE_MARGIN + 130, y, {
      width: doc.page.width - PAGE_MARGIN * 2 - 130,
    });
    y += 20;
  }
  return y;
}

function sectionTitle(doc: PDFKit.PDFDocument, yStart: number, title: string): number {
  let y = yStart + 6;
  doc.fillColor(PRIMARY).font("Helvetica-Bold").fontSize(11);
  doc.text(title, PAGE_MARGIN, y, { lineBreak: false });
  y += 18;
  doc.strokeColor(BORDER).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).stroke();
  return y + 12;
}

export function buildApplicationSummaryPdf(input: ApplicationPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: PAGE_MARGIN,
        info: {
          Title: `Scrapi — Job Application Summary (${input.applicationId})`,
          Author: "Scrapi",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let y = drawHeader(doc, input);
      const contentWidth = doc.page.width - PAGE_MARGIN * 2;

      /* ── Application meta ── */
      y = drawMetaRows(doc, y, [
        ["Application ID", input.applicationId],
        ["Submitted On", input.submittedAtLabel],
        ["Status", input.statusLabel],
        ["Applicant", input.applicantName],
        ...(input.applicantEmail ? ([
          ["Email", input.applicantEmail],
        ] as [string, string][]) : []),
        ...(input.applicantPhone ? ([
          ["Contact", input.applicantPhone],
        ] as [string, string][]) : []),
      ]);

      /* ── Answers ── */
      y = sectionTitle(doc, y, "APPLICATION DETAILS");
      for (const answer of input.answers) {
        if (y > doc.page.height - 90) {
          doc.addPage();
          y = PAGE_MARGIN;
        }

        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
        doc.text(answer.label, PAGE_MARGIN, y, { width: contentWidth });
        y += 15;

        const value = answer.value && answer.value.trim() !== "" ? answer.value : "—";
        doc.fillColor(DARK).font("Helvetica").fontSize(10);
        doc.text(value, PAGE_MARGIN, y, { width: contentWidth });
        y += doc.heightOfString(value, { width: contentWidth }) + 10;
      }

      /* ── Documents ── */
      if (input.documents.length > 0 || input.images.length > 0) {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        y = sectionTitle(doc, y, "SUBMITTED DOCUMENTS");
      }

      /* Embedded images (photo, signature) — rendered inline */
      if (input.images.length > 0) {
        const imgWidth = 90;
        const imgHeight = 110;
        const gap = 14;
        let col = 0;
        let rowTop = y;
        for (const image of input.images) {
          const x = PAGE_MARGIN + col * (imgWidth + gap);
          doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
          doc.text(image.label, x, y, { width: imgWidth, lineBreak: false });
          const labelY = y;
          try {
            doc.image(image.bytes, x, labelY + 16, { fit: [imgWidth, imgHeight] });
          } catch {
            doc.fillColor(MUTED).font("Helvetica").fontSize(8.5);
            doc.text("(preview unavailable)", x, labelY + 16, { width: imgWidth });
          }
          col += 1;
          if (col === 3) {
            col = 0;
            rowTop += imgHeight + 16 + gap;
            y = rowTop;
          }
        }
        if (col !== 0) {
          y = rowTop + imgHeight + 16 + gap;
        }
      }

      /* Non-embedded documents — clickable view/download links */
      for (const document of input.documents) {
        if (y > doc.page.height - 60) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
        doc.text(`${document.label}:`, PAGE_MARGIN, y, { lineBreak: false });
        doc.fillColor(DARK).font("Helvetica").fontSize(10);
        doc.text(document.fileName, PAGE_MARGIN + 150, y, {
          width: contentWidth - 150,
          lineBreak: false,
        });
        y += 16;
        if (document.url) {
          doc.fillColor("#0b57d0").font("Helvetica").fontSize(9);
          doc.text("Click to view or download →", PAGE_MARGIN + 150, y, {
            width: contentWidth - 150,
            lineBreak: false,
            link: document.url,
            underline: true,
          });
          y += 14;
        }
        if (document.note) {
          doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8.5);
          doc.text(document.note, PAGE_MARGIN + 150, y, {
            width: contentWidth - 150,
          });
          y += 14;
        }
      }

      /* ── Footer ── */
      if (y > doc.page.height - 70) {
        doc.addPage();
        y = PAGE_MARGIN;
      }
      y += 10;
      doc.strokeColor(BORDER).lineWidth(1).moveTo(PAGE_MARGIN, y).lineTo(doc.page.width - PAGE_MARGIN, y).stroke();
      y += 12;
      doc.fillColor(MUTED).font("Helvetica").fontSize(9);
      doc.text(
        "This summary reflects the application as submitted. Keep it for your records.",
        PAGE_MARGIN,
        y,
        { width: contentWidth }
      );
      y += 16;
      doc.text("© Scrapi — scrapi.in", PAGE_MARGIN, y, {
        width: contentWidth,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
