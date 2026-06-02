const fs = require('fs');
let content = fs.readFileSync('utils/pdfGenerator.js', 'utf8');

if (!content.includes("require('qrcode')")) {
  content = content.replace(
    "const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');",
    "const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');\nconst QRCode = require('qrcode');"
  );
}

if (!content.includes("embedQRCode")) {
  content = content.replace(
    "// ---- Shared: Embed signature image ---------------",
    `// ---- Shared: Embed QR Code -----------------------
const embedQRCode = async (pdfDoc, text) => {
  if (!text) return null;
  try {
    const qrDataUrl = await QRCode.toDataURL(text, { margin: 1, scale: 4 });
    const base64Data = qrDataUrl.replace(/^data:image\\/png;base64,/, '');
    const qrBytes = Buffer.from(base64Data, 'base64');
    return await pdfDoc.embedPng(qrBytes);
  } catch (err) {
    console.error('Error generating QR code:', err.message);
    return null;
  }
};

// ---- Shared: Embed signature image ---------------`
  );
}

if (!content.includes("qrImage")) {
  content = content.replace(
    "const drawFooterSection = (page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage) => {",
    "const drawFooterSection = (page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage, qrImage) => {"
  );

  content = content.replace(
    "// Signature",
    `// QR Code (Scan to Pay)
  if (qrImage) {
    const qrSize = 64;
    const qrY = Math.max(margin + 50, y - qrSize + 10);
    // Draw QR on the right, but before signature
    const sigWidthOffset = sigImage ? 140 : 0;
    const qrX = width - margin - sigWidthOffset - qrSize - 10;

    page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, color: COLORS.white, borderColor: COLORS.muted, borderWidth: 1 });
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const scanLabel = 'Scan to Pay';
    const scanW = fontRegular.widthOfTextAtSize(scanLabel, 9);
    page.drawText(scanLabel, { x: qrX + (qrSize / 2) - (scanW / 2), y: qrY - 14, size: 9, font: fontBold, color: COLORS.dark });

    const upiLabel = invoiceData.upi_id;
    const upiW = fontRegular.widthOfTextAtSize(upiLabel, 8);
    page.drawText(upiLabel, { x: qrX + (qrSize / 2) - (upiW / 2), y: qrY - 24, size: 8, font: fontRegular, color: COLORS.medium });

    y = Math.min(y, qrY - 35);
  }

  // Signature`
  );

  content = content.replace(
    /drawFooterSection\(page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage\)/g,
    'drawFooterSection(page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage, qrImage)'
  );

  content = content.replace(
    "const sigImage  = await embedSignature(pdfDoc, invoiceData.signature_url);",
    `const sigImage  = await embedSignature(pdfDoc, invoiceData.signature_url);

  let qrImage = null;
  if (invoiceData.upi_id) {
    const upiStr = \`upi://pay?pa=\${invoiceData.upi_id}&pn=\${encodeURIComponent(invoiceData.business_name || invoiceData.user_name)}&am=\${parseFloat(invoiceData.total_amount).toFixed(2)}&cu=INR\`;
    qrImage = await embedQRCode(pdfDoc, upiStr);
  }`
  );

  content = content.replace(/sigImage\) => \{/g, 'sigImage, qrImage) => {');
  content = content.replace(/, sigImage\);/g, ', sigImage, qrImage);');
}

fs.writeFileSync('utils/pdfGenerator.js', content, 'utf8');
console.log("pdfGenerator.js patched successfully.");
