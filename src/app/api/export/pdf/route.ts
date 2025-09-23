import { NextRequest } from 'next/server';
import { jsPDF } from 'jspdf';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { responseData } = await req.json();
    console.log("Received responseData:", JSON.stringify(responseData, null, 2));

    if (!responseData || !responseData.items || responseData.items.length === 0) {
      throw new Error('No items found in responseData');
    }

    const doc = new jsPDF();

    // Color definitions
    const colors = {
      primary: [41, 128, 185] as [number, number, number],
      success: [39, 174, 96] as [number, number, number],
      warning: [243, 156, 18] as [number, number, number],
      danger: [231, 76, 60] as [number, number, number],
      dark: [52, 73, 94] as [number, number, number],
      light: [149, 165, 166] as [number, number, number],
      background: [236, 240, 241] as [number, number, number],
      lightGreen: [240, 255, 240] as [number, number, number],
      lightGray: [248, 249, 250] as [number, number, number]
    };

    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    const footerHeight = 15;
    const maxContentHeight = 270; // Safe content area

    let yPosition = 20;

    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > maxContentHeight) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    const wrapText = (text: string, maxWidth: number, fontSize: number = 10) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      return lines;
    };

    const drawSection = (x: number, y: number, width: number, height: number, fillColor: [number, number, number]) => {
      doc.setFillColor(...fillColor);
      doc.rect(x, y, width, height, 'F');
    };

    // Header
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('>> API Documentation <<', margin, 25);

    yPosition = 50;

    responseData.items.forEach((item: any, index: number) => {
      console.log(`Processing Item ${index + 1}:`);

      // Request header
      checkNewPage(35);
      drawSection(margin - 5, yPosition - 8, contentWidth + 10, 16, colors.background);
      doc.setTextColor(...colors.dark);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(`[${index + 1}] Request: ${item.name || 'Unnamed Request'}`, margin, yPosition);
      yPosition += 25;

      // Method and URL section
      checkNewPage(25);

      // Method badge
      const methodColor = item.method === 'GET' ? colors.success :
                         item.method === 'POST' ? colors.primary :
                         item.method === 'PUT' ? colors.warning : colors.danger;

      doc.setFillColor(...methodColor);
      doc.rect(margin, yPosition - 5, 32, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(item.method, margin + 3, yPosition);

      // URL
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const urlText = `URL: ${item.url}`;
      const urlLines = wrapText(urlText, contentWidth - 40, 10);

      urlLines.forEach((line: string, lineIndex: number) => {
        doc.text(line, margin + 38, yPosition + (lineIndex * 4));
      });
      yPosition += Math.max(15, urlLines.length * 4) + 10;

      // Headers section
      if (item.headers && item.headers.length > 0) {
        checkNewPage(30);

        doc.setTextColor(...colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Headers:', margin, yPosition);
        yPosition += 12;

        let headersHeight = 15; // Base height
        item.headers.forEach((header: { key: any; value: any; }) => {
          const keyLines = wrapText(header.key, 45, 9);
          const valueLines = wrapText(header.value, contentWidth - 55, 9);
          headersHeight += Math.max(keyLines.length, valueLines.length) * 4 + 5;
        });

        if (yPosition + headersHeight > maxContentHeight) {
          doc.addPage();
          yPosition = 20;
        }

        drawSection(margin, yPosition - 5, contentWidth, headersHeight, [252, 252, 252]);

        doc.setTextColor(...colors.primary);
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

          doc.setTextColor(...colors.primary);
          keyLines.forEach((keyLine: string, keyIndex: number) => {
            doc.text(keyLine, margin + 5, yPosition + (keyIndex * 4));
          });

          doc.setTextColor(...colors.dark);
          valueLines.forEach((valueLine: string, valueIndex: number) => {
            doc.text(valueLine, margin + 55, yPosition + (valueIndex * 4));
          });

          yPosition += maxLines * 4 + 5;
        });
        yPosition += 10;
      }

      // Request Body
      if (item.body && item.body.raw) {
        checkNewPage(30);

        doc.setTextColor(...colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Request Body:', margin, yPosition);
        yPosition += 12;

        const rawBody = item.body.raw.replace(/\\n/g, '\n');
        const bodyLines = wrapText(rawBody, contentWidth - 20, 10);
        const bodyHeight = bodyLines.length * 5 + 15;

        if (yPosition + bodyHeight > maxContentHeight) {
          doc.addPage();
          yPosition = 20;
        }

        drawSection(margin, yPosition - 5, contentWidth, bodyHeight, colors.lightGray);

        doc.setTextColor(...colors.dark);
        doc.setFont('courier', 'normal');
        doc.setFontSize(10);

        bodyLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, margin + 8, yPosition + (lineIndex * 5));
        });
        yPosition += bodyHeight + 10;
      }

      // Response
      if (item.response && item.response.length > 0) {
        checkNewPage(40);

        drawSection(margin - 5, yPosition - 8, contentWidth + 10, 16, colors.success);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Response Details', margin, yPosition);
        yPosition += 25;

        const firstResponse = item.response[0];
        if (firstResponse) {
          checkNewPage(30);

          const statusColor = firstResponse.code < 300 ? colors.success :
                             firstResponse.code < 400 ? colors.warning : colors.danger;

          doc.setFillColor(...statusColor);
          doc.rect(margin, yPosition - 5, 35, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`${firstResponse.code}`, margin + 3, yPosition);

          doc.setTextColor(...colors.dark);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Status: ${firstResponse.status}`, margin + 40, yPosition);
          yPosition += 20;

          if (firstResponse.body) {
            doc.setTextColor(...colors.success);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('Response Body:', margin, yPosition);
            yPosition += 12;

            const responseBody = firstResponse.body.replace(/\\n/g, '\n');
            const responseLines = wrapText(responseBody, contentWidth - 15, 11);
            const responseHeight = responseLines.length * 5 + 15;

            if (yPosition + responseHeight > maxContentHeight) {
              doc.addPage();
              yPosition = 20;
              doc.setTextColor(...colors.success);
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              doc.text('Response Body:', margin, yPosition);
              yPosition += 12;
            }

            drawSection(margin, yPosition - 5, contentWidth, responseHeight, colors.lightGreen);

            doc.setTextColor(...colors.dark);
            doc.setFont('courier', 'normal');
            doc.setFontSize(10);

            responseLines.forEach((line: string, lineIndex: number) => {
              doc.text(line, margin + 8, yPosition + (lineIndex * 5));
            });
            yPosition += responseHeight + 18;
          }
        }
      }

      // Separator between requests
      if (index < responseData.items.length - 1) {
        checkNewPage(20);
        doc.setDrawColor(...colors.light);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 20;
      }
    });

    // Footers on all pages
    const pageCount = (doc as any).internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFillColor(...colors.primary);
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
