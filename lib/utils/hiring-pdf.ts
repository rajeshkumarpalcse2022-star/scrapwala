import PDFDocument from "pdfkit";

/**
 * Server-side generator for the "ScrapWala — Job Application Summary" PDF.
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
  /** Optional embedded photo (skipped gracefully when fetch fails). */
  photo?: { bytes: Buffer; kind: "jpg" | "png" } | null;
}

const PAGE_MARGIN = 50;

function drawHeader(doc: PDFKit.PDFDocument, input: ApplicationPdfInput): number {
  let y = PAGE_MARGIN;

  doc.rect(0, 0, doc.page.width, 86).fill(PRIMARY);

  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(20);
  doc.text("ScrapWala", PAGE_MARGIN, 28, { lineBreak: false });

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
          Title: `ScrapWala — Job Application Summary (${input.applicationId})`,
          Author: "ScrapWala",
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

      /* ── Photo (optional) ── */
      if (input.photo) {
        y = sectionTitle(doc, y, "APPLICANT PHOTO");
        try {
          doc.image(input.photo.bytes, PAGE_MARGIN, y, {
            fit: [110, 130],
          });
          y += 140;
        } catch {
          doc.fillColor(MUTED).font("Helvetica").fontSize(10);
          doc.text("Photo could not be embedded in this summary.", PAGE_MARGIN, y);
          y += 18;
        }
      }

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
      if (input.documents.length > 0) {
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = PAGE_MARGIN;
        }
        y = sectionTitle(doc, y, "SUBMITTED DOCUMENTS");
        for (const document of input.documents) {
          doc.fillColor(DARK).font("Helvetica-Bold").fontSize(10);
          doc.text(`${document.label}:`, PAGE_MARGIN, y, { lineBreak: false });
          doc.fillColor(DARK).font("Helvetica").fontSize(10);
          doc.text(document.fileName, PAGE_MARGIN + 150, y, {
            width: contentWidth - 150,
            lineBreak: false,
          });
          y += 16;
          if (document.note) {
            doc.fillColor(MUTED).font("Helvetica-Oblique").fontSize(8.5);
            doc.text(document.note, PAGE_MARGIN + 150, y, {
              width: contentWidth - 150,
            });
            y += 14;
          }
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
      doc.text("© ScrapWala — scrapwala.example", PAGE_MARGIN, y, {
        width: contentWidth,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
