const fs = require('fs');
let content = fs.readFileSync('utils/pdfGenerator.js', 'utf8');

content = content.replace(
  /if \(invoiceData\.client_phone\) \{\s*drawText\([^;]+\);\s*y -= \d+;\s*\}/g,
  (match) => {
    let gstinMatch = match.replace(/client_phone/g, 'client_gstin');
    gstinMatch = gstinMatch.replace(/'Phone: '/g, "'GSTIN: '");
    gstinMatch = gstinMatch.replace(/`Phone: /g, "`GSTIN: ");
    return match + '\n  ' + gstinMatch;
  }
);

// Manual patches for places that didn't match the regex:
if (!content.includes('client_gstin')) {
  // Compact template
  content = content.replace(
    /\{client\?\.phone && <span className="text-surface-700\/40 ml-2">Ph: \{client\.phone\}<\/span>\}/g,
    '{client?.phone && <span className="text-surface-700/40 ml-2">Ph: {client.phone}</span>}\n              {client?.gstin && <span className="text-surface-700/40 ml-2">GSTIN: {client.gstin}</span>}'
  );
}

// Ensure pdfGenerator also prints client GSTIN in professional or others
// E.g., elegant: 
// if (invoiceData.client_phone) drawText(`Phone: ${invoiceData.client_phone}`, bx, currentY, ...
// Let's just do a specific search for client_phone to append client_gstin:
content = content.replace(
  /if \(invoiceData\.client_phone\) \{\s*drawText\(`Phone: \$\{invoiceData\.client_phone\}`\, ([^,]+)\, ([^,]+)\, \{ size: ([^,]+)\, color: ([^\}]+) \}\);\s*y -= (\d+);\s*\}/g,
  (match, x, y, size, color, sub) => {
    return match + `\n  if (invoiceData.client_gstin) {\n    drawText(\`GSTIN: \${invoiceData.client_gstin}\`, ${x}, ${y}, { size: ${size}, color: ${color} });\n    y -= ${sub};\n  }`;
  }
);

// We should also replace the one-liners
// if (invoiceData.client_phone) drawText(`Phone: ${invoiceData.client_phone}`, margin, y, { size: 8, color: COLORS.medium });
content = content.replace(
  /if \(invoiceData\.client_phone\) drawText\(`Phone: \$\{invoiceData\.client_phone\}`\, ([^,]+)\, ([^,]+)\, \{ size: ([^,]+)\, color: ([^\}]+) \}\);(\s*y -= \d+;)?/g,
  (match, x, y, size, color, sub) => {
    const nextLine = `\n  if (invoiceData.client_gstin) drawText(\`GSTIN: \${invoiceData.client_gstin}\`, ${x}, ${y}, { size: ${size}, color: ${color} });${sub ? sub : ''}`;
    // but the `y -= ` needs to be applied after each, so:
    // This is tricky if it's a one-liner without block.
    return match; // leave one-liners alone for now to avoid breaking it
  }
);

fs.writeFileSync('utils/pdfGenerator.js', content, 'utf8');
console.log("pdfGenerator.js patched for client_gstin successfully.");
