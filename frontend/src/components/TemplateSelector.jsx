import { useState, useEffect } from 'react';
import { TEMPLATES, THEMES, getThemeById, getTemplateById } from '../utils/invoiceTemplates';
import { HiOutlineXMark, HiOutlineCheck, HiOutlineSparkles, HiLockClosed } from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

const TemplateSelector = ({ isOpen, onClose, currentTemplateId, currentThemeId, onApply }) => {
  const { user, updateUser } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplateId || 'classic');
  const [selectedTheme, setSelectedTheme] = useState(currentThemeId || 'ocean-blue');
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(currentTemplateId || 'classic');
      setSelectedTheme(currentThemeId || 'ocean-blue');
      setError('');
    }
  }, [isOpen, currentTemplateId, currentThemeId]);

  if (!isOpen) return null;

  const activeTheme = getThemeById(selectedTheme);
  const activeTemplateDef = getTemplateById(selectedTemplate);

  const unlockedTemplates = user?.unlocked_templates || [];
  const isTemplateUnlocked = !activeTemplateDef.isPremium || unlockedTemplates.includes(selectedTemplate);

  const handleApply = () => {
    onApply(selectedTemplate, selectedTheme);
    onClose();
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    setError('');
    try {
      // 1. Create template order
      const { data } = await api.post('/payments/create-template-order', { template_id: selectedTemplate });
      const { order, razorpay_key } = data;

      // 2. Load Razorpay script if not present
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // 3. Open Razorpay checkout
      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: 'Freelance',
        description: `Unlock ${activeTemplateDef.name} Template`,
        order_id: order.id,
        handler: async (response) => {
          try {
            setPurchasing(true);
            const verifyRes = await api.post('/payments/verify-template', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              template_id: selectedTemplate,
            });
            
            if (verifyRes.data.message) {
              // Update local user state
              const updatedTemplates = [...unlockedTemplates, selectedTemplate];
              updateUser({ ...user, unlocked_templates: updatedTemplates });
            }
          } catch (err) {
            setError(err.response?.data?.error || 'Payment verification failed.');
          } finally {
            setPurchasing(false);
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone || '',
        },
        theme: {
          color: activeTheme.colors.primary,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
        setError(response.error.description || 'Payment failed.');
        setPurchasing(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not initiate checkout.');
      setPurchasing(false);
    }
  };

  // Mini preview for each template card
  const MiniPreview = ({ templateId }) => {
    const theme = activeTheme;
    const isSelected = selectedTemplate === templateId;

    const previewStyles = {
      classic: (
        <div className="template-mini-preview">
          <div style={{ background: theme.colors.headerBg, height: '18px', borderRadius: '4px 4px 0 0' }} />
          <div className="p-1.5 space-y-1">
            <div className="flex gap-1">
              <div className="h-1.5 rounded-full bg-surface-200 flex-1" />
              <div className="h-1.5 rounded-full bg-surface-200 w-6" />
            </div>
            <div style={{ background: theme.colors.tableBg, height: '16px', borderRadius: '2px' }} />
            <div className="flex justify-end">
              <div className="h-2 w-8 rounded-sm" style={{ background: theme.colors.primary }} />
            </div>
          </div>
        </div>
      ),
      'modern-minimal': (
        <div className="template-mini-preview flex">
          <div style={{ background: theme.colors.primary, width: '4px', borderRadius: '4px 0 0 4px' }} />
          <div className="p-1.5 space-y-1 flex-1">
            <div className="h-2 rounded-full w-10" style={{ background: theme.colors.primary, opacity: 0.2 }} />
            <div className="flex gap-1">
              <div className="h-1.5 rounded-full bg-surface-200 flex-1" />
              <div className="h-1.5 rounded-full bg-surface-200 w-4" />
            </div>
            <div style={{ borderTop: `1px solid ${theme.colors.borderColor}`, height: '12px', marginTop: '2px' }} />
            <div className="flex justify-end">
              <div className="h-2 w-8 rounded-sm" style={{ background: theme.colors.primary }} />
            </div>
          </div>
        </div>
      ),
      bold: (
        <div className="template-mini-preview">
          <div style={{ background: theme.colors.headerBg, height: '26px', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="h-2 w-12 rounded-sm bg-white/30" />
          </div>
          <div className="p-1.5 space-y-1">
            <div style={{ background: theme.colors.tableBg, height: '14px', borderRadius: '2px' }} />
            <div className="h-px" style={{ background: theme.colors.primary }} />
            <div className="flex justify-end">
              <div className="h-2.5 w-10 rounded-sm" style={{ background: theme.colors.primary }} />
            </div>
          </div>
        </div>
      ),
      elegant: (
        <div className="template-mini-preview">
          <div style={{ borderTop: `3px solid ${theme.colors.primary}`, borderRadius: '4px 4px 0 0' }} />
          <div className="p-1.5 space-y-1">
            <div className="flex justify-between items-center">
              <div className="h-2 w-8 rounded-sm" style={{ background: theme.colors.primary, opacity: 0.15 }} />
              <div className="h-2.5 w-10 rounded-sm" style={{ color: theme.colors.primary, fontSize: '5px', fontWeight: 'bold', letterSpacing: '1px', opacity: 0.3 }}>INVOICE</div>
            </div>
            <div className="flex gap-1">
              <div className="h-1.5 rounded-full bg-surface-200 flex-1" />
              <div className="h-1.5 rounded-full bg-surface-200 w-4" />
            </div>
            <div style={{ background: theme.colors.tableBg, height: '12px', borderRadius: '2px' }} />
            <div className="flex justify-end">
              <div className="h-2 w-8 rounded-sm" style={{ background: theme.colors.primary }} />
            </div>
          </div>
          <div style={{ borderBottom: `3px solid ${theme.colors.primary}`, borderRadius: '0 0 4px 4px' }} />
        </div>
      ),
      compact: (
        <div className="template-mini-preview">
          <div className="p-1 space-y-0.5">
            <div className="flex justify-between">
              <div className="h-2 w-8 rounded-sm" style={{ background: theme.colors.primary }} />
              <div className="h-1.5 w-6 rounded-sm bg-surface-200" />
            </div>
            <div className="h-px bg-surface-200" />
            <div className="h-1 rounded-full bg-surface-200 w-full" />
            <div className="h-1 rounded-full bg-surface-200 w-3/4" />
            <div className="h-px bg-surface-200" />
            <div style={{ background: theme.colors.tableBg, height: '10px', borderRadius: '1px' }} />
            <div style={{ background: theme.colors.tableBg, height: '10px', borderRadius: '1px', opacity: 0.6 }} />
            <div className="h-px" style={{ background: theme.colors.primary }} />
            <div className="flex justify-end">
              <div className="h-1.5 w-6 rounded-sm" style={{ background: theme.colors.primary }} />
            </div>
          </div>
        </div>
      ),
      creative: (
        <div className="template-mini-preview overflow-hidden">
          <div className="relative" style={{ height: '22px' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: theme.colors.headerBg,
              clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)',
              borderRadius: '4px 4px 0 0'
            }} />
          </div>
          <div className="p-1.5 space-y-1">
            <div className="flex gap-1">
              <div className="h-1.5 rounded-full bg-surface-200 flex-1" />
              <div className="h-1.5 rounded-full" style={{ background: theme.colors.accent, width: '12px', opacity: 0.4 }} />
            </div>
            <div style={{ background: theme.colors.tableBg, height: '14px', borderRadius: '4px' }} />
            <div className="flex justify-end">
              <div className="h-2 w-8 rounded-full" style={{ background: theme.colors.headerBg }} />
            </div>
          </div>
        </div>
      ),
    };

    return previewStyles[templateId] || previewStyles.classic;
  };

  return (
    <div className="template-selector-overlay" onClick={onClose}>
      <div
        className="template-selector-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <HiOutlineSparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900">Choose Template</h2>
              <p className="text-xs text-surface-700/50">Pick a design & color for your invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-100 text-surface-700/40 hover:text-surface-700 transition-colors cursor-pointer"
          >
            <HiOutlineXMark className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="px-6 py-2 bg-danger-500/10 text-danger-600 text-sm text-center">
            {error}
          </div>
        )}

        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)]">
          {/* ---- Color Themes ---- */}
          <div>
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-3">Color Theme</h3>
            <div className="flex flex-wrap gap-2.5">
              {THEMES.map((theme) => {
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`theme-swatch group cursor-pointer ${isActive ? 'active' : ''}`}
                    title={theme.name}
                  >
                    <div
                      className="theme-swatch-color"
                      style={{ background: theme.colors.headerBg }}
                    >
                      {isActive && (
                        <HiOutlineCheck className="w-3.5 h-3.5 text-white drop-shadow-md" />
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-surface-700/70 mt-1 group-hover:text-surface-900 transition-colors">
                      {theme.emoji} {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Templates Grid ---- */}
          <div>
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-3">Template Design</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map((tpl) => {
                const isActive = selectedTemplate === tpl.id;
                const isPremiumLocked = tpl.isPremium && !unlockedTemplates.includes(tpl.id);

                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`template-card cursor-pointer relative ${isActive ? 'active' : ''} ${isPremiumLocked ? 'opacity-80' : ''}`}
                  >
                    {/* Badge */}
                    {tpl.badge && (
                      <span
                        className="template-badge"
                        style={{
                          background: tpl.isPremium ? '#eab308' : activeTheme.colors.primary,
                          color: '#fff',
                        }}
                      >
                        {tpl.badge}
                      </span>
                    )}

                    {/* Check icon */}
                    {isActive && (
                      <div
                        className="template-check"
                        style={{ background: activeTheme.colors.primary }}
                      >
                        <HiOutlineCheck className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Lock Overlay for Premium */}
                    {isPremiumLocked && (
                      <div className="absolute inset-0 z-10 bg-surface-900/10 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                         <div className="bg-surface-900/80 p-2 rounded-full shadow-lg">
                            <HiLockClosed className="w-4 h-4 text-white" />
                         </div>
                      </div>
                    )}

                    {/* Mini preview */}
                    <div className="template-preview-wrap">
                      <MiniPreview templateId={tpl.id} />
                    </div>

                    {/* Info */}
                    <div className="px-2 pb-2.5 pt-1.5">
                      <p className="text-xs font-semibold text-surface-900 flex items-center gap-1">
                        <span>{tpl.icon}</span> {tpl.name}
                      </p>
                      <p className="text-[10px] text-surface-700/50 mt-0.5 leading-tight">{tpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between bg-surface-50/50">
          <p className="text-xs text-surface-700/40">
            Using: <span className="font-medium text-surface-700/70">{activeTemplateDef.name}</span> •{' '}
            <span className="font-medium text-surface-700/70">{activeTheme.name}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-700/60 hover:text-surface-900 rounded-lg hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {!isTemplateUnlocked ? (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-lg transition-all hover:shadow-xl cursor-pointer flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {purchasing && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <HiLockClosed className="w-4 h-4" />
                Unlock for ₹{activeTemplateDef.price}
              </button>
            ) : (
              <button
                onClick={handleApply}
                className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-lg transition-all hover:shadow-xl cursor-pointer"
                style={{ background: activeTheme.colors.headerBg }}
              >
                Apply Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;

