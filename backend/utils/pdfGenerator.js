// ============================================
// utils/pdfGenerator.js — Invoice PDF Builder
// ============================================
// Generates template-aware, theme-aware PDFs.
// Supports 6 templates × 8 color themes.
// Uses pdf-lib (pure JS, no system deps).
// ============================================

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const QRCode = require('qrcode');
const fs   = require('fs');
const path = require('path');

// ---- Theme Color Maps (hex → pdf-lib rgb) -----

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
};

const THEME_MAP = {
  'ocean-blue':    { primary: '#1e40af', primaryLight: '#3b82f6', accent: '#60a5fa', tableBg: '#eff6ff' },
  'royal-purple':  { primary: '#6d28d9', primaryLight: '#8b5cf6', accent: '#a78bfa', tableBg: '#f5f3ff' },
  'emerald-green': { primary: '#047857', primaryLight: '#10b981', accent: '#34d399', tableBg: '#ecfdf5' },
  'ruby-red':      { primary: '#b91c1c', primaryLight: '#ef4444', accent: '#f87171', tableBg: '#fef2f2' },
  'sunset-orange': { primary: '#c2410c', primaryLight: '#f97316', accent: '#fb923c', tableBg: '#fff7ed' },
  'rose-pink':     { primary: '#be185d', primaryLight: '#ec4899', accent: '#f472b6', tableBg: '#fdf2f8' },
  'midnight-dark': { primary: '#1f2937', primaryLight: '#4b5563', accent: '#6b7280', tableBg: '#f3f4f6' },
  'gold-black':    { primary: '#92400e', primaryLight: '#d97706', accent: '#fbbf24', tableBg: '#fffbeb' },
};

const getThemeColors = (themeId) => {
  const theme = THEME_MAP[themeId] || THEME_MAP['ocean-blue'];
  return {
    primary:    hexToRgb(theme.primary),
    accent:     hexToRgb(theme.primaryLight),
    accentLight:hexToRgb(theme.accent),
    dark:       rgb(0.12, 0.12, 0.12),
    medium:     rgb(0.40, 0.40, 0.40),
    light:      rgb(0.60, 0.60, 0.60),
    muted:      rgb(0.85, 0.85, 0.85),
    white:      rgb(1, 1, 1),
    tableHead:  hexToRgb(theme.primary),
    tableStripe:hexToRgb(theme.tableBg),
    paid:       rgb(0.10, 0.59, 0.32),
    unpaid:     rgb(0.90, 0.60, 0.07),
    overdue:    rgb(0.80, 0.15, 0.15),
  };
};

// ---- Formatting Helpers -------------------------

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const truncateText = (text, maxChars) => {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 3) + '...';
};

// ---- Shared: Embed logo image -------------------

const embedLogo = async (pdfDoc, logoUrl) => {
  if (!logoUrl) return null;
  try {
    const logoPath = path.join(__dirname, '..', logoUrl);
    if (!fs.existsSync(logoPath)) return null;
    const logoBytes = fs.readFileSync(logoPath);
    const ext = path.extname(logoPath).toLowerCase();
    if (ext === '.png') return await pdfDoc.embedPng(logoBytes);
    if (ext === '.jpg' || ext === '.jpeg') return await pdfDoc.embedJpg(logoBytes);
  } catch (err) {
    console.warn('Could not embed logo in PDF:', err.message);
  }
  return null;
};

// ---- Shared: Embed QR Code -----------------------
const embedQRCode = async (pdfDoc, text) => {
  if (!text) return null;
  try {
    const qrDataUrl = await QRCode.toDataURL(text, { margin: 1, scale: 4 });
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBytes = Buffer.from(base64Data, 'base64');
    return await pdfDoc.embedPng(qrBytes);
  } catch (err) {
    console.error('Error generating QR code:', err.message);
    return null;
  }
};

// ---- Shared: Embed signature image ---------------

const embedSignature = async (pdfDoc, sigUrl) => {
  if (!sigUrl) return null;
  try {
    const sigPath = path.join(__dirname, '..', sigUrl);
    if (!fs.existsSync(sigPath)) return null;
    const sigBytes = fs.readFileSync(sigPath);
    const lp = sigPath.toLowerCase();
    if (lp.endsWith('.png')) return await pdfDoc.embedPng(sigBytes);
    if (lp.endsWith('.jpg') || lp.endsWith('.jpeg')) return await pdfDoc.embedJpg(sigBytes);
  } catch (err) {
    console.error('Error embedding signature in PDF:', err.message);
  }
  return null;
};

// ---- Shared: Draw items table --------------------

const drawItemsTable = (page, items, y, margin, contentWidth, COLORS, fonts, options = {}) => {
  const { fontRegular, fontBold } = fonts;
  const rowHeight = options.rowHeight || 28;
  const colWidths = { num: 35, desc: 230, qty: 60, rate: 85, amt: 85 };

  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos,
      size: opts.size || 9,
      font: opts.font || fontRegular,
      color: opts.color || COLORS.dark,
    });
  };

  const drawRect = (x, yPos, w, h, color) => {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color });
  };

  // Header bg
  const headBg = options.headerBg || COLORS.tableHead;
  const headText = options.headerTextColor || COLORS.white;
  drawRect(margin, y - rowHeight + 5, contentWidth, rowHeight, headBg);

  const headerY = y - 15;
  let colX = margin + 10;
  ['#', 'Description', 'Qty', 'Rate', 'Amount'].forEach((label, i) => {
    const w = [colWidths.num, colWidths.desc, colWidths.qty, colWidths.rate, colWidths.amt][i];
    drawText(label, colX, headerY, { font: fontBold, color: headText });
    colX += w;
  });

  y -= rowHeight;

  // Rows
  (items || []).forEach((item, index) => {
    if (index % 2 === 0) {
      drawRect(margin, y - rowHeight + 5, contentWidth, rowHeight, COLORS.tableStripe);
    }
    const rowY = y - 15;
    colX = margin + 10;
    drawText(String(index + 1), colX, rowY, { color: COLORS.medium });
    colX += colWidths.num;
    drawText(truncateText(item.description, 45), colX, rowY);
    colX += colWidths.desc;
    drawText(String(parseFloat(item.quantity)), colX, rowY);
    colX += colWidths.qty;
    drawText(formatCurrency(item.rate), colX, rowY);
    colX += colWidths.rate;
    drawText(formatCurrency(item.amount), colX, rowY, { font: fontBold });
    y -= rowHeight;
  });

  return y;
};

// ---- Shared: Draw totals section -----------------

const drawTotals = (page, invoiceData, y, margin, width, COLORS, fonts, options = {}) => {
  const { fontRegular, fontBold } = fonts;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos,
      size: opts.size || 10,
      font: opts.font || fontRegular,
      color: opts.color || COLORS.dark,
    });
  };
  const drawRect = (x, yPos, w, h, color) => {
    page.drawRectangle({ x, y: yPos, width: w, height: h, color });
  };

  const totalsX = width - margin - 200;

  // Subtotal
  drawText('Subtotal:', totalsX, y, { color: COLORS.medium });
  const stText = formatCurrency(invoiceData.subtotal);
  const stW = fontRegular.widthOfTextAtSize(stText, 10);
  drawText(stText, width - margin - stW, y);
  y -= 18;

  // Discount
  const discountAmt = parseFloat(invoiceData.discount_amount) || 0;
  if (discountAmt > 0) {
    const discType = invoiceData.discount_type || 'flat';
    const discVal = parseFloat(invoiceData.discount_value) || 0;
    const discLabel = discType === 'percent' ? `Discount (${discVal}%):` : 'Discount:';
    drawText(discLabel, totalsX, y, { color: COLORS.medium });
    const discText = `- ${formatCurrency(discountAmt)}`;
    const discW = fontRegular.widthOfTextAtSize(discText, 10);
    drawText(discText, width - margin - discW, y, { color: COLORS.overdue });
    y -= 18;
  }

  // GST
  const gstLabel = `GST (${parseFloat(invoiceData.gst_rate)}%):`;
  drawText(gstLabel, totalsX, y, { color: COLORS.medium });
  const gstText = formatCurrency(invoiceData.gst_amount);
  const gstW = fontRegular.widthOfTextAtSize(gstText, 10);
  drawText(gstText, width - margin - gstW, y);
  y -= 18;

  // Shipping
  const shippingAmt = parseFloat(invoiceData.shipping_charges) || 0;
  if (shippingAmt > 0) {
    drawText('Shipping:', totalsX, y, { color: COLORS.medium });
    const shipText = formatCurrency(shippingAmt);
    const shipW = fontRegular.widthOfTextAtSize(shipText, 10);
    drawText(shipText, width - margin - shipW, y);
    y -= 18;
  }

  y += 13;

  // Total divider
  page.drawLine({
    start: { x: totalsX, y },
    end: { x: width - margin, y },
    thickness: 0.5, color: COLORS.muted,
  });
  y -= 18;

  // Grand Total — option: use a filled bar or plain text
  if (options.totalBar) {
    const barW = width - margin - totalsX;
    drawRect(totalsX - 5, y - 5, barW + 10, 22, COLORS.primary);
    drawText('TOTAL:', totalsX + 5, y, { size: 12, font: fontBold, color: COLORS.white });
    const totalText = formatCurrency(invoiceData.total_amount);
    const totalW = fontBold.widthOfTextAtSize(totalText, 12);
    drawText(totalText, width - margin - totalW, y, { size: 12, font: fontBold, color: COLORS.white });
    y -= 15;
  } else if (options.totalRoundedBar) {
    const barW = width - margin - totalsX;
    // Draw a rounded-looking bar (rectangle with smaller sub-rects)
    drawRect(totalsX - 5, y - 6, barW + 10, 24, COLORS.primary);
    drawText('TOTAL:', totalsX + 8, y, { size: 12, font: fontBold, color: COLORS.white });
    const totalText = formatCurrency(invoiceData.total_amount);
    const totalW = fontBold.widthOfTextAtSize(totalText, 12);
    drawText(totalText, width - margin - totalW - 3, y, { size: 12, font: fontBold, color: COLORS.white });
    y -= 15;
  } else {
    drawText('TOTAL:', totalsX, y, { size: 13, font: fontBold, color: COLORS.primary });
    const totalText = formatCurrency(invoiceData.total_amount);
    const totalW = fontBold.widthOfTextAtSize(totalText, 13);
    drawText(totalText, width - margin - totalW, y, { size: 13, font: fontBold, color: COLORS.primary });
    y -= 15;
    // Double line
    page.drawLine({ start: { x: totalsX, y }, end: { x: width - margin, y }, thickness: 1.5, color: COLORS.primary });
    page.drawLine({ start: { x: totalsX, y: y - 3 }, end: { x: width - margin, y: y - 3 }, thickness: 0.5, color: COLORS.primary });
  }

  return y - 20;
};

// ---- Shared: Notes + Signature + Footer ----------

const drawFooterSection = (page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage, qrImage) => {
  const { fontRegular, fontBold, fontOblique } = fonts;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos,
      size: opts.size || 9,
      font: opts.font || fontRegular,
      color: opts.color || COLORS.dark,
    });
  };

  // Notes
  if (invoiceData.notes) {
    drawText('Notes:', margin, y, { font: fontBold, color: COLORS.medium });
    y -= 14;
    const noteLines = invoiceData.notes.split('\n');
    noteLines.forEach((line) => {
      drawText(line.trim(), margin, y, { font: fontOblique, color: COLORS.light });
      y -= 13;
    });
    y -= 5;
  }

  // Terms & Conditions
  if (invoiceData.terms_conditions) {
    drawText('Terms & Conditions:', margin, y, { font: fontBold, color: COLORS.medium });
    y -= 14;
    const termLines = invoiceData.terms_conditions.split('\n');
    termLines.forEach((line) => {
      drawText(line.trim(), margin, y, { font: fontOblique, color: COLORS.light });
      y -= 13;
    });
    y -= 5;
  }

  // QR Code (Scan to Pay)
  if (qrImage) {
    const qrSize = 64;
    const qrY = Math.max(margin + 50, y - qrSize + 10);
    // Draw QR on the right, but before signature
    const sigWidthOffset = sigImage ? 140 : 0;
    const qrX = width - margin - sigWidthOffset - qrSize - 10;

    page.drawRectangle({ x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 8, color: COLORS.white, borderColor: COLORS.muted, borderWidth: 1 });
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });

    const scanLabel = 'Scan to Pay';
    const scanW = fontBold.widthOfTextAtSize(scanLabel, 9);
    page.drawText(scanLabel, { x: qrX + (qrSize / 2) - (scanW / 2), y: qrY - 14, size: 9, font: fontBold, color: COLORS.dark });

    const upiLabel = invoiceData.upi_id;
    const upiW = fontRegular.widthOfTextAtSize(upiLabel, 8);
    page.drawText(upiLabel, { x: qrX + (qrSize / 2) - (upiW / 2), y: qrY - 24, size: 8, font: fontRegular, color: COLORS.medium });

    y = Math.min(y, qrY - 35);
  }

  // Signature
  if (sigImage) {
    const sigWidth = 120;
    const sigHeight = (sigImage.height / sigImage.width) * sigWidth;
    const sigY = Math.max(margin + 50, y - sigHeight + 10);
    const sigX = width - margin - sigWidth;

    page.drawImage(sigImage, { x: sigX, y: sigY, width: sigWidth, height: sigHeight });

    const authLabel = 'Authorized Signatory';
    const authW = fontRegular.widthOfTextAtSize(authLabel, 9);
    drawText(authLabel, width - margin - (sigWidth / 2) - (authW / 2), sigY - 12, { color: COLORS.medium });
    y = Math.min(y, sigY - 30);
  }

  // Footer
  const footerY = margin + 15;
  page.drawLine({
    start: { x: margin, y: footerY + 15 },
    end: { x: width - margin, y: footerY + 15 },
    thickness: 0.5, color: COLORS.muted,
  });
  drawText('Thank you for your business!', margin, footerY, { font: fontOblique, color: COLORS.medium });
  const footerRight = 'Generated by Frellancer';
  const footerRightW = fontOblique.widthOfTextAtSize(footerRight, 8);
  drawText(footerRight, width - margin - footerRightW, footerY, { size: 8, font: fontOblique, color: COLORS.light });

  return y;
};

// ==================================================
// TEMPLATE RENDERERS
// ==================================================

// ---- CLASSIC: Traditional header with logo -------
const renderClassic = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;
  let y = height - margin;

  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };
  const drawLine = (yPos, opts = {}) => {
    page.drawLine({ start: { x: margin, y: yPos }, end: { x: width - margin, y: yPos },
      thickness: opts.thickness || 0.5, color: opts.color || COLORS.muted });
  };

  // Logo
  let headerTextX = margin;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 50;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: margin, y: y - logoH, width: logoW, height: logoH });
    headerTextX = margin + logoW + 15;
  }

  // Business name
  drawText(invoiceData.business_name || 'My Business', headerTextX, y - 15, { size: 18, font: fontBold, color: COLORS.primary });
  let currentY = y - 32;
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), headerTextX, currentY, { size: 9, color: COLORS.medium });
      currentY -= 13;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, headerTextX, currentY, { size: 9, color: COLORS.medium });
    currentY -= 13;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, headerTextX, currentY, { size: 9, color: COLORS.medium });
  }

  // INVOICE title
  const titleW = fontBold.widthOfTextAtSize('INVOICE', 28);
  drawText('INVOICE', width - margin - titleW, y - 15, { size: 28, font: fontBold, color: COLORS.primary });
  const invNumText = `# ${invoiceData.invoice_number}`;
  const invNumW = fontBold.widthOfTextAtSize(invNumText, 12);
  drawText(invNumText, width - margin - invNumW, y - 38, { size: 12, font: fontBold, color: COLORS.accent });

  y -= 95;
  drawLine(y, { thickness: 1, color: COLORS.primary });
  y -= 25;

  return y;
};

// ---- MODERN MINIMAL: Side accent stripe ----------
const renderModernMinimal = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  // Draw left accent stripe
  page.drawRectangle({ x: 0, y: 0, width: 6, height: height, color: COLORS.primary });

  let y = height - margin;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  const leftX = margin + 10; // offset for stripe

  // Logo + business
  let headerTextX = leftX;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 40;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: leftX, y: y - logoH, width: logoW, height: logoH });
    headerTextX = leftX + logoW + 12;
  }

  drawText(invoiceData.business_name || 'My Business', headerTextX, y - 12, { size: 16, font: fontBold, color: COLORS.dark });
  let currentY = y - 28;
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), headerTextX, currentY, { size: 8, color: COLORS.light });
      currentY -= 12;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, headerTextX, currentY, { size: 8, color: COLORS.light });
    currentY -= 12;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, headerTextX, currentY, { size: 8, color: COLORS.light });
  }

  // "Invoice" — small uppercase right
  const invLabel = 'INVOICE';
  const invLabelW = fontBold.widthOfTextAtSize(invLabel, 11);
  drawText(invLabel, width - margin - invLabelW, y - 8, { size: 11, font: fontBold, color: COLORS.primary });
  const invNumText = invoiceData.invoice_number;
  const invNumW = fontRegular.widthOfTextAtSize(invNumText, 9);
  drawText(invNumText, width - margin - invNumW, y - 22, { size: 9, color: COLORS.light });

  y -= 55;

  // Thin accent line
  page.drawLine({ start: { x: leftX, y }, end: { x: width - margin, y },
    thickness: 0.5, color: COLORS.accent });
  y -= 20;

  return y;
};

// ---- BOLD: Large centered header block -----------
const renderBold = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  // Large header block (full width)
  const headerH = 120;
  page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: COLORS.primary });

  let y = height - 35;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // INVOICE — large centered
  const titleText = 'INVOICE';
  const titleW = fontBold.widthOfTextAtSize(titleText, 36);
  drawText(titleText, (width - titleW) / 2, y, { size: 36, font: fontBold, color: COLORS.white });
  y -= 22;

  // Invoice number centered
  const invNumText = invoiceData.invoice_number;
  const invNumW = fontRegular.widthOfTextAtSize(invNumText, 12);
  drawText(invNumText, (width - invNumW) / 2, y, { size: 12, color: rgb(1, 1, 1) });
  y -= 22;

  // Business name centered
  const bizName = invoiceData.business_name || 'My Business';
  const bizW = fontBold.widthOfTextAtSize(bizName, 12);
  drawText(bizName, (width - bizW) / 2, y, { size: 12, font: fontBold, color: rgb(1, 1, 1) });
  y -= 14;

  if (invoiceData.business_address) {
    const lines = invoiceData.business_address.split('\n');
    lines.forEach((line) => {
      const lineW = fontRegular.widthOfTextAtSize(line.trim(), 9);
      drawText(line.trim(), (width - lineW) / 2, y, { size: 9, color: rgb(1, 1, 1) });
      y -= 12;
    });
  }

  if (invoiceData.business_phone) {
    const phoneStr = `Phone: ${invoiceData.business_phone}`;
    const phoneW = fontRegular.widthOfTextAtSize(phoneStr, 9);
    drawText(phoneStr, (width - phoneW) / 2, y, { size: 9, color: rgb(1, 1, 1) });
    y -= 12;
  }

  if (invoiceData.gstin) {
    const gstinStr = `GSTIN: ${invoiceData.gstin}`;
    const gstinW = fontRegular.widthOfTextAtSize(gstinStr, 9);
    drawText(gstinStr, (width - gstinW) / 2, y, { size: 9, color: rgb(1, 1, 1) });
    y -= 12;
  }

  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 30;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: margin, y: height - headerH + 10, width: logoW, height: logoH });
  }

  y = height - headerH - 25;

  return y;
};

// ---- ELEGANT: Thin top/bottom accent borders -----
const renderElegant = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  // Top border — 4px thick accent line
  page.drawRectangle({ x: 0, y: height - 5, width, height: 5, color: COLORS.primary });
  // Bottom border
  page.drawRectangle({ x: 0, y: 0, width, height: 5, color: COLORS.primary });

  let y = height - margin - 5;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // Logo + business (left)
  let headerTextX = margin;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 45;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: margin, y: y - logoH, width: logoW, height: logoH });
    headerTextX = margin + logoW + 12;
  }

  drawText(invoiceData.business_name || 'My Business', headerTextX, y - 12, { size: 16, font: fontBold, color: COLORS.dark });
  let currentY = y - 28;
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), headerTextX, currentY, { size: 8, color: COLORS.light });
      currentY -= 12;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, headerTextX, currentY, { size: 8, color: COLORS.light });
    currentY -= 12;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, headerTextX, currentY, { size: 8, color: COLORS.light });
  }

  // Watermark-style "Invoice" on the right — large, light
  const watermark = 'Invoice';
  const wmW = fontBold.widthOfTextAtSize(watermark, 32);
  // Use a very light version of the primary color
  const wmColor = rgb(
    COLORS.primary.red * 0.3 + 0.7,
    COLORS.primary.green * 0.3 + 0.7,
    COLORS.primary.blue * 0.3 + 0.7
  );
  drawText(watermark, width - margin - wmW, y - 15, { size: 32, font: fontBold, color: wmColor });

  y -= 65;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y },
    thickness: 0.5, color: COLORS.muted });
  y -= 20;

  return y;
};

// ---- COMPACT: Dense, space-efficient layout ------
const renderCompact = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  let y = height - margin;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 9,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // Compact single row: Logo + Business | INVOICE badge
  let bx = margin;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 30;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: margin, y: y - logoH, width: logoW, height: logoH });
    bx = margin + logoW + 8;
  }

  drawText(invoiceData.business_name || 'My Business', bx, y - 10, { size: 13, font: fontBold, color: COLORS.primary });
  let currentY = y - 23;
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), bx, currentY, { size: 7, color: COLORS.medium });
      currentY -= 10;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, bx, currentY, { size: 7, color: COLORS.medium });
    currentY -= 10;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, bx, currentY, { size: 7, color: COLORS.light });
  }

  // INVOICE badge on right
  const badgeText = 'INVOICE';
  const badgeW = fontBold.widthOfTextAtSize(badgeText, 9);
  page.drawRectangle({ x: width - margin - badgeW - 12, y: y - 18, width: badgeW + 12, height: 16, color: COLORS.primary });
  drawText(badgeText, width - margin - badgeW - 6, y - 14, { size: 9, font: fontBold, color: COLORS.white });

  // Invoice number below badge
  const invNumW = fontRegular.widthOfTextAtSize(invoiceData.invoice_number, 8);
  drawText(invoiceData.invoice_number, width - margin - invNumW, y - 30, { size: 8, color: COLORS.light });

  y -= 40;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: COLORS.muted });
  y -= 12;

  // Compact: Client + dates on same line
  drawText(`To: ${invoiceData.client_name || 'Client'}`, margin, y, { size: 9, font: fontBold, color: COLORS.dark });
  if (invoiceData.client_email) drawText(`(${invoiceData.client_email})`, margin + fontBold.widthOfTextAtSize(`To: ${invoiceData.client_name || 'Client'}`, 9) + 5, y, { size: 8, color: COLORS.light });

  const dateStr = `${formatDate(invoiceData.created_at)}  |  Due: ${formatDate(invoiceData.due_date)}`;
  const dateW = fontRegular.widthOfTextAtSize(dateStr, 8);
  drawText(dateStr, width - margin - dateW, y, { size: 8, color: COLORS.light });
  y -= 13;

  if (invoiceData.client_address) {
    drawText(invoiceData.client_address.split('\n')[0], margin, y, { size: 8, color: COLORS.medium });
    y -= 12;
  }
  if (invoiceData.client_phone) {
    drawText(`Phone: ${invoiceData.client_phone}`, margin, y, { size: 8, color: COLORS.medium });
    y -= 12;
  }
  if (invoiceData.client_gstin) {
    drawText(`GSTIN: ${invoiceData.client_gstin}`, margin, y, { size: 8, color: COLORS.medium });
    y -= 12;
  }

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: COLORS.muted });
  y -= 8;

  // Skip the standard Bill To section — already drawn
  return { y, skipBillTo: true };
};

// ---- CREATIVE: Angled header shape ---------------
const renderCreative = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  const headerH = 110;
  const diagH = 30;

  // Draw angled header as a smooth trapezoid using SVG path
  // Shape: full-width at top, diagonal cut at bottom (left side lower, right side higher)
  // SVG path coordinates: origin at top-left of shape, Y increases downward
  //   Top-left (0,0) → Top-right (width,0) → Bottom-right (width, headerH-diagH) → Bottom-left (0, headerH) → close
  const svgPath = `M 0 0 L ${width} 0 L ${width} ${headerH - diagH} L 0 ${headerH} Z`;
  page.drawSvgPath(svgPath, {
    x: 0,
    y: height,
    color: COLORS.primary,
  });

  let y = height - 35;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // Logo + business (left, on header)
  let bx = margin;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 35;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: margin, y: y - logoH + 5, width: logoW, height: logoH });
    bx = margin + logoW + 12;
  }

  drawText(invoiceData.business_name || 'My Business', bx, y - 5, { size: 16, font: fontBold, color: COLORS.white });
  let currentY = y - 20;
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), bx, currentY, { size: 9, color: rgb(1, 1, 1) });
      currentY -= 12;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, bx, currentY, { size: 9, color: rgb(1, 1, 1) });
    currentY -= 12;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, bx, currentY, { size: 9, color: rgb(1, 1, 1) });
  }

  // INVOICE on right
  const titleText = 'INVOICE';
  const titleW = fontBold.widthOfTextAtSize(titleText, 26);
  drawText(titleText, width - margin - titleW, y - 5, { size: 26, font: fontBold, color: COLORS.white });
  const invNumText = invoiceData.invoice_number;
  const invNumW = fontRegular.widthOfTextAtSize(invNumText, 10);
  drawText(invNumText, width - margin - invNumW, y - 22, { size: 10, color: rgb(1, 1, 1) });

  y = height - headerH - 15;

  // Accent dot + line
  page.drawCircle({ x: margin + 4, y, size: 4, color: COLORS.accentLight });
  page.drawLine({ start: { x: margin + 12, y }, end: { x: width - margin, y },
    thickness: 0.5, color: COLORS.accentLight });
  y -= 20;
  return y;
};

// ---- PROFESSIONAL: Clean, corporate, structured --
const renderProfessional = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  // Header bottom border
  page.drawRectangle({ x: 0, y: height - 120, width, height: 6, color: COLORS.primary });

  let y = height - 40;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // Top Left: INVOICE and No.
  drawText('INVOICE', margin, y, { size: 24, font: fontBold, color: COLORS.primary });
  drawText(`# ${invoiceData.invoice_number}`, margin, y - 16, { size: 10, color: COLORS.medium });

  // Top Right: Logo + Business Info
  let rightX = width - margin;
  
  if (invoiceData.gstin) {
    const gstinStr = `GSTIN: ${invoiceData.gstin}`;
    const gstinW = fontRegular.widthOfTextAtSize(gstinStr, 9);
    drawText(gstinStr, rightX - gstinW, y - 50, { size: 9, color: COLORS.medium });
  }

  if (invoiceData.business_phone) {
    const phoneStr = `Phone: ${invoiceData.business_phone}`;
    const phoneW = fontRegular.widthOfTextAtSize(phoneStr, 9);
    drawText(phoneStr, rightX - phoneW, y - 36, { size: 9, color: COLORS.medium });
  }

  let currentY = y - 22;
  if (invoiceData.business_address) {
    const lines = invoiceData.business_address.split('\n').reverse(); // reverse so we can draw bottom up
    lines.forEach(line => {
      const lineW = fontRegular.widthOfTextAtSize(line.trim(), 9);
      drawText(line.trim(), rightX - lineW, currentY, { size: 9, color: COLORS.medium });
      currentY -= 14;
    });
  }

  const bizName = invoiceData.business_name || 'My Business';
  const bizW = fontBold.widthOfTextAtSize(bizName, 12);
  drawText(bizName, rightX - bizW, currentY, { size: 12, font: fontBold, color: COLORS.dark });

  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 35;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: rightX - logoW, y: currentY + 16, width: logoW, height: logoH });
  }

  y = height - 160;
  return y;
};

// ---- GEOMETRIC: Shapes and structured blocks -----
const renderGeometric = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  page.drawRectangle({ x: width - 150, y: height - 150, width: 150, height: 150, color: COLORS.primaryLight, opacity: 0.2 });

  let y = height - margin;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  let leftX = margin;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 35;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: leftX, y: y - logoH, width: logoW, height: logoH });
    y -= (logoH + 15);
  }

  drawText(invoiceData.business_name || 'My Business', leftX, y, { size: 16, font: fontBold, color: COLORS.primaryDark });
  y -= 16;
  
  if (invoiceData.business_address) {
    invoiceData.business_address.split('\n').forEach((line) => {
      drawText(line.trim(), leftX, y, { size: 9, color: COLORS.medium });
      y -= 13;
    });
  }
  if (invoiceData.business_phone) {
    drawText(`Phone: ${invoiceData.business_phone}`, leftX, y, { size: 9, color: COLORS.medium });
    y -= 13;
  }
  if (invoiceData.gstin) {
    drawText(`GSTIN: ${invoiceData.gstin}`, leftX, y, { size: 9, color: COLORS.light });
  }

  const rightY = height - margin - 30;
  const invLabel = 'INVOICE';
  const invW = fontBold.widthOfTextAtSize(invLabel, 26);
  drawText(invLabel, width - margin - invW, rightY, { size: 26, font: fontBold, color: COLORS.primary });
  const invNum = `# ${invoiceData.invoice_number}`;
  const numW = fontBold.widthOfTextAtSize(invNum, 11);
  drawText(invNum, width - margin - numW, rightY - 22, { size: 11, font: fontBold, color: COLORS.dark });

  y -= 40;
  return y;
};

// ---- STARTUP: Rounded corners (simulated) --------
const renderStartup = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;

  let y = height - margin - 10;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  page.drawRectangle({ x: margin, y: y - 80, width: contentWidth, height: 90, color: COLORS.white, borderColor: COLORS.primaryLight, borderWidth: 1 });

  let hY = y;
  let leftX = margin + 15;
  if (logoImage) {
    const logoDims = logoImage.scale(1);
    const logoH = 40;
    const logoW = (logoDims.width / logoDims.height) * logoH;
    page.drawImage(logoImage, { x: leftX, y: hY - logoH, width: logoW, height: logoH });
    leftX += logoW + 15;
  }

  drawText(invoiceData.business_name || 'My Business', leftX, hY - 15, { size: 14, font: fontBold, color: COLORS.dark });
  if (invoiceData.business_phone) {
    drawText(invoiceData.business_phone, leftX, hY - 28, { size: 9, color: COLORS.medium });
  }

  const badgeW = fontBold.widthOfTextAtSize('INVOICE', 10) + 16;
  page.drawRectangle({ x: width - margin - 15 - badgeW, y: hY - 22, width: badgeW, height: 18, color: COLORS.primary });
  drawText('INVOICE', width - margin - 15 - badgeW + 8, hY - 10, { size: 10, font: fontBold, color: COLORS.white });
  
  const numW = fontBold.widthOfTextAtSize(`# ${invoiceData.invoice_number}`, 12);
  drawText(`# ${invoiceData.invoice_number}`, width - margin - 15 - numW, hY - 40, { size: 12, font: fontBold, color: COLORS.dark });

  y -= 100;
  return y;
};

// ---- MONOCHROME: Sharp black & white -------------
const renderMonochrome = (page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth) => {
  const { fontRegular, fontBold } = fonts;
  
  const black = { type: 'RGB', red: 0, green: 0, blue: 0 };

  let y = height - margin;
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || black,
    });
  };

  drawText('INVOICE', margin, y, { size: 28, font: fontBold, color: black });
  drawText(`NO. ${invoiceData.invoice_number}`, margin, y - 18, { size: 12, font: fontBold, color: black });

  let rightX = width - margin;
  const bizName = (invoiceData.business_name || 'YOUR BUSINESS').toUpperCase();
  const bizW = fontBold.widthOfTextAtSize(bizName, 12);
  drawText(bizName, rightX - bizW, y, { size: 12, font: fontBold, color: black });
  
  let currentY = y - 16;
  if (invoiceData.business_address) {
    const lines = invoiceData.business_address.split('\n');
    lines.forEach(line => {
      const lineUp = line.trim().toUpperCase();
      const lineW = fontRegular.widthOfTextAtSize(lineUp, 9);
      drawText(lineUp, rightX - lineW, currentY, { size: 9, color: black });
      currentY -= 14;
    });
  }
  
  if (invoiceData.business_phone) {
    const ph = `PH: ${invoiceData.business_phone.toUpperCase()}`;
    const phW = fontRegular.widthOfTextAtSize(ph, 9);
    drawText(ph, rightX - phW, currentY, { size: 9, color: black });
    currentY -= 14;
  }
  if (invoiceData.gstin) {
    const gst = `GSTIN: ${invoiceData.gstin.toUpperCase()}`;
    const gstW = fontRegular.widthOfTextAtSize(gst, 9);
    drawText(gst, rightX - gstW, currentY, { size: 9, color: black });
  }

  y = Math.min(y - 50, currentY - 20);
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 2, color: black });
  y -= 20;

  return { y, skipBillTo: true };
};

// ==================================================
// MAIN PDF GENERATOR
// ==================================================

const generateInvoicePDF = async (invoiceData) => {
  const COLORS = getThemeColors(invoiceData.theme_id || 'ocean-blue');
  const templateId = invoiceData.template_id || 'classic';

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fonts = { fontRegular, fontBold, fontOblique };

  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - (margin * 2);

  const logoImage = await embedLogo(pdfDoc, invoiceData.logo_url);
  const sigImage = await embedSignature(pdfDoc, invoiceData.signature_url);

  let qrImage = null;
  if (invoiceData.upi_id) {
    const upiStr = `upi://pay?pa=${invoiceData.upi_id}&pn=${encodeURIComponent(invoiceData.business_name || invoiceData.user_name)}&am=${parseFloat(invoiceData.total_amount).toFixed(2)}&cu=INR`;
    qrImage = await embedQRCode(pdfDoc, upiStr);
  }

  // ---- Draw text helper (used for Bill To section below) ----
  const drawText = (text, x, yPos, opts = {}) => {
    page.drawText(String(text || ''), {
      x, y: yPos, size: opts.size || 10,
      font: opts.font || fontRegular, color: opts.color || COLORS.dark,
    });
  };

  // ============================================
  // 1. HEADER — Template-specific
  // ============================================

  let y;
  let skipBillTo = false;

  const headerArgs = [page, invoiceData, COLORS, fonts, logoImage, width, height, margin, contentWidth];

  switch (templateId) {
    case 'modern-minimal':
      y = renderModernMinimal(...headerArgs);
      break;
    case 'bold':
      y = renderBold(...headerArgs);
      break;
    case 'elegant':
      y = renderElegant(...headerArgs);
      break;
    case 'compact': {
      const result = renderCompact(...headerArgs);
      y = result.y;
      skipBillTo = result.skipBillTo;
      break;
    }
    case 'creative':
      y = renderCreative(...headerArgs);
      break;
    case 'professional':
      y = renderProfessional(...headerArgs);
      break;
    case 'geometric':
      y = renderGeometric(...headerArgs);
      break;
    case 'startup':
      y = renderStartup(...headerArgs);
      break;
    case 'monochrome': {
      const result = renderMonochrome(...headerArgs);
      y = result.y;
      skipBillTo = result.skipBillTo;
      break;
    }
    default: // classic
      y = renderClassic(...headerArgs);
      break;
  }

  // ============================================
  // 2. BILL TO + META (shared, except compact)
  // ============================================

  if (!skipBillTo) {
    drawText('BILL TO', margin, y, { size: 9, font: fontBold, color: COLORS.accent });
    y -= 16;
    drawText(invoiceData.client_name || 'Client', margin, y, { size: 12, font: fontBold, color: COLORS.dark });
    y -= 15;

    if (invoiceData.client_address) {
      invoiceData.client_address.split('\n').forEach((line) => {
        drawText(line.trim(), margin, y, { size: 9, color: COLORS.medium });
        y -= 13;
      });
    }
    if (invoiceData.client_email) {
      drawText(invoiceData.client_email, margin, y, { size: 9, color: COLORS.medium });
      y -= 13;
    }
    if (invoiceData.client_phone) {
      drawText(`Phone: ${invoiceData.client_phone}`, margin, y, { size: 9, color: COLORS.medium });
      y -= 13;
    }
    if (invoiceData.client_gstin) {
      drawText(`GSTIN: ${invoiceData.client_gstin}`, margin, y, { size: 9, color: COLORS.medium });
      y -= 13;
    }

    // Right column: Date, Due Date, Status
    const rightColX = width - margin - 170;
    let metaY = y + 44;

    drawText('Date:', rightColX, metaY, { size: 9, font: fontBold, color: COLORS.medium });
    drawText(formatDate(invoiceData.created_at), rightColX + 70, metaY, { size: 9 });
    metaY -= 16;
    drawText('Due Date:', rightColX, metaY, { size: 9, font: fontBold, color: COLORS.medium });
    drawText(formatDate(invoiceData.due_date), rightColX + 70, metaY, { size: 9 });
    metaY -= 16;
    drawText('Status:', rightColX, metaY, { size: 9, font: fontBold, color: COLORS.medium });

    const statusText = (invoiceData.status || 'unpaid').toUpperCase();
    const statusColor = invoiceData.status === 'paid' ? COLORS.paid
      : invoiceData.status === 'overdue' ? COLORS.overdue
      : COLORS.unpaid;
    const statusTextWidth = fontBold.widthOfTextAtSize(statusText, 9);
    page.drawRectangle({ x: rightColX + 68, y: metaY - 3, width: statusTextWidth + 12, height: 15, color: statusColor });
    drawText(statusText, rightColX + 74, metaY, { size: 9, font: fontBold, color: COLORS.white });

    y -= 35;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: COLORS.muted });
    y -= 10;
  }

  // ============================================
  // 3. ITEMS TABLE (shared)
  // ============================================

  // For bold template, use primary bg header; for others, use standard
  const tableOpts = {};
  if (templateId === 'bold') {
    tableOpts.headerBg = COLORS.primary;
    tableOpts.headerTextColor = COLORS.white;
  }

  y = drawItemsTable(page, invoiceData.items, y, margin, contentWidth, COLORS, fonts, tableOpts);

  // Table bottom line
  page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: width - margin, y: y + 5 }, thickness: 1, color: COLORS.primary });
  y -= 15;

  // ============================================
  // 4. TOTALS (shared, with template-specific styling)
  // ============================================

  const totalOpts = {};
  if (templateId === 'bold') totalOpts.totalBar = true;
  if (templateId === 'creative') totalOpts.totalRoundedBar = true;

  y = drawTotals(page, invoiceData, y, margin, width, COLORS, fonts, totalOpts);

  // ============================================
  // 5. NOTES + SIGNATURE + FOOTER (shared)
  // ============================================

  y = drawFooterSection(page, pdfDoc, invoiceData, y, margin, width, COLORS, fonts, sigImage, qrImage);

  // ---- Serialize and return ----
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

module.exports = { generateInvoicePDF };
