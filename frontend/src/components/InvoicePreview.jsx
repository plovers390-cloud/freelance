import { useAuth } from '../contexts/AuthContext';
import { getThemeById, getTemplateById } from '../utils/invoiceTemplates';
import QRCodeImport from 'react-qr-code';

const QRCode = QRCodeImport.default || QRCodeImport;

const formatINR = (val) => {
  const num = parseFloat(val) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InvoicePreview = ({ client, items, gstRate, dueDate, notes, termsConditions, discountType, discountValue, shippingCharges, templateId = 'classic', themeId = 'ocean-blue', createdDate, userOverride, invoiceNumber }) => {
  const { user: authUser } = useAuth();
  const user = userOverride || authUser;
  const theme = getThemeById(themeId);
  const colors = theme.colors;

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const discVal = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal * discVal / 100, subtotal)
    : Math.min(discVal, subtotal);
  const gstAmount = subtotal * (parseFloat(gstRate) || 0) / 100;
  const shipAmount = parseFloat(shippingCharges) || 0;
  const total = (subtotal - discountAmount) + gstAmount + shipAmount;

  const today = createdDate
    ? new Date(createdDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const filteredItems = items.filter(i => i.description || i.quantity || i.rate);

  // Shared items table
  const ItemsTable = ({ headerBg, headerText, stripeBg, borderCol }) => (
    <div style={{ border: `1px solid ${borderCol || colors.borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: headerBg || colors.tableBg }}>
            <th className="text-left py-2 px-3 font-semibold" style={{ color: headerText || colors.primary, opacity: headerText ? 1 : 0.7 }}>#</th>
            <th className="text-left py-2 px-3 font-semibold" style={{ color: headerText || colors.primary, opacity: headerText ? 1 : 0.7 }}>Description</th>
            <th className="text-right py-2 px-3 font-semibold" style={{ color: headerText || colors.primary, opacity: headerText ? 1 : 0.7 }}>Qty</th>
            <th className="text-right py-2 px-3 font-semibold" style={{ color: headerText || colors.primary, opacity: headerText ? 1 : 0.7 }}>Rate</th>
            <th className="text-right py-2 px-3 font-semibold" style={{ color: headerText || colors.primary, opacity: headerText ? 1 : 0.7 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-surface-700/30">Add items to see preview</td>
            </tr>
          ) : (
            filteredItems.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0;
              const rate = parseFloat(item.rate) || 0;
              const amount = qty * rate;
              return (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : (stripeBg || `${colors.tableBg}80`) }}>
                  <td className="py-2 px-3 text-surface-700/50">{idx + 1}</td>
                  <td className="py-2 px-3 text-surface-900">{item.description || '—'}</td>
                  <td className="py-2 px-3 text-right text-surface-700">{qty || '—'}</td>
                  <td className="py-2 px-3 text-right text-surface-700">{rate ? formatINR(rate) : '—'}</td>
                  <td className="py-2 px-3 text-right font-semibold text-surface-900">{amount ? formatINR(amount) : '—'}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  // Shared totals section
  const TotalsSection = ({ totalColor }) => (
    <div className="flex justify-end">
      <div className="w-56 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-surface-700/60">Subtotal</span>
          <span className="font-medium text-surface-900">{formatINR(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-surface-700/60">Discount{discountType === 'percent' ? ` (${discVal}%)` : ''}</span>
            <span className="font-medium text-danger-600">−{formatINR(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-surface-700/60">GST ({gstRate}%)</span>
          <span className="font-medium text-surface-900">{formatINR(gstAmount)}</span>
        </div>
        {shipAmount > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-surface-700/60">Shipping</span>
            <span className="font-medium text-surface-900">{formatINR(shipAmount)}</span>
          </div>
        )}
        <div className="h-px bg-surface-200" />
        <div className="flex justify-between text-sm">
          <span className="font-bold" style={{ color: totalColor || colors.primary }}>TOTAL</span>
          <span className="font-bold" style={{ color: totalColor || colors.primary }}>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );

  // Shared notes + signature
  const FooterSection = ({ borderCol, footerText }) => (
    <>
      <div className="flex justify-between items-end mt-6 mb-2 break-inside-avoid">
        <div className="flex-1 space-y-4">
          {notes && (
            <div>
              <p className="text-[10px] font-bold text-surface-700/50 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-xs text-surface-700/60 italic max-w-sm whitespace-pre-wrap">{notes}</p>
            </div>
          )}
          {termsConditions && (
            <div>
              <p className="text-[10px] font-bold text-surface-700/50 uppercase tracking-wider mb-1">Terms & Conditions</p>
              <p className="text-[10px] text-surface-700/60 max-w-sm whitespace-pre-wrap leading-relaxed">{termsConditions}</p>
            </div>
          )}
        </div>
        <div className="flex items-end justify-end gap-6 ml-4">
          {user?.upi_id && (
            <div className="flex flex-col items-center justify-end w-24">
              <div className="bg-white p-1.5 border rounded-lg border-surface-200 mb-1 shadow-sm">
                <QRCode
                  value={`upi://pay?pa=${user.upi_id}&pn=${encodeURIComponent(user.business_name || user.name)}&am=${total.toFixed(2)}&cu=INR`}
                  size={64}
                  level="M"
                  className="w-16 h-16"
                />
              </div>
              <p className="text-[9px] font-bold text-surface-900">Scan to Pay</p>
              <p className="text-[8px] text-surface-700/60 font-mono tracking-tight">{user.upi_id}</p>
            </div>
          )}
          {user?.signature_url && (
            <div className="flex flex-col items-center justify-end w-32">
              <img
                src={user.signature_url}
                alt="Signature"
                className="w-full object-contain h-12 mb-1 opacity-90"
              />
              <p className="text-[10px] text-surface-700/60">Authorized Signatory</p>
            </div>
          )}
        </div>
      </div>
      <div className="pt-3 border-t" style={{ borderColor: borderCol || colors.borderColor }}>
        <p className="text-[10px] text-surface-700/30 italic text-center">{footerText || 'Thank you for your business! • Generated by Freelance'}</p>
      </div>
    </>
  );

  // ============================================
  // TEMPLATE: Classic
  // ============================================
  if (templateId === 'classic') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
        <div className="px-6 py-5 text-white" style={{ background: colors.headerBg }}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-0.5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-lg font-bold">{user?.business_name || 'Your Business'}</h3>
                {user?.business_address && <p className="text-xs text-white/60 mt-1 max-w-[200px] whitespace-pre-wrap">{user.business_address}</p>}
                {user?.phone && <p className="text-xs text-white/60 mt-1 max-w-[200px]">Phone: {user.phone}</p>}
                {user?.gstin && <p className="text-xs text-white/50 mt-1">GSTIN: {user.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold tracking-tight">INVOICE</p>
              <p className="text-xs text-white/60 mt-1">{invoiceNumber || 'Preview'}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.primary }}>Bill To</p>
              <p className="text-sm font-semibold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-xs text-surface-700/50 mt-0.5">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right space-y-1">
              <div className="flex justify-end gap-3 text-xs">
                <span className="text-surface-700/50">Date:</span>
                <span className="font-medium text-surface-900">{today}</span>
              </div>
              <div className="flex justify-end gap-3 text-xs">
                <span className="text-surface-700/50">Due:</span>
                <span className="font-medium text-surface-900">{dueDateFormatted}</span>
              </div>
            </div>
          </div>

          <ItemsTable />
          <TotalsSection />
          <FooterSection />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Modern Minimal
  // ============================================
  if (templateId === 'modern-minimal') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden flex">
        {/* Left accent stripe */}
        <div className="w-1.5 flex-shrink-0" style={{ background: colors.primary }} />

        <div className="flex-1 p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-9 h-9 object-contain rounded-lg flex-shrink-0" />
              )}
              <div>
                <h3 className="text-base font-bold text-surface-900">{user?.business_name || 'Your Business'}</h3>
                {user?.business_address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{user.business_address}</p>}
                {user?.phone && <p className="text-[10px] text-surface-700/60 mt-0.5">Phone: {user.phone}</p>}
                {user?.gstin && <p className="text-[10px] text-surface-700/40 mt-0.5">GSTIN: {user.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-[3px]" style={{ color: colors.primary }}>Invoice</p>
              <p className="text-[10px] text-surface-700/40 mt-1">{invoiceNumber || today}</p>
            </div>
          </div>

          {/* Minimal divider */}
          <div className="h-px" style={{ background: `${colors.primary}20` }} />

          {/* Bill To + Meta */}
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: colors.primaryLight }}>Bill To</p>
              <p className="text-sm font-semibold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/40 mt-0.5">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/40 mt-0.5">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/40 mt-0.5">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-surface-700/40">Due: {dueDateFormatted}</p>
            </div>
          </div>

          <ItemsTable borderCol={`${colors.primary}20`} stripeBg={`${colors.tableBg}`} />
          <TotalsSection />
          <FooterSection borderCol={`${colors.primary}15`} />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Bold
  // ============================================
  if (templateId === 'bold') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
        {/* Large header block */}
        <div className="px-6 py-8 text-center" style={{ background: colors.headerBg }}>
          <p className="text-3xl font-black tracking-wide" style={{ color: colors.headerText }}>INVOICE</p>
          {invoiceNumber && <p className="text-sm font-semibold mt-1" style={{ color: `${colors.headerText}CC` }}>{invoiceNumber}</p>}
          {user?.logo_url && (
            <img src={user.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded mx-auto mt-2 bg-white/15 p-0.5" />
          )}
          <p className="text-sm font-semibold mt-2" style={{ color: `${colors.headerText}CC` }}>
            {user?.business_name || 'Your Business'}
          </p>
          {user?.business_address && (
            <p className="text-[10px] mt-1 whitespace-pre-wrap" style={{ color: `${colors.headerText}80` }}>{user.business_address}</p>
          )}
          {user?.phone && (
            <p className="text-[10px] mt-0.5" style={{ color: `${colors.headerText}80` }}>Phone: {user.phone}</p>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Bill to + dates in a colored bar */}
          <div className="flex justify-between items-start p-3 rounded-lg" style={{ background: colors.tableBg }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.primary }}>Bill To</p>
              <p className="text-sm font-bold text-surface-900 mt-1">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-surface-700">{today}</p>
              <p className="text-xs text-surface-700/50 mt-0.5">Due: {dueDateFormatted}</p>
            </div>
          </div>

          <ItemsTable headerBg={colors.primary} headerText="#ffffff" />

          {/* Bold total bar */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-surface-700/60">Subtotal</span>
                <span className="font-medium text-surface-900">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-surface-700/60">Discount</span>
                  <span className="font-medium text-danger-600">−{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-surface-700/60">GST ({gstRate}%)</span>
                <span className="font-medium text-surface-900">{formatINR(gstAmount)}</span>
              </div>
              {shipAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-surface-700/60">Shipping</span>
                  <span className="font-medium text-surface-900">{formatINR(shipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-3 py-2 rounded-lg text-sm text-white font-bold"
                style={{ background: colors.primary }}>
                <span>TOTAL</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          </div>

          <FooterSection />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Elegant
  // ============================================
  if (templateId === 'elegant') {
    return (
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden"
        style={{ border: `1px solid ${colors.borderColor}`, borderTop: `4px solid ${colors.primary}`, borderBottom: `4px solid ${colors.primary}` }}>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-9 h-9 object-contain rounded flex-shrink-0" />
              )}
              <div>
                <h3 className="text-base font-bold text-surface-900">{user?.business_name || 'Your Business'}</h3>
                {user?.business_address && <p className="text-[10px] text-surface-700/40 mt-0.5 max-w-[180px] whitespace-pre-wrap">{user.business_address}</p>}
                {user?.phone && <p className="text-[10px] text-surface-700/40 mt-0.5 max-w-[180px]">Phone: {user.phone}</p>}
                {user?.gstin && <p className="text-[10px] text-surface-700/40">GSTIN: {user.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-light tracking-[6px] uppercase" style={{ color: `${colors.primary}35` }}>Invoice</p>
              {invoiceNumber && <p className="text-xs text-surface-700/40 mt-1">{invoiceNumber}</p>}
            </div>
          </div>

          <div className="h-px" style={{ background: colors.borderColor }} />

          {/* Bill To */}
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: colors.primary }}>Bill To</p>
              <p className="text-sm font-semibold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-xs text-surface-700/50 mt-0.5">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs"><span className="text-surface-700/40">Date: </span><span className="text-surface-900">{today}</span></div>
              <div className="text-xs"><span className="text-surface-700/40">Due: </span><span className="text-surface-900">{dueDateFormatted}</span></div>
            </div>
          </div>

          <ItemsTable />
          <TotalsSection />
          <FooterSection borderCol={colors.borderColor} footerText="Thank you for choosing our services • Freelance" />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Compact
  // ============================================
  if (templateId === 'compact') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
        <div className="p-4 space-y-3">
          {/* Top bar: Business + INVOICE + Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-7 h-7 object-contain rounded flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold" style={{ color: colors.primary }}>{user?.business_name || 'Your Business'}</p>
                {user?.business_address && <p className="text-[9px] text-surface-700/60 whitespace-pre-wrap">{user.business_address}</p>}
                {user?.phone && <p className="text-[9px] text-surface-700/60">Phone: {user.phone}</p>}
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                style={{ background: colors.primary }}>Invoice</span>
              {invoiceNumber && <span className="text-[9px] text-surface-700/60">{invoiceNumber}</span>}
            </div>
          </div>

          <div className="h-px bg-surface-200" />

          {/* Client + dates in one line */}
          <div className="flex justify-between text-xs">
            <div>
              <span className="text-surface-700/50">To: </span>
              <span className="font-semibold text-surface-900">{client?.name || 'Select client'}</span>
              {client?.email && <span className="text-surface-700/40 ml-2">({client.email})</span>}
              {client?.phone && <span className="text-surface-700/40 ml-2">Ph: {client.phone}</span>}
              {client?.gstin && <span className="text-surface-700/40 ml-2">GSTIN: {client.gstin}</span>}
              {client?.address && <div className="text-[10px] text-surface-700/50 mt-0.5 whitespace-pre-wrap">{client.address}</div>}
            </div>
            <div className="text-right text-surface-700/50">
              {today} • Due: {dueDateFormatted}
            </div>
          </div>

          {user?.gstin && (
            <p className="text-[10px] text-surface-700/40">GSTIN: {user.gstin}</p>
          )}

          <div className="h-px bg-surface-200" />

          {/* Compact table */}
          <ItemsTable />

          {/* Compact totals */}
          <div className="flex justify-end">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-surface-700/50">Subtotal</span>
                <span className="text-surface-900">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-surface-700/50">Discount</span>
                  <span className="text-danger-600">−{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px]">
                <span className="text-surface-700/50">GST ({gstRate}%)</span>
                <span className="text-surface-900">{formatINR(gstAmount)}</span>
              </div>
              {shipAmount > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-surface-700/50">Shipping</span>
                  <span className="text-surface-900">{formatINR(shipAmount)}</span>
                </div>
              )}
              <div className="h-px" style={{ background: colors.primary }} />
              <div className="flex justify-between text-xs font-bold" style={{ color: colors.primary }}>
                <span>TOTAL</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Compact footer */}
          {notes && <p className="text-[10px] text-surface-700/40 italic">{notes}</p>}

          <div className="flex justify-between items-end">
            <p className="text-[9px] text-surface-700/25 italic">Generated by Freelance</p>
            {user?.signature_url && (
              <div className="flex flex-col items-center">
                <img src={user.signature_url} alt="Signature" className="h-8 object-contain opacity-80" />
                <p className="text-[8px] text-surface-700/40">Authorized</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Creative
  // ============================================
  if (templateId === 'creative') {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 overflow-hidden">
        {/* Angled header */}
        <div className="relative" style={{ height: '110px' }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: colors.headerBg,
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 70%)',
          }} />
          <div className="relative z-10 px-6 pt-5 flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-9 h-9 object-contain rounded-lg bg-white/15 p-0.5 flex-shrink-0" />
              )}
              <div>
                <h3 className="text-base font-bold" style={{ color: colors.headerText }}>{user?.business_name || 'Your Business'}</h3>
                {user?.business_address && <p className="text-[10px] mt-0.5 max-w-[200px] whitespace-pre-wrap" style={{ color: `${colors.headerText}99` }}>{user.business_address}</p>}
                {user?.phone && <p className="text-[10px] mt-0.5" style={{ color: `${colors.headerText}99` }}>Phone: {user.phone}</p>}
                {user?.gstin && <p className="text-[10px] mt-0.5" style={{ color: `${colors.headerText}80` }}>GSTIN: {user.gstin}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black tracking-wider" style={{ color: colors.headerText }}>INVOICE</p>
              {invoiceNumber && <p className="text-xs mt-1" style={{ color: `${colors.headerText}CC` }}>{invoiceNumber}</p>}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-5 -mt-1">
          {/* Creative accent dot */}
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: colors.accent }} />
            <div className="h-px flex-1" style={{ background: `${colors.accent}40` }} />
          </div>

          {/* Bill To + Dates */}
          <div className="flex justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.accent }}>Bill To</p>
              <p className="text-sm font-semibold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right space-y-1">
              <div className="text-xs"><span className="text-surface-700/40">Date: </span><span className="text-surface-900">{today}</span></div>
              <div className="text-xs"><span className="text-surface-700/40">Due: </span><span className="text-surface-900">{dueDateFormatted}</span></div>
            </div>
          </div>

          {/* Table with rounded corners */}
          <div style={{ border: `1px solid ${colors.borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: colors.tableBg }}>
                  <th className="text-left py-2 px-3 font-semibold" style={{ color: colors.primary }}>#</th>
                  <th className="text-left py-2 px-3 font-semibold" style={{ color: colors.primary }}>Description</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: colors.primary }}>Qty</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: colors.primary }}>Rate</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: colors.primary }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-surface-700/30">Add items to see preview</td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const qty = parseFloat(item.quantity) || 0;
                    const rate = parseFloat(item.rate) || 0;
                    const amount = qty * rate;
                    return (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'transparent' : `${colors.tableBg}80` }}>
                        <td className="py-2 px-3 text-surface-700/50">{idx + 1}</td>
                        <td className="py-2 px-3 text-surface-900">{item.description || '—'}</td>
                        <td className="py-2 px-3 text-right text-surface-700">{qty || '—'}</td>
                        <td className="py-2 px-3 text-right text-surface-700">{rate ? formatINR(rate) : '—'}</td>
                        <td className="py-2 px-3 text-right font-semibold text-surface-900">{amount ? formatINR(amount) : '—'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Creative total with pill style */}
          <div className="flex justify-end">
            <div className="w-56 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-surface-700/60">Subtotal</span>
                <span className="font-medium text-surface-900">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-surface-700/60">Discount</span>
                  <span className="font-medium text-danger-600">−{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-surface-700/60">GST ({gstRate}%)</span>
                <span className="font-medium text-surface-900">{formatINR(gstAmount)}</span>
              </div>
              {shipAmount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-surface-700/60">Shipping</span>
                  <span className="font-medium text-surface-900">{formatINR(shipAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-2 rounded-full text-sm text-white font-bold"
                style={{ background: colors.headerBg }}>
                <span>TOTAL</span>
                <span>{formatINR(total)}</span>
              </div>
            </div>
          </div>

          <FooterSection borderCol={`${colors.accent}30`} />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Professional
  // ============================================
  if (templateId === 'professional') {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-surface-200 overflow-hidden text-surface-900">
        <div className="p-6 border-b-[6px]" style={{ borderBottomColor: colors.primary }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-2xl font-bold tracking-wider" style={{ color: colors.primary }}>INVOICE</p>
              <p className="text-sm mt-1 text-surface-700/60">{invoiceNumber ? `# ${invoiceNumber}` : '# PREVIEW'}</p>
            </div>
            <div className="text-right">
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded ml-auto mb-2" />
              )}
              <h3 className="text-base font-bold text-surface-900">{user?.business_name || 'Your Business'}</h3>
              {user?.business_address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{user.business_address}</p>}
              {user?.phone && <p className="text-[10px] text-surface-700/60 mt-0.5">Phone: {user.phone}</p>}
              {user?.gstin && <p className="text-[10px] text-surface-700/40 mt-0.5">GSTIN: {user.gstin}</p>}
            </div>
          </div>
        </div>

        <div className="px-6 py-6 border-b border-surface-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.primary }}>Billed To</p>
              <p className="text-sm font-semibold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50 mt-0.5">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50 mt-0.5">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50 mt-0.5">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colors.primary }}>Invoice Date</p>
                <p className="text-sm text-surface-900 font-medium">{today}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: colors.primary }}>Due Date</p>
                <p className="text-sm text-surface-900 font-medium">{dueDateFormatted}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <ItemsTable />
          <TotalsSection />
          <FooterSection borderCol={colors.borderColor} />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Geometric
  // ============================================
  if (templateId === 'geometric') {
    return (
      <div className="bg-white rounded-none shadow-xl border border-surface-200 overflow-hidden text-surface-900 relative">
        {/* Geometric background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20"
          style={{ background: colors.primary, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
        <div className="absolute top-10 right-10 w-16 h-16 opacity-30"
          style={{ background: colors.accent, clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
          
        <div className="relative p-6 space-y-6">
          <div className="flex items-end justify-between">
            <div>
              {user?.logo_url && (
                <img src={user.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded mb-3" />
              )}
              <h3 className="text-xl font-bold" style={{ color: colors.primaryDark }}>{user?.business_name || 'Your Business'}</h3>
              {user?.business_address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{user.business_address}</p>}
              {user?.phone && <p className="text-[10px] text-surface-700/60 mt-0.5">Phone: {user.phone}</p>}
              {user?.gstin && <p className="text-[10px] text-surface-700/40 mt-0.5">GSTIN: {user.gstin}</p>}
            </div>
            <div className="text-right pb-1">
              <h1 className="text-3xl font-black uppercase tracking-widest" style={{ color: colors.primary }}>Invoice</h1>
              <p className="text-xs font-semibold text-surface-900 mt-1">{invoiceNumber ? `# ${invoiceNumber}` : '# PREVIEW'}</p>
            </div>
          </div>

          <div className="flex justify-between p-4" style={{ background: colors.tableBg }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: colors.primary }}>Bill To</p>
              <p className="text-sm font-bold text-surface-900">{client?.name || 'Select a client'}</p>
              {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
              {client?.email && <p className="text-xs text-surface-700/50 mt-0.5">{client.email}</p>}
              {client?.phone && <p className="text-xs text-surface-700/50 mt-0.5">Phone: {client.phone}</p>}
              {client?.gstin && <p className="text-xs text-surface-700/50 mt-0.5">GSTIN: {client.gstin}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs"><span className="font-semibold text-surface-700/60">Date:</span> <span className="font-medium text-surface-900">{today}</span></p>
              <p className="text-xs mt-1"><span className="font-semibold text-surface-700/60">Due:</span> <span className="font-medium text-surface-900">{dueDateFormatted}</span></p>
            </div>
          </div>

          <ItemsTable headerBg={colors.primary} headerText="#fff" />
          <TotalsSection />
          <FooterSection />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Startup
  // ============================================
  if (templateId === 'startup') {
    return (
      <div className="bg-[#fcfdfd] rounded-[24px] shadow-lg border border-surface-100 overflow-hidden p-6 space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-surface-50">
          <div className="flex items-center gap-3">
            {user?.logo_url ? (
              <img src={user.logo_url} alt="Logo" className="w-12 h-12 object-cover rounded-xl" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: colors.primary }}>
                {user?.business_name?.charAt(0) || 'B'}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-surface-900">{user?.business_name || 'Your Business'}</h3>
              {user?.phone && <p className="text-[10px] text-surface-700/50">{user.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white mb-1" style={{ background: colors.primary }}>
              Invoice
            </div>
            <p className="text-xs font-semibold text-surface-900">{invoiceNumber ? `# ${invoiceNumber}` : '# PREVIEW'}</p>
          </div>
        </div>

        <div className="flex justify-between px-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-surface-700/40 mb-1">Billed To</p>
            <p className="text-sm font-bold text-surface-900">{client?.name || 'Select a client'}</p>
            {client?.address && <p className="text-[10px] text-surface-700/60 mt-0.5 whitespace-pre-wrap">{client.address}</p>}
            {client?.email && <p className="text-xs text-surface-700/50 mt-0.5">{client.email}</p>}
            {client?.phone && <p className="text-xs text-surface-700/50 mt-0.5">Phone: {client.phone}</p>}
            {client?.gstin && <p className="text-xs text-surface-700/50 mt-0.5">GSTIN: {client.gstin}</p>}
          </div>
          <div className="text-right text-xs space-y-1">
            <p><span className="text-surface-700/40">Issued: </span><span className="font-semibold text-surface-900">{today}</span></p>
            <p><span className="text-surface-700/40">Due: </span><span className="font-semibold text-surface-900">{dueDateFormatted}</span></p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-surface-50 overflow-hidden">
          <ItemsTable headerBg={colors.tableBg} headerText={colors.primaryDark} />
        </div>

        <TotalsSection />
        
        <div className="pt-4 px-2">
          {notes && <p className="text-xs text-surface-700/60 mb-2">{notes}</p>}
          <div className="flex justify-between items-end">
            <div>
              {termsConditions && (
                <>
                  <p className="text-[10px] font-bold text-surface-900 uppercase">Terms</p>
                  <p className="text-[10px] text-surface-700/50 max-w-[200px] whitespace-pre-wrap">{termsConditions}</p>
                </>
              )}
            </div>
            {user?.signature_url && (
              <div className="text-right">
                <img src={user.signature_url} alt="Signature" className="h-10 object-contain mb-1 ml-auto" />
                <p className="text-[10px] text-surface-700/40 font-medium">Authorized Signatory</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Monochrome
  // ============================================
  if (templateId === 'monochrome') {
    return (
      <div className="bg-white rounded-sm shadow-xl border-2 border-black overflow-hidden text-black p-8 font-mono">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Invoice</h1>
            <p className="text-sm font-bold mt-1">{invoiceNumber ? `NO. ${invoiceNumber}` : 'NO. PREVIEW'}</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-bold uppercase">{user?.business_name || 'YOUR BUSINESS'}</h3>
            {user?.business_address && <p className="text-xs mt-1 whitespace-pre-wrap uppercase">{user.business_address}</p>}
            {user?.phone && <p className="text-xs mt-1 uppercase">PH: {user.phone}</p>}
            {user?.gstin && <p className="text-xs mt-1 uppercase">GSTIN: {user.gstin}</p>}
          </div>
        </div>

        <div className="flex justify-between border-b-2 border-black pb-6 mb-6">
          <div>
            <p className="text-xs font-bold uppercase mb-2">Billed To:</p>
            <p className="text-sm font-bold uppercase">{client?.name || 'CLIENT NAME'}</p>
            {client?.address && <p className="text-xs mt-1 whitespace-pre-wrap uppercase">{client.address}</p>}
            {client?.email && <p className="text-xs mt-1 uppercase">{client.email}</p>}
            {client?.phone && <p className="text-xs mt-1 uppercase">PH: {client.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase mb-2">Dates:</p>
            <p className="text-xs uppercase">Issued: {today}</p>
            <p className="text-xs uppercase mt-1">Due: {dueDateFormatted}</p>
          </div>
        </div>

        <table className="w-full text-xs text-left mb-6">
          <thead className="border-b-2 border-black">
            <tr>
              <th className="py-2 uppercase">Description</th>
              <th className="py-2 uppercase text-right">Qty</th>
              <th className="py-2 uppercase text-right">Rate</th>
              <th className="py-2 uppercase text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center italic text-gray-400">No items</td>
              </tr>
            ) : (
              filteredItems.map((item, idx) => {
                const qty = parseFloat(item.quantity) || 0;
                const rate = parseFloat(item.rate) || 0;
                const amount = qty * rate;
                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 font-bold uppercase">{item.description || '—'}</td>
                    <td className="py-2 text-right">{qty || '—'}</td>
                    <td className="py-2 text-right">{rate ? formatINR(rate) : '—'}</td>
                    <td className="py-2 text-right font-bold">{amount ? formatINR(amount) : '—'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        <div className="flex justify-end border-b-2 border-black pb-6 mb-6">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs uppercase">
              <span>Subtotal</span>
              <span className="font-bold">{formatINR(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs uppercase">
                <span>Discount</span>
                <span className="font-bold">−{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs uppercase">
              <span>GST ({gstRate}%)</span>
              <span className="font-bold">{formatINR(gstAmount)}</span>
            </div>
            {shipAmount > 0 && (
              <div className="flex justify-between text-xs uppercase">
                <span>Shipping</span>
                <span className="font-bold">{formatINR(shipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm uppercase font-black bg-black text-white px-3 py-2 mt-2">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            {notes && <p className="text-xs mb-3 italic">"{notes}"</p>}
            {termsConditions && (
              <div>
                <p className="text-[10px] font-bold uppercase mb-1">Terms</p>
                <p className="text-[10px] max-w-[250px] whitespace-pre-wrap">{termsConditions}</p>
              </div>
            )}
          </div>
          {user?.signature_url && (
            <div className="text-right">
              <img src={user.signature_url} alt="Signature" className="h-10 object-contain mb-1 ml-auto grayscale mix-blend-multiply" />
              <p className="text-[10px] font-bold uppercase">Authorized</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: POS Receipt
  // ============================================
  if (templateId === 'receipt') {
    return (
      <div className="bg-[#fdfdfd] shadow-md border border-surface-200 overflow-hidden text-surface-900 mx-auto font-mono text-[11px]" style={{ maxWidth: '400px' }}>
        <div className="p-6">
          <div className="text-center mb-6">
            {user?.logo_url && (
              <img src={user.logo_url} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2 grayscale" />
            )}
            <h2 className="text-lg font-bold uppercase">{user?.business_name || 'STORE NAME'}</h2>
            {user?.business_address && <p className="mt-1 whitespace-pre-wrap">{user.business_address}</p>}
            {user?.phone && <p>PH: {user.phone}</p>}
            {user?.gstin && <p>GSTIN: {user.gstin}</p>}
          </div>

          <div className="border-t-2 border-dashed border-surface-300 py-3 mb-3">
            <p className="text-center font-bold text-sm uppercase">Tax Invoice</p>
            <p className="text-center mt-1">NO: {invoiceNumber || 'PREVIEW'}</p>
            <p className="text-center">DATE: {today}</p>
          </div>

          <div className="border-b-2 border-dashed border-surface-300 pb-3 mb-3">
            <p className="uppercase font-bold">Billed To:</p>
            <p className="font-semibold">{client?.name || 'Walk-in Customer'}</p>
            {client?.phone && <p>PH: {client.phone}</p>}
            {client?.email && <p>{client.email}</p>}
          </div>

          <table className="w-full text-left mb-4">
            <thead>
              <tr className="border-b border-surface-300">
                <th className="py-1">ITEM</th>
                <th className="py-1 text-right">QTY</th>
                <th className="py-1 text-right">AMT</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const qty = parseFloat(item.quantity) || 0;
                const rate = parseFloat(item.rate) || 0;
                return (
                  <tr key={idx}>
                    <td className="py-1">{item.description}</td>
                    <td className="py-1 text-right">{qty}</td>
                    <td className="py-1 text-right">{formatINR(qty * rate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="space-y-1 mb-4 border-b-2 border-dashed border-surface-300 pb-4">
            <div className="flex justify-between">
              <span>SUBTOTAL</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span>DISCOUNT</span>
                <span>-{formatINR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST ({gstRate}%)</span>
              <span>{formatINR(gstAmount)}</span>
            </div>
            {shipAmount > 0 && (
              <div className="flex justify-between">
                <span>SHIPPING</span>
                <span>{formatINR(shipAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between text-base font-bold mb-6">
            <span>TOTAL</span>
            <span>{formatINR(total)}</span>
          </div>

          <div className="text-center text-[10px] space-y-2">
            <p className="uppercase">Thank you for your visit!</p>
            {notes && <p className="italic">"{notes}"</p>}
            <p>*** END OF RECEIPT ***</p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Contemporary
  // ============================================
  if (templateId === 'contemporary') {
    return (
      <div className="bg-white rounded-[32px] shadow-2xl overflow-hidden border border-surface-100 p-8 space-y-8 text-surface-900">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black tracking-tighter" style={{ color: colors.primary }}>Invoice.</h1>
            <p className="text-surface-700/60 font-medium mt-2 text-sm">{invoiceNumber ? `#${invoiceNumber}` : 'Draft Preview'}</p>
          </div>
          <div className="text-right">
            {user?.logo_url && <img src={user.logo_url} alt="Logo" className="w-14 h-14 object-cover rounded-2xl ml-auto mb-3 shadow-sm" />}
            <h3 className="text-lg font-bold">{user?.business_name || 'Your Business'}</h3>
            {user?.phone && <p className="text-xs text-surface-700/60 mt-0.5">{user.phone}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-surface-50 p-6 rounded-[24px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-surface-700/40 mb-2">Invoice To</p>
            <p className="text-base font-bold text-surface-900">{client?.name || 'Client Name'}</p>
            {client?.email && <p className="text-sm text-surface-700/60 mt-1">{client.email}</p>}
            {client?.address && <p className="text-xs text-surface-700/50 mt-1 whitespace-pre-wrap">{client.address}</p>}
          </div>
          <div className="text-right space-y-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-700/40 mb-1">Date</p>
              <p className="text-sm font-semibold">{today}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-700/40 mb-1">Due Date</p>
              <p className="text-sm font-semibold">{dueDateFormatted}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] overflow-hidden border border-surface-100 shadow-sm">
          <ItemsTable headerBg={colors.primaryLight} headerText="#fff" />
        </div>

        <TotalsSection totalColor={colors.primary} />
        <FooterSection />
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Blocky
  // ============================================
  if (templateId === 'blocky') {
    return (
      <div className="bg-white rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] border-4 border-surface-900 overflow-hidden text-surface-900">
        <div className="flex border-b-4 border-surface-900">
          <div className="w-2/3 p-6 border-r-4 border-surface-900 bg-surface-50">
            {user?.logo_url && <img src={user.logo_url} alt="Logo" className="w-12 h-12 object-contain border-2 border-surface-900 bg-white mb-4" />}
            <h2 className="text-2xl font-black uppercase tracking-tight">{user?.business_name || 'BUSINESS NAME'}</h2>
            {user?.business_address && <p className="text-xs font-bold mt-2 uppercase">{user.business_address}</p>}
            {user?.phone && <p className="text-xs font-bold mt-1 uppercase">PH: {user.phone}</p>}
            {user?.gstin && <p className="text-xs font-bold mt-1 uppercase">GSTIN: {user.gstin}</p>}
          </div>
          <div className="w-1/3 flex flex-col">
            <div className="flex-1 p-6 flex flex-col justify-center items-center" style={{ background: colors.primary }}>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">Invoice</h1>
              <p className="text-white font-bold mt-2 bg-black/20 px-3 py-1 rounded-sm">{invoiceNumber || 'PREVIEW'}</p>
            </div>
          </div>
        </div>

        <div className="flex border-b-4 border-surface-900">
          <div className="w-1/2 p-6 border-r-4 border-surface-900">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: colors.primary }}>Billed To</p>
            <p className="text-lg font-black uppercase">{client?.name || 'CLIENT NAME'}</p>
            {client?.email && <p className="text-xs font-bold mt-1 uppercase">{client.email}</p>}
            {client?.address && <p className="text-xs font-bold mt-1 uppercase whitespace-pre-wrap">{client.address}</p>}
          </div>
          <div className="w-1/2 p-6 bg-surface-50">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: colors.primary }}>Issue Date</p>
              <p className="text-sm font-bold uppercase">{today}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: colors.primary }}>Due Date</p>
              <p className="text-sm font-bold uppercase">{dueDateFormatted}</p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b-4 border-surface-900">
          <ItemsTable headerBg={colors.surface900} headerText="#ffffff" borderCol="#111827" />
        </div>

        <div className="p-6 bg-surface-50 flex justify-end">
          <TotalsSection totalColor={colors.primary} />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Elegant Serif
  // ============================================
  if (templateId === 'elegant-serif') {
    return (
      <div className="bg-[#faf9f6] rounded-sm shadow-xl border border-surface-200 p-10 text-surface-900" style={{ fontFamily: 'Georgia, serif' }}>
        <div className="text-center mb-10 border-b border-surface-300 pb-8">
          {user?.logo_url && <img src={user.logo_url} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />}
          <h1 className="text-3xl font-normal tracking-wide" style={{ color: colors.primaryDark }}>{user?.business_name || 'Your Business'}</h1>
          <div className="mt-4 text-xs italic text-surface-700/60 max-w-md mx-auto space-y-1">
            {user?.business_address && <p>{user.business_address}</p>}
            {user?.phone && <p>Tel: {user.phone}</p>}
            {user?.gstin && <p>GSTIN: {user.gstin}</p>}
          </div>
        </div>

        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-2xl font-normal tracking-widest uppercase mb-2" style={{ color: colors.primary }}>Invoice</h2>
            <p className="text-sm">{invoiceNumber || 'Draft'}</p>
          </div>
          <div className="text-right text-sm">
            <p className="mb-1"><span className="italic text-surface-700/60">Date:</span> {today}</p>
            <p><span className="italic text-surface-700/60">Due:</span> {dueDateFormatted}</p>
          </div>
        </div>

        <div className="mb-10">
          <p className="text-xs italic text-surface-700/60 mb-2">Billed To:</p>
          <p className="text-lg font-normal">{client?.name || 'Client Name'}</p>
          {client?.address && <p className="text-sm mt-1">{client.address}</p>}
          {client?.email && <p className="text-sm mt-1 text-surface-700/60">{client.email}</p>}
        </div>

        <div className="mb-10">
          <ItemsTable headerBg="transparent" headerText={colors.primaryDark} stripeBg="transparent" borderCol={colors.borderColor} />
        </div>

        <TotalsSection totalColor={colors.primaryDark} />
        <FooterSection borderCol={colors.borderColor} />
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Futuristic
  // ============================================
  if (templateId === 'futuristic') {
    return (
      <div className="bg-[#0f172a] rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-surface-800 overflow-hidden text-surface-100 p-8 font-mono">
        <div className="flex justify-between items-center mb-8 border-b border-surface-800 pb-8">
          <div className="flex items-center gap-4">
            {user?.logo_url && (
              <img src={user.logo_url} alt="Logo" className="w-12 h-12 object-contain rounded border border-surface-700 p-1" />
            )}
            <div>
              <h2 className="text-xl font-bold tracking-widest" style={{ color: colors.accent, textShadow: `0 0 10px ${colors.accent}80` }}>
                {user?.business_name || 'SYSTEM ONLINE'}
              </h2>
              {user?.phone && <p className="text-xs text-surface-400 mt-1">COMM_LINK: {user.phone}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block border px-3 py-1 mb-2 rounded" style={{ borderColor: colors.primary, color: colors.primary, boxShadow: `inset 0 0 10px ${colors.primary}40` }}>
              <span className="text-xs font-bold tracking-widest">INVOICE DATA</span>
            </div>
            <p className="text-sm text-surface-300">ID: {invoiceNumber || 'NULL'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 bg-[#1e293b] p-6 rounded-lg border border-surface-700 shadow-inner">
          <div>
            <p className="text-[10px] text-surface-500 mb-2">// TARGET_ENTITY</p>
            <p className="text-base font-bold text-white">{client?.name || 'UNDEFINED'}</p>
            {client?.email && <p className="text-xs text-surface-400 mt-1">{client.email}</p>}
            {client?.address && <p className="text-xs text-surface-400 mt-1 whitespace-pre-wrap">{client.address}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-surface-500 mb-2">// TIMESTAMPS</p>
            <p className="text-xs text-surface-300">INIT: <span className="text-white">{today}</span></p>
            <p className="text-xs text-surface-300 mt-2">DEADLINE: <span className="text-white">{dueDateFormatted}</span></p>
          </div>
        </div>

        <div className="mb-8">
          <ItemsTable headerBg="#1e293b" headerText={colors.accent} stripeBg="#1e293b" borderCol="#334155" />
        </div>

        <TotalsSection totalColor={colors.accent} />
        
        <div className="mt-8 pt-6 border-t border-surface-800 text-center">
          {notes && <p className="text-xs text-surface-400 mb-2">&gt; {notes}</p>}
          <p className="text-[10px] text-surface-600 animate-pulse">TRANSMISSION ENDED</p>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Premium Gold
  // ============================================
  if (templateId === 'premium-gold') {
    return (
      <div className="bg-[#fffdf8] rounded-none shadow-2xl border-[8px] overflow-hidden p-10 relative" style={{ borderColor: colors.primary, fontFamily: 'serif' }}>
        {/* Decorative Corner Elements */}
        <div className="absolute top-2 left-2 w-16 h-16 border-t-2 border-l-2" style={{ borderColor: colors.accent }} />
        <div className="absolute top-2 right-2 w-16 h-16 border-t-2 border-r-2" style={{ borderColor: colors.accent }} />
        <div className="absolute bottom-2 left-2 w-16 h-16 border-b-2 border-l-2" style={{ borderColor: colors.accent }} />
        <div className="absolute bottom-2 right-2 w-16 h-16 border-b-2 border-r-2" style={{ borderColor: colors.accent }} />

        <div className="text-center mb-12 relative z-10">
          {user?.logo_url ? (
            <img src={user.logo_url} alt="Logo" className="h-20 mx-auto object-contain mb-4" />
          ) : (
            <div className="h-16 w-16 mx-auto rounded-full mb-4 border-2 flex items-center justify-center" style={{ borderColor: colors.primary }}>
              <span className="text-2xl font-bold" style={{ color: colors.primary }}>{user?.business_name?.[0] || 'G'}</span>
            </div>
          )}
          <h1 className="text-4xl font-bold tracking-widest uppercase" style={{ color: colors.primaryDark }}>{user?.business_name || 'ROYAL BUSINESS'}</h1>
          <p className="text-sm mt-2 font-serif italic" style={{ color: colors.primary }}>Excellence & Precision</p>
          
          <div className="my-6 flex items-center justify-center gap-4">
            <div className="h-px w-24" style={{ background: colors.accent }} />
            <span className="text-2xl font-light tracking-widest" style={{ color: colors.primary }}>INVOICE</span>
            <div className="h-px w-24" style={{ background: colors.accent }} />
          </div>
        </div>

        <div className="flex justify-between items-start mb-12 px-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: colors.primary }}>Prepared For</p>
            <p className="text-xl font-semibold text-surface-900">{client?.name || 'Esteemed Client'}</p>
            {client?.address && <p className="text-sm text-surface-700">{client.address}</p>}
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase tracking-widest font-bold" style={{ color: colors.primary }}>Details</p>
            <p className="text-sm text-surface-900"><span className="text-surface-500">No:</span> {invoiceNumber || 'INV-GOLD-01'}</p>
            <p className="text-sm text-surface-900"><span className="text-surface-500">Date:</span> {today}</p>
            <p className="text-sm text-surface-900"><span className="text-surface-500">Due:</span> {dueDateFormatted}</p>
          </div>
        </div>

        <div className="mb-10 px-6">
          <div style={{ borderTop: `1px solid ${colors.primary}`, borderBottom: `1px solid ${colors.primary}` }} className="py-2 mb-4 flex text-xs tracking-widest uppercase font-bold text-surface-900">
            <div className="w-12 text-center">#</div>
            <div className="flex-1">Description</div>
            <div className="w-20 text-center">Qty</div>
            <div className="w-24 text-right">Rate</div>
            <div className="w-32 text-right">Amount</div>
          </div>
          <div className="space-y-4">
            {filteredItems.length === 0 ? (
              <p className="text-center py-4 text-surface-400 italic">No items added</p>
            ) : (
              filteredItems.map((item, idx) => {
                const qty = parseFloat(item.quantity) || 0;
                const rate = parseFloat(item.rate) || 0;
                const amount = qty * rate;
                return (
                  <div key={idx} className="flex text-sm text-surface-800 items-center">
                    <div className="w-12 text-center text-surface-400 font-serif italic">{idx + 1}</div>
                    <div className="flex-1 font-medium">{item.description || '—'}</div>
                    <div className="w-20 text-center">{qty || '—'}</div>
                    <div className="w-24 text-right">{rate ? formatINR(rate) : '—'}</div>
                    <div className="w-32 text-right font-bold">{amount ? formatINR(amount) : '—'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="px-6 mb-12">
          <TotalsSection totalColor={colors.primaryDark} />
        </div>

        <div className="px-6">
          <FooterSection borderCol={colors.accent} footerText="An exclusive service experience." />
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Premium Glass
  // ============================================
  if (templateId === 'premium-glass') {
    return (
      <div className="relative rounded-3xl overflow-hidden p-8 shadow-2xl" style={{ background: colors.headerBg }}>
        {/* Background Blur Overlay */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl z-0" />
        
        {/* Floating Shapes */}
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full mix-blend-overlay filter blur-3xl opacity-60 z-0" style={{ background: colors.primary }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 rounded-full mix-blend-overlay filter blur-3xl opacity-60 z-0" style={{ background: colors.accent }} />

        <div className="relative z-10 space-y-8">
          {/* Header Card */}
          <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex justify-between items-center">
            <div className="flex items-center gap-4">
              {user?.logo_url ? (
                <div className="bg-white/80 p-2 rounded-xl shadow-sm backdrop-blur-sm border border-white/50">
                  <img src={user.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm" style={{ backgroundImage: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                  <span className="text-xl font-bold text-white">{user?.business_name?.[0] || 'G'}</span>
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-surface-900 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${colors.primaryDark}, ${colors.primary})` }}>
                  {user?.business_name || 'Glassmorphism Inc.'}
                </h1>
                {user?.email && <p className="text-xs text-surface-700/80 mt-1">{user.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-black text-surface-900/10 tracking-widest uppercase">Invoice</h2>
              <p className="text-lg font-bold text-surface-900 mt-[-10px]">{invoiceNumber || '#GLS-001'}</p>
            </div>
          </div>

          {/* Details Row */}
          <div className="flex gap-6">
            <div className="flex-1 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <p className="text-xs font-bold uppercase tracking-wider text-surface-500 mb-2">Billed To</p>
              <p className="text-lg font-bold text-surface-900">{client?.name || 'Client Name'}</p>
              {client?.email && <p className="text-sm text-surface-700 mt-1">{client.email}</p>}
              {client?.address && <p className="text-sm text-surface-700 mt-1">{client.address}</p>}
            </div>
            <div className="w-1/3 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col justify-center space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-surface-500">Date</span>
                <span className="text-sm font-bold text-surface-900">{today}</span>
              </div>
              <div className="h-px w-full bg-white/50" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-surface-500">Due</span>
                <span className="text-sm font-bold text-surface-900">{dueDateFormatted}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] overflow-hidden">
             <ItemsTable headerBg="rgba(255,255,255,0.4)" headerText={colors.primaryDark} stripeBg="rgba(255,255,255,0.2)" borderCol="rgba(255,255,255,0.1)" />
          </div>

          {/* Totals & Footer */}
          <div className="bg-white/70 backdrop-blur-lg border border-white/50 rounded-2xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            <TotalsSection totalColor={colors.primaryDark} />
            <div className="mt-6 pt-4 border-t border-white/50">
              <FooterSection borderCol="transparent" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Premium Corporate
  // ============================================
  if (templateId === 'premium-corporate') {
    return (
      <div className="bg-white rounded-lg shadow-2xl border border-surface-200 flex flex-col h-full relative overflow-hidden">
        {/* Top Accent Bar */}
        <div className="h-3 w-full" style={{ background: colors.headerBg }} />

        <div className="flex flex-1">
          {/* Left Sidebar */}
          <div className="w-1/3 bg-surface-50 border-r border-surface-200 p-8 flex flex-col justify-between">
            <div>
              {user?.logo_url ? (
                <img src={user.logo_url} alt="Logo" className="w-24 h-24 object-contain mb-8 rounded shadow-sm bg-white p-2" />
              ) : (
                <div className="w-16 h-16 rounded mb-8 bg-surface-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-surface-500">{user?.business_name?.[0] || 'C'}</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">From</h3>
                  <p className="font-bold text-surface-900">{user?.business_name || 'Corporate Entity'}</p>
                  {user?.business_address && <p className="text-sm text-surface-600 mt-1 whitespace-pre-wrap">{user.business_address}</p>}
                  {user?.phone && <p className="text-sm text-surface-600 mt-1">{user.phone}</p>}
                  {user?.email && <p className="text-sm text-surface-600 mt-1">{user.email}</p>}
                  {user?.gstin && <p className="text-sm font-medium mt-2 py-1 px-2 bg-white border border-surface-200 rounded inline-block">GST: {user.gstin}</p>}
                </div>

                <div className="h-px bg-surface-200 w-full" />

                <div>
                  <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-1">Payment Info</h3>
                  {user?.upi_id && (
                     <div className="mt-2 bg-white p-3 rounded-lg border border-surface-200 text-center">
                       <QRCode
                          value={`upi://pay?pa=${user.upi_id}&pn=${encodeURIComponent(user.business_name || user.name)}&am=${total.toFixed(2)}&cu=INR`}
                          size={80}
                          level="M"
                          className="mx-auto mb-2"
                        />
                        <p className="text-[10px] font-bold text-surface-700">UPI: {user.upi_id}</p>
                     </div>
                  )}
                  {user?.razorpay_account_id && !user?.upi_id && (
                    <p className="text-sm text-surface-700 mt-1">Online Payment Available via Link</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 p-8 bg-white flex flex-col">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-5xl font-black text-surface-900 tracking-tight uppercase">Invoice</h1>
                <p className="text-lg text-surface-500 font-medium mt-1">{invoiceNumber || 'CORP-0001'}</p>
              </div>
              <div className="text-right space-y-1">
                <div className="flex justify-end gap-4">
                  <span className="text-surface-500 font-medium w-16">Date:</span>
                  <span className="font-bold text-surface-900 w-24">{today}</span>
                </div>
                <div className="flex justify-end gap-4">
                  <span className="text-surface-500 font-medium w-16">Due:</span>
                  <span className="font-bold text-surface-900 w-24">{dueDateFormatted}</span>
                </div>
              </div>
            </div>

            <div className="mb-10 p-5 rounded-lg border border-surface-100" style={{ background: `${colors.primary}08` }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: colors.primary }}>Billed To</h3>
              <p className="text-xl font-bold text-surface-900">{client?.name || 'Client Name'}</p>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  {client?.address && <p className="text-sm text-surface-700">{client.address}</p>}
                </div>
                <div className="text-right">
                  {client?.email && <p className="text-sm text-surface-700">{client.email}</p>}
                  {client?.phone && <p className="text-sm text-surface-700">{client.phone}</p>}
                  {client?.gstin && <p className="text-sm font-medium mt-1">GST: {client.gstin}</p>}
                </div>
              </div>
            </div>

            <div className="flex-1">
               <ItemsTable headerBg={colors.primary} headerText="#ffffff" stripeBg="#f8fafc" />
            </div>

            <div className="mt-8 border-t-2 border-surface-900 pt-6">
              <TotalsSection totalColor={colors.primaryDark} />
            </div>

            {(notes || termsConditions) && (
              <div className="mt-8 pt-6 border-t border-surface-200">
                {notes && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-surface-900 uppercase mb-1">Notes</p>
                    <p className="text-sm text-surface-600">{notes}</p>
                  </div>
                )}
                {termsConditions && (
                  <div>
                    <p className="text-xs font-bold text-surface-900 uppercase mb-1">Terms</p>
                    <p className="text-xs text-surface-500 leading-relaxed">{termsConditions}</p>
                  </div>
                )}
              </div>
            )}
            
            {user?.signature_url && (
              <div className="mt-8 flex justify-end">
                <div className="text-center w-40">
                  <img src={user.signature_url} alt="Signature" className="h-16 mx-auto object-contain border-b border-surface-300 pb-2 mb-2" />
                  <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Authorized Signatory</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Premium Ocean Wave
  // ============================================
  if (templateId === 'premium-wave') {
    return (
      <div className="bg-white rounded-xl shadow-2xl border border-surface-200 flex flex-col h-full relative overflow-hidden">
        {/* Header with Wave */}
        <div style={{ background: colors.primary }} className="px-8 pt-8 pb-2 text-white relative z-10 flex justify-between items-start">
          <div className="w-2/3">
             {user?.logo_url ? (
                <img src={user.logo_url} alt="Logo" className="w-auto h-20 object-contain mb-4 bg-white/20 p-2 rounded-lg backdrop-blur-sm" />
              ) : (
                <h2 className="text-3xl font-black mb-2 tracking-tight">{user?.business_name || 'Your Company'}</h2>
              )}
              <p className="text-white/80 text-sm whitespace-pre-wrap max-w-sm">{user?.business_address}</p>
              <div className="flex gap-4 mt-3 text-sm text-white/90">
                {user?.phone && <span>📞 {user.phone}</span>}
                {user?.email && <span>✉️ {user.email}</span>}
              </div>
          </div>
          <div className="text-right">
             <h1 className="text-5xl font-black tracking-widest uppercase opacity-90">Invoice</h1>
             <p className="text-xl font-medium mt-2">{invoiceNumber || 'WAVE-0001'}</p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-16 block -mt-1 relative z-0" preserveAspectRatio="none">
          <path fill={colors.primary} fillOpacity="1" d="M0,160L48,170.7C96,181,192,203,288,202.7C384,203,480,181,576,144C672,107,768,53,864,42.7C960,32,1056,64,1152,90.7C1248,117,1344,139,1392,149.3L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
        </svg>

        {/* Content Body */}
        <div className="flex-1 p-8 pt-4 flex flex-col relative z-10">
          <div className="flex justify-between items-start mb-8 bg-surface-50 p-6 rounded-2xl border border-surface-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/0 to-surface-200/50 rounded-bl-full pointer-events-none" />
             <div>
               <h3 className="text-sm font-bold text-surface-400 uppercase tracking-widest mb-2" style={{ color: colors.primary }}>Bill To</h3>
               <p className="text-2xl font-bold text-surface-900">{client?.name || 'Client Name'}</p>
               {client?.address && <p className="text-sm text-surface-600 mt-2 max-w-xs">{client.address}</p>}
               {client?.email && <p className="text-sm text-surface-600 mt-1">{client.email}</p>}
             </div>
             <div className="text-right space-y-2 relative z-10">
                <div className="flex justify-end gap-6">
                  <span className="text-surface-500 font-medium">Date</span>
                  <span className="font-bold text-surface-900 w-24">{today}</span>
                </div>
                <div className="flex justify-end gap-6">
                  <span className="text-surface-500 font-medium">Due</span>
                  <span className="font-bold text-surface-900 w-24">{dueDateFormatted}</span>
                </div>
                {client?.gstin && <p className="text-sm font-bold mt-2 pt-2 border-t border-surface-200">GST: {client.gstin}</p>}
             </div>
          </div>

          <div className="flex-1 mb-8">
             <ItemsTable headerBg={colors.primaryLight + '20'} headerText={colors.primaryDark} borderCol={colors.primaryLight + '30'} stripeBg="transparent" />
          </div>

          <div className="grid grid-cols-2 gap-8 items-end mb-8">
            <div>
              {user?.upi_id && (
                <div className="bg-surface-50 p-4 rounded-2xl border border-surface-200 inline-block">
                  <QRCode value={`upi://pay?pa=${user.upi_id}&pn=${encodeURIComponent(user.business_name || user.name)}&am=${total.toFixed(2)}&cu=INR`} size={70} className="mb-2" />
                  <p className="text-[10px] text-center font-bold text-surface-500">Scan to Pay</p>
                </div>
              )}
            </div>
            <div className="bg-surface-50 p-6 rounded-3xl border border-surface-200">
              <TotalsSection totalColor={colors.primary} />
            </div>
          </div>
        </div>

        {/* Footer with Wave */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-12 block mt-auto relative z-0" preserveAspectRatio="none">
          <path fill={colors.primaryDark} fillOpacity="1" d="M0,160L48,149.3C96,139,192,117,288,128C384,139,480,181,576,170.7C672,160,768,96,864,96C960,96,1056,160,1152,181.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
        <div style={{ background: colors.primaryDark }} className="px-8 pb-6 pt-2 text-white relative z-10 flex justify-between items-end">
           <div className="text-white/70 text-xs w-2/3 pr-8">
              {notes && <p className="mb-1"><strong className="text-white">Notes:</strong> {notes}</p>}
              {termsConditions && <p><strong className="text-white">Terms:</strong> {termsConditions}</p>}
           </div>
           {user?.signature_url && (
              <div className="text-center">
                 <img src={user.signature_url} alt="Signature" className="h-12 mx-auto object-contain brightness-0 invert opacity-80 mb-1" />
                 <p className="text-[9px] font-bold uppercase tracking-widest text-white/50 border-t border-white/20 pt-1">Authorized Signatory</p>
              </div>
           )}
        </div>
      </div>
    );
  }

  // ============================================
  // TEMPLATE: Premium Retro Pop
  // ============================================
  if (templateId === 'premium-retro') {
    return (
      <div className="bg-[#fff9e6] rounded-none border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col min-h-full relative m-2 mt-4 mb-4">
        {/* Retro Header */}
        <div className="border-b-4 border-black p-6 pt-8 pb-10 flex justify-between items-start relative" style={{ background: colors.accent }}>
          {/* Halftone dot pattern overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2px)', backgroundSize: '12px 12px' }} />
          
          <div className="relative z-10">
            <div className="inline-block bg-white border-4 border-black px-4 py-2 transform -rotate-2 origin-bottom-left mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {user?.logo_url ? (
                <img src={user.logo_url} alt="Logo" className="w-auto h-12 object-contain" />
              ) : (
                <h2 className="text-2xl font-black uppercase tracking-tighter" style={{ color: colors.primary }}>{user?.business_name || 'VAPORWAVE LLC'}</h2>
              )}
            </div>
            <p className="font-bold text-black border-l-4 border-black pl-3">{user?.business_address}</p>
            <p className="font-bold text-black border-l-4 border-black pl-3 mt-1">{user?.email} | {user?.phone}</p>
          </div>
          
          <div className="relative z-10 text-right transform rotate-2 origin-top-right bg-[#ffeb3b] border-4 border-black px-6 py-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mr-4 mt-2">
             <h1 className="text-4xl font-black uppercase tracking-widest text-black">INVOICE</h1>
             <p className="text-xl font-bold text-black mt-1"># {invoiceNumber || 'RTR-01'}</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex gap-6 mb-6">
            <div className="flex-1 bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
               <div className="absolute -top-4 -left-4 bg-[#ff5722] border-4 border-black text-white font-black uppercase px-3 py-1 transform -rotate-3 text-sm">Billed To</div>
               <p className="text-2xl font-black text-black uppercase">{client?.name || 'COOL CLIENT'}</p>
               {client?.address && <p className="font-bold text-black mt-2">{client.address}</p>}
               {client?.email && <p className="font-bold text-black mt-1">{client.email}</p>}
            </div>
            <div className="w-1/3 space-y-4">
              <div className="bg-[#4caf50] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center text-white">
                 <span className="font-black uppercase">Date</span>
                 <span className="font-bold bg-white text-black px-2 py-1 border-2 border-black whitespace-nowrap">{today}</span>
              </div>
              <div className="bg-[#e91e63] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center text-white">
                 <span className="font-black uppercase">Due</span>
                 <span className="font-bold bg-white text-black px-2 py-1 border-2 border-black whitespace-nowrap">{dueDateFormatted}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 mb-6 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
             {/* Retro Table Header */}
             <div className="flex font-black uppercase border-b-4 border-black text-black" style={{ background: colors.primaryLight }}>
               <div className="w-16 p-3 border-r-4 border-black text-center">#</div>
               <div className="flex-1 p-3 border-r-4 border-black">Description</div>
               <div className="w-20 p-3 border-r-4 border-black text-center">Qty</div>
               <div className="w-32 p-3 border-r-4 border-black text-right">Rate</div>
               <div className="w-32 p-3 text-right">Amount</div>
             </div>
             {/* Table Rows */}
             {items.map((item, index) => (
                <div key={index} className="flex font-bold text-black border-b-4 border-black last:border-b-0" style={{ background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.05)' }}>
                  <div className="w-16 p-3 border-r-4 border-black text-center">{index + 1}</div>
                  <div className="flex-1 p-3 border-r-4 border-black">
                     <p>{item.description || 'Item Description'}</p>
                  </div>
                  <div className="w-20 p-3 border-r-4 border-black text-center">{item.quantity}</div>
                  <div className="w-32 p-3 border-r-4 border-black text-right">₹{Number(item.rate).toFixed(2)}</div>
                  <div className="w-32 p-3 text-right">₹{(item.quantity * item.rate).toFixed(2)}</div>
                </div>
             ))}
          </div>

          <div className="flex gap-6 items-start">
             <div className="flex-1 space-y-4">
               {notes && (
                  <div className="bg-[#00bcd4] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                     <p className="font-black uppercase mb-1 border-b-2 border-black inline-block">NOTES</p>
                     <p className="font-bold">{notes}</p>
                  </div>
               )}
               {user?.upi_id && (
                  <div className="bg-white border-4 border-black p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block">
                     <p className="font-black uppercase mb-2 text-center">SCAN 2 PAY</p>
                     <div className="border-4 border-black inline-block p-1 bg-white">
                        <QRCode value={`upi://pay?pa=${user.upi_id}&pn=${encodeURIComponent(user.business_name || user.name)}&am=${total.toFixed(2)}&cu=INR`} size={80} />
                     </div>
                  </div>
               )}
             </div>
             <div className="w-[320px] bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex justify-between font-black text-black uppercase border-b-4 border-black p-3">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between font-black text-black uppercase border-b-4 border-black p-3 text-[#e91e63]">
                    <span>Discount</span>
                    <span>-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-black uppercase border-b-4 border-black p-3 text-surface-600">
                  <span>GST ({gstRate}%)</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                {shippingCharges > 0 && (
                  <div className="flex justify-between font-black text-black uppercase border-b-4 border-black p-3">
                    <span>Shipping</span>
                    <span>₹{Number(shippingCharges).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-white uppercase p-4 text-xl" style={{ background: colors.primaryDark }}>
                  <span>TOTAL</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-4 border-black p-4 flex justify-between items-center text-black font-bold uppercase text-xs" style={{ background: colors.primary }}>
           <p>© {new Date().getFullYear()} {user?.business_name || 'VAPORWAVE LLC'}. THANK YOU FOR YOUR BUSINESS.</p>
           {user?.signature_url && (
              <div className="text-right bg-white border-4 border-black p-2 transform rotate-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                 <img src={user.signature_url} alt="Signature" className="h-8 object-contain mb-1" />
                 <p className="text-[8px] font-black tracking-widest">AUTHORIZED</p>
              </div>
           )}
        </div>
      </div>
    );
  }

  // Fallback — Classic
};

export default InvoicePreview;
