import jsPDF from "jspdf";
import { ConceptChatMessage, MasterDomain, EducationLevel } from "../types";

export function exportChatToPdf(
  messages: ConceptChatMessage[],
  domain: MasterDomain,
  level: EducationLevel
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader();
    }
  }

  function drawHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("PHY64ALL — Master Physics Concept Explorer", margin, y);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 15, y);
    y += 5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Cover / Header Banner
  doc.setFillColor(30, 58, 138); // blue-900
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PHY64ALL: Physics Concept Transcript", margin + 6, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Domain: ${domain}  |  Level: ${level.toUpperCase()}  |  Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    margin + 6,
    y + 19
  );

  y += 32;

  // Render Messages
  messages.forEach((msg, idx) => {
    checkPageBreak(25);

    if (msg.role === "user") {
      // User bubble
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text("Student Query:", margin + 4, y + 5);

      doc.setFont("helvetica", "normal");
      const userLines = doc.splitTextToSize(msg.text, contentWidth - 8);
      doc.text(userLines, margin + 4, y + 9);

      y += 16 + (userLines.length - 1) * 4;
    } else {
      // Assistant Tutor Response
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235); // blue-600
      const domainLabel = msg.domain ? `PHY64ALL Tutor [${msg.domain}]` : "PHY64ALL Tutor";
      doc.text(domainLabel, margin, y);
      y += 5;

      if (msg.isCrossDomain && msg.domainNote) {
        checkPageBreak(10);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9); // amber-700
        const noteLines = doc.splitTextToSize(msg.domainNote, contentWidth);
        doc.text(noteLines, margin, y);
        y += noteLines.length * 4 + 2;
      }

      // Main Text Body
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const bodyLines = doc.splitTextToSize(msg.text, contentWidth);
      bodyLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 2;

      // Structured data if present
      if (msg.structuredData) {
        const sd = msg.structuredData;

        // Key Equations
        if (sd.keyEquations && sd.keyEquations.length > 0) {
          checkPageBreak(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text("Key Mathematical Formulas:", margin, y);
          y += 4.5;

          sd.keyEquations.forEach((eq) => {
            checkPageBreak(10);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, y - 3, contentWidth, 8, "FD");

            doc.setFont("courier", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(37, 99, 235);
            doc.text(eq.latex, margin + 4, y + 2);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(71, 85, 105);
            doc.text(`— ${eq.meaning}`, margin + 50, y + 2);
            y += 9;
          });
        }

        // Everyday Analogy
        if (sd.everydayAnalogy) {
          checkPageBreak(12);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(13, 148, 136); // teal-600
          doc.text("Physical Intuition & Everyday Analogy:", margin, y);
          y += 4;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          const analogyLines = doc.splitTextToSize(sd.everydayAnalogy, contentWidth);
          analogyLines.forEach((l: string) => {
            checkPageBreak(5);
            doc.text(l, margin, y);
            y += 4;
          });
          y += 2;
        }
      }

      // Divider between assistant responses
      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
      y += 6;
    }
  });

  // Save PDF
  const filename = `PHY64ALL_${domain.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
