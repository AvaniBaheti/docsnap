import { NextRequest } from 'next/server';
import { jsPDF } from 'jspdf';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { responseData } = await req.json();
    if (!responseData || !responseData.items || responseData.items.length === 0) {
      throw new Error('No items found in responseData');
    }

    const doc = new jsPDF();

    const colors: {
      primary: [number, number, number],
      success: [number, number, number],
      warning: [number, number, number],
      danger: [number, number, number],
      dark: [number, number, number],
      light: [number, number, number],
      background: [number, number, number],
      lightGreen: [number, number, number],
      lightGray: [number, number, number],
    } = {
      primary: [41, 128, 185],
      success: [39, 174, 96],
      warning: [243, 156, 18],
      danger: [231, 76, 60],
      dark: [52, 73, 94],
      light: [149, 165, 166],
      background: [236, 240, 241],
      lightGreen: [240, 255, 240],
      lightGray: [248, 249, 250]
    };

    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const footerHeight = 15;
    const maxContentHeight = 270;

    let yPosition = 20;

    const wrapText = (text: string, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines;
    };

    const drawSection = (x: number, y: number, width: number, height: number, fillColor: [number, number, number]) => {
      doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      doc.rect(x, y, width, height, 'F');
    };

    const addNewPageIfNeeded = (requiredSpace: number) => {
      if (yPosition + requiredSpace > maxContentHeight) {
        doc.addPage();
        yPosition = 20;
      }
    };

    const addTextWithPageBreak = (lines: string[], startY: number, lineHeight: number, leftMargin: number) => {
      let currentY = startY;
      
      lines.forEach((line: string) => {
        if (currentY + lineHeight > maxContentHeight) {
          doc.addPage();
          currentY = 20;
        }
        doc.text(line, leftMargin, currentY);
        currentY += lineHeight;
      });
      
      return currentY;
    };

    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('>> API Documentation <<', margin, 25);

    yPosition = 50;

    responseData.items.forEach((item: any, index: number) => {
      addNewPageIfNeeded(35);
      drawSection(margin - 5, yPosition - 8, contentWidth + 10, 16, colors.background);
      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`[${index + 1}] Request: ${item.name || 'Unnamed Request'}`, margin, yPosition);
      yPosition += 25;

      addNewPageIfNeeded(25);

      const methodColor = item.method === 'GET' ? colors.success :
                         item.method === 'POST' ? colors.primary :
                         item.method === 'PUT' ? colors.warning : colors.danger;

      doc.setFillColor(methodColor[0], methodColor[1], methodColor[2]);
      doc.rect(margin, yPosition - 5, 32, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.method, margin + 3, yPosition);

      doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const urlText = `URL: ${item.url}`;
      const urlLines = wrapText(urlText, contentWidth - 40, 10);

      urlLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, margin + 38, yPosition + (lineIndex * 4));
      });
      yPosition += Math.max(15, urlLines.length * 4) + 10;

      if (item.headers && item.headers.length > 0) {
        addNewPageIfNeeded(30);

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Headers:', margin, yPosition);
        yPosition += 12;

        let headersHeight = 15;
        item.headers.forEach((header: { key: any; value: any; }) => {
          const keyLines = wrapText(header.key, 45, 9);
          const valueLines = wrapText(header.value, contentWidth - 55, 9);
          headersHeight += Math.max(keyLines.length, valueLines.length) * 4 + 5;
        });

        addNewPageIfNeeded(headersHeight);

        drawSection(margin, yPosition - 5, contentWidth, headersHeight, [252, 252, 252]);

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Header Name', margin + 5, yPosition + 5);
        doc.text('Value', margin + 55, yPosition + 5);
        yPosition += 12;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        item.headers.forEach((header: { key: any; value: any; }) => {
          const keyLines = wrapText(header.key, 45, 9);
          const valueLines = wrapText(header.value, contentWidth - 55, 9);
          const maxLines = Math.max(keyLines.length, valueLines.length);

          // Check if we need a new page for this header
          if (yPosition + (maxLines * 4 + 5) > maxContentHeight) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          keyLines.forEach((keyLine: string, keyIndex: number) => {
            doc.text(keyLine, margin + 5, yPosition + (keyIndex * 4));
          });

          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
          valueLines.forEach((valueLine: string, valueIndex: number) => {
            doc.text(valueLine, margin + 55, yPosition + (valueIndex * 4));
          });

          yPosition += maxLines * 4 + 5;
        });
        yPosition += 10;
      }

      if (item.body && item.body.raw) {
        addNewPageIfNeeded(30);

        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Request Body:', margin, yPosition);
        yPosition += 12;

        const rawBody = item.body.raw.replace(/\\n/g, '\n');
        const bodyLines = wrapText(rawBody, contentWidth - 20, 10);

        doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
        doc.setFont('courier', 'normal');
        doc.setFontSize(10);

        // Process body lines with automatic page breaks
        let currentBodyY = yPosition;
        bodyLines.forEach((line: string) => {
          if (currentBodyY + 5 > maxContentHeight) {
            doc.addPage();
            currentBodyY = 20;
          }
          doc.text(line, margin + 8, currentBodyY);
          currentBodyY += 5;
        });
        yPosition = currentBodyY + 10;
      }

      if (item.response && item.response.length > 0) {
        addNewPageIfNeeded(40);

        drawSection(margin - 5, yPosition - 8, contentWidth + 10, 16, colors.success);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Response Details', margin, yPosition);
        yPosition += 25;

        const firstResponse = item.response[0];
        if (firstResponse) {
          addNewPageIfNeeded(30);

          const statusColor = firstResponse.code < 300 ? colors.success :
                             firstResponse.code < 400 ? colors.warning : colors.danger;

          doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.rect(margin, yPosition - 5, 35, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`${firstResponse.code}`, margin + 3, yPosition);

          doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Status: ${firstResponse.status}`, margin + 40, yPosition);
          yPosition += 20;

          if (firstResponse.body) {
            doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Response Body:', margin, yPosition);
            yPosition += 12;

            const responseBody = firstResponse.body.replace(/\\n/g, '\n');
            const responseLines = wrapText(responseBody, contentWidth - 15, 11);

            doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
            doc.setFont('courier', 'normal');
            doc.setFontSize(10);

            // Process response lines with automatic page breaks
            let currentResponseY = yPosition;
            responseLines.forEach((line: string) => {
              if (currentResponseY + 5 > maxContentHeight) {
                doc.addPage();
                currentResponseY = 20;
              }
              doc.text(line, margin + 8, currentResponseY);
              currentResponseY += 5;
            });
            yPosition = currentResponseY + 18;
          }
        }
      }

      if (index < responseData.items.length - 1) {
        addNewPageIfNeeded(20);
        doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 20;
      }
    });

    const pageCount = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 282, pageWidth, 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`, margin, 292);
    }

    const pdfData = doc.output('arraybuffer');

    return new NextResponse(pdfData, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="api_documentation.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error generating PDF', error: error }),
      { status: 500 }
    );
  }
}