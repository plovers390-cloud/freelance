import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import InvoicePreview from '../components/InvoicePreview';
import TemplateSelector from '../components/TemplateSelector';
import { getStoredPrefs, savePrefs, getTemplateById, getThemeById } from '../utils/invoiceTemplates';
import {
  HiOutlinePlusCircle,
  HiOutlineTrash,
  HiOutlineDocumentCheck,
  HiOutlineReceiptPercent,
  HiOutlineTruck,
  HiOutlineSwatch,
} from 'react-icons/hi2';

const GST_OPTIONS = [
  { value: 0,  label: 'No GST (0%)' },
  { value: 5,  label: 'GST 5%' },
  { value: 12, label: 'GST 12%' },
  { value: 18, label: 'GST 18%' },
  { value: 28, label: 'GST 28%' },
];

const emptyItem = { description: '', quantity: '', rate: '' };

const CreateInvoice = () => {
  const navigate = useNavigate();

  // Clients dropdown
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const { user } = useAuth();
  
  // Form state (with localStorage draft support)
  const draftStr = localStorage.getItem('invoice_draft');
  const draft = draftStr ? JSON.parse(draftStr) : null;

  const getDefaultDueDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  };

  const [selectedClientId, setSelectedClientId] = useState(draft?.selectedClientId ?? '');
  const [dueDate, setDueDate] = useState(draft?.dueDate ?? getDefaultDueDate());
  const [gstRate, setGstRate] = useState(draft?.gstRate ?? 18);
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [termsConditions, setTermsConditions] = useState(draft?.termsConditions ?? user?.terms_conditions ?? '');
  const [items, setItems] = useState(draft?.items ?? [{ ...emptyItem }]);

  // Discount & Shipping
  const [discountType, setDiscountType] = useState(draft?.discountType ?? 'flat');
  const [discountValue, setDiscountValue] = useState(draft?.discountValue ?? '');
  const [shippingCharges, setShippingCharges] = useState(draft?.shippingCharges ?? '');

  // Template & Theme
  const [templateId, setTemplateId] = useState('classic');
  const [themeId, setThemeId] = useState('ocean-blue');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Submit state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load saved template preferences
  useEffect(() => {
    const prefs = getStoredPrefs();
    setTemplateId(prefs.templateId);
    setThemeId(prefs.themeId);
  }, []);

  // Fetch clients & products on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await api.get('/clients');
        setClients(clientsRes.data.clients);
      } catch {
        setError('Could not load data.');
      } finally {
        setClientsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Save draft whenever form state changes
  useEffect(() => {
    const draft = {
      selectedClientId,
      dueDate,
      gstRate,
      notes,
      termsConditions,
      items,
      discountType,
      discountValue,
      shippingCharges,
    };
    localStorage.setItem('invoice_draft', JSON.stringify(draft));
  }, [selectedClientId, dueDate, gstRate, notes, termsConditions, items, discountType, discountValue, shippingCharges]);

  // Selected client object for preview
  const selectedClient = clients.find((c) => c.id === parseInt(selectedClientId));

  // ---- Item handlers ----
  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { ...emptyItem }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate item amount
  const getItemAmount = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    return qty * rate;
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + getItemAmount(item), 0);
  const discountVal = parseFloat(discountValue) || 0;
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal * discountVal / 100, subtotal)
    : Math.min(discountVal, subtotal);
  const gstAmount = subtotal * (parseFloat(gstRate) || 0) / 100;
  const shipAmount = parseFloat(shippingCharges) || 0;
  const total = (subtotal - discountAmount) + gstAmount + shipAmount;

  const formatINR = (val) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // ---- Submit ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!selectedClientId) { setError('Please select a client.'); return; }
    if (!dueDate) { setError('Please select a due date.'); return; }

    const validItems = items.filter((i) => i.description.trim() && parseFloat(i.quantity) > 0 && parseFloat(i.rate) >= 0);
    if (validItems.length === 0) { setError('Add at least one item with description, quantity, and rate.'); return; }

    setLoading(true);
    try {
      const res = await api.post('/invoices/create', {
        client_id: parseInt(selectedClientId),
        due_date: dueDate,
        gst_rate: parseFloat(gstRate) || 0,
        discount_type: discountType,
        discount_value: discountVal > 0 ? discountVal : 0,
        shipping_charges: shipAmount > 0 ? shipAmount : 0,
        notes: notes || undefined,
        template_id: templateId,
        theme_id: themeId,
        terms_conditions: termsConditions,
        items: validItems.map((i) => ({
          description: i.description.trim(),
          quantity: parseFloat(i.quantity),
          rate: parseFloat(i.rate),
        })),
      });
      localStorage.removeItem('invoice_draft');
      navigate(`/invoices/${res.data.invoice.id}`);
    } catch (err) {
      if (err.response?.data?.upgrade) {
        setError({ message: err.response.data.error, upgrade: true });
      } else {
        setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Could not create invoice.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-surface-900">Create Invoice</h1>
        <p className="text-surface-700/60 mt-1">Fill in the details and preview before saving</p>
      </div>

      {error && typeof error === 'object' && error.upgrade ? (
        <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl text-center">
          <p className="text-primary-800 font-semibold mb-2">{error.message}</p>
          <button
            onClick={() => navigate('/pricing')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-medium rounded-lg shadow-lg hover:from-accent-600 hover:to-accent-700 transition-colors"
          >
            Upgrade to Pro
          </button>
        </div>
      ) : error ? (
        <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">
          {typeof error === 'string' ? error : error.message || 'An error occurred'}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* ---- LEFT: Form (3/5) ---- */}
        <div className="xl:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client + Due Date row */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Invoice Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client dropdown */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Client *</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">
                      {clientsLoading ? 'Loading clients...' : 'Select a client'}
                    </option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Due Date *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* GST Rate */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">GST Rate (%)</label>
                  <input
                    list="gst-options"
                    type="number"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    min="0"
                    max="100"
                    step="any"
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                  <datalist id="gst-options">
                    {GST_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </datalist>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thank you note..."
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                </div>

                {/* Terms & Conditions */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">Terms & Conditions</label>
                  <textarea
                    value={termsConditions}
                    onChange={(e) => setTermsConditions(e.target.value)}
                    rows={3}
                    placeholder="E.g. Payment is due within 15 days."
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="glass-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider">Line Items</h2>
                
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <HiOutlinePlusCircle className="w-5 h-5" />
                    Add Item
                  </button>
                </div>
              </div>

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-3 mb-2 px-1">
                <div className="col-span-5 text-xs font-semibold text-surface-700/50 uppercase tracking-wider">Description</div>
                <div className="col-span-2 text-xs font-semibold text-surface-700/50 uppercase tracking-wider">Qty</div>
                <div className="col-span-2 text-xs font-semibold text-surface-700/50 uppercase tracking-wider">Rate (₹)</div>
                <div className="col-span-2 text-xs font-semibold text-surface-700/50 uppercase tracking-wider text-right">Amount</div>
                <div className="col-span-1"></div>
              </div>

              {/* Item Rows */}
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl bg-surface-50 border border-surface-200/60">
                    <div className="col-span-12 md:col-span-5">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Item description"
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        min="0.01"
                        step="any"
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, 'rate', e.target.value)}
                        placeholder="Rate"
                        min="0"
                        step="any"
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm"
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 text-right">
                      <p className="text-sm font-semibold text-surface-900">
                        {getItemAmount(item) > 0 ? formatINR(getItemAmount(item)) : '—'}
                      </p>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-surface-700/30 hover:text-danger-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item button (bottom) */}
              <button
                type="button"
                onClick={addItem}
                className="mt-3 w-full py-2.5 border-2 border-dashed border-surface-200 rounded-xl text-sm font-medium text-surface-700/40 hover:border-primary-300 hover:text-primary-600 transition-colors cursor-pointer"
              >
                + Add another item
              </button>
            </div>

            {/* Discount & Shipping */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Adjustments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Discount */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <HiOutlineReceiptPercent className="w-4 h-4 text-primary-500" />
                      Discount
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="px-3 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors appearance-none cursor-pointer w-28 flex-shrink-0"
                    >
                      <option value="flat">Flat (₹)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                    <input
                      type="number"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 500'}
                      min="0"
                      step="any"
                      className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                    />
                  </div>
                  {discountAmount > 0 && (
                    <p className="text-xs text-danger-600 mt-1.5 font-medium">−{formatINR(discountAmount)} discount applied</p>
                  )}
                </div>

                {/* Shipping */}
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <HiOutlineTruck className="w-4 h-4 text-primary-500" />
                      Shipping Charges (₹)
                    </span>
                  </label>
                  <input
                    type="number"
                    value={shippingCharges}
                    onChange={(e) => setShippingCharges(e.target.value)}
                    placeholder="e.g. 200"
                    min="0"
                    step="any"
                    className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Totals Summary (mobile) */}
            <div className="glass-card p-6 xl:hidden">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-700/60">Subtotal</span>
                  <span className="font-medium text-surface-900">{formatINR(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-700/60">Discount{discountType === 'percent' ? ` (${discountVal}%)` : ''}</span>
                    <span className="font-medium text-danger-600">−{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-surface-700/60">GST ({gstRate}%)</span>
                  <span className="font-medium text-surface-900">{formatINR(gstAmount)}</span>
                </div>
                {shipAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-surface-700/60">Shipping</span>
                    <span className="font-medium text-surface-900">{formatINR(shipAmount)}</span>
                  </div>
                )}
                <div className="h-px bg-surface-200" />
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-primary-700">Total</span>
                  <span className="font-bold text-primary-700">{formatINR(total)}</span>
                </div>
              </div>
            </div>

            {/* Mobile Template Selector Button */}
            <div className="xl:hidden flex justify-center mb-6">
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer px-4 py-2 rounded-lg bg-primary-50 hover:bg-primary-100"
              >
                <HiOutlineSwatch className="w-4 h-4" />
                Change Template ({getTemplateById(templateId).name} • {getThemeById(themeId).emoji})
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Invoice...
                </>
              ) : (
                <>
                  <HiOutlineDocumentCheck className="w-5 h-5" />
                  Create Invoice
                </>
              )}
            </button>
          </form>
        </div>

        {/* ---- RIGHT: Live Preview (2/5) ---- */}
        <div className="xl:col-span-2 hidden xl:block">
          <div className="sticky top-8">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-surface-700/40 uppercase tracking-wider">Live Preview</p>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100"
              >
                <HiOutlineSwatch className="w-4 h-4" />
                {getTemplateById(templateId).icon} {getTemplateById(templateId).name} • {getThemeById(themeId).emoji}
              </button>
            </div>
            <InvoicePreview
              client={selectedClient}
              items={items}
              gstRate={gstRate}
              dueDate={dueDate}
              notes={notes}
              termsConditions={termsConditions}
              discountType={discountType}
              discountValue={discountValue}
              shippingCharges={shippingCharges}
              templateId={templateId}
              themeId={themeId}
            />
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        currentTemplateId={templateId}
        currentThemeId={themeId}
        onApply={(tId, cId) => {
          setTemplateId(tId);
          setThemeId(cId);
          savePrefs(tId, cId);
        }}
      />
    </div>
  );
};

export default CreateInvoice;
