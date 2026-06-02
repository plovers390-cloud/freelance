import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { TEMPLATES, THEMES, getStoredPrefs, savePrefs, getThemeById, getTemplateById } from '../utils/invoiceTemplates';
import InvoicePreview from '../components/InvoicePreview';
import {
  HiOutlineUser,
  HiOutlineBuildingOffice2,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlinePhoto,
  HiOutlineSwatch,
  HiOutlineCheck,
} from 'react-icons/hi2';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // ---- Profile form ----
  const [profile, setProfile] = useState({
    name: user?.name || '',
    business_name: user?.business_name || '',
    business_address: user?.business_address || '',
    gstin: user?.gstin || '',
    phone: user?.phone || '',
    terms_conditions: user?.terms_conditions || '',
    razorpay_account_id: user?.razorpay_account_id || '',
    upi_id: user?.upi_id || '',
  });
  const [avatar, setAvatar] = useState(null);
  const [logo, setLogo] = useState(null);
  const [signature, setSignature] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // ---- Password form ----
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const [templateId, setTemplateId] = useState('classic');
  const [themeId, setThemeId] = useState('ocean-blue');
  const [templateMsg, setTemplateMsg] = useState({ type: '', text: '' });
  const [purchasing, setPurchasing] = useState(false);

  // Load stored template prefs on mount
  useEffect(() => {
    const prefs = getStoredPrefs();
    setTemplateId(prefs.templateId);
    setThemeId(prefs.themeId);
  }, []);

  // ---- Profile submit ----
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });
    try {
      const formData = new FormData();
      Object.entries(profile).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (logo) formData.append('logo', logo);
      if (signature) formData.append('signature', signature);
      if (avatar) formData.append('avatar', avatar);

      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Could not update profile.' });
    } finally {
      setProfileLoading(false);
    }
  };

  // ---- Password submit ----
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (passwords.new_password !== passwords.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.put('/auth/change-password', {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Could not change password.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePurchase = async (targetTemplateId) => {
    setPurchasing(true);
    setTemplateMsg({ type: '', text: '' });
    try {
      const { data } = await api.post('/payments/create-template-order', { template_id: targetTemplateId });
      const { order, razorpay_key } = data;

      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const activeTheme = getThemeById(themeId);
      const targetTpl = getTemplateById(targetTemplateId);

      const options = {
        key: razorpay_key,
        amount: order.amount,
        currency: order.currency,
        name: 'Freelance',
        description: `Unlock ${targetTpl.name} Template`,
        order_id: order.id,
        handler: async (response) => {
          try {
            setPurchasing(true);
            const verifyRes = await api.post('/payments/verify-template', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              template_id: targetTemplateId,
            });
            
            if (verifyRes.data.message) {
              const unlockedTemplates = user?.unlocked_templates || [];
              const updatedTemplates = [...unlockedTemplates, targetTemplateId];
              updateUser({ ...user, unlocked_templates: updatedTemplates });
              setTemplateMsg({ type: 'success', text: 'Template unlocked successfully! You can now apply it.' });
            }
          } catch (err) {
            setTemplateMsg({ type: 'error', text: err.response?.data?.error || 'Payment verification failed.' });
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
        setTemplateMsg({ type: 'error', text: response.error.description || 'Payment failed.' });
        setPurchasing(false);
      });
      rzp.open();
    } catch (err) {
      setTemplateMsg({ type: 'error', text: err.response?.data?.error || 'Could not initiate checkout.' });
      setPurchasing(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Business', icon: HiOutlineBuildingOffice2 },
    { id: 'templates', label: 'Invoice Templates', icon: HiOutlineSwatch },
    { id: 'password', label: 'Change Password', icon: HiOutlineLockClosed },
  ];

  const Msg = ({ msg }) => {
    if (!msg.text) return null;
    const isSuccess = msg.type === 'success';
    return (
      <div className={`mb-4 p-4 rounded-xl text-sm flex items-center gap-2 ${
        isSuccess ? 'bg-success-500/10 border border-success-500/20 text-success-600' : 'bg-danger-500/10 border border-danger-500/20 text-danger-600'
      }`}>
        {isSuccess && <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0" />}
        {msg.text}
      </div>
    );
  };

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-surface-700/60 mt-1">Manage your account and business details</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              activeTab === id
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                : 'bg-surface-100 text-surface-700/60 hover:bg-surface-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      {/* ========= Profile Tab ========= */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <Msg msg={profileMsg} />
          <form onSubmit={handleProfileSubmit} className="glass-card p-8 space-y-5">
            <div className="flex items-center gap-6 mb-2">
              <div className="relative group w-20 h-20 rounded-full border-4 border-surface-50 bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg flex-shrink-0">
                {avatar ? (
                  <img src={URL.createObjectURL(avatar)} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Current avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                )}
                
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex flex-col items-center justify-center">
                  <HiOutlinePhoto className="w-6 h-6 text-white" />
                  <span className="text-[10px] text-white font-medium mt-1">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setAvatar(e.target.files[0])}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <p className="font-semibold text-surface-900 text-lg">{user?.name}</p>
                <p className="text-sm text-surface-700/60">{user?.email}</p>
                <div className="flex items-center flex-wrap gap-3 mt-2">
                  <p className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700">
                    Plan: {user?.plan === 'paid' ? '✨ Premium' : 'Free'}
                  </p>
                  <Link
                    to="/pricing"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-sm hover:from-accent-600 hover:to-accent-700 transition-colors"
                  >
                    {user?.plan === 'paid' ? 'Renew Plan' : 'Upgrade Plan'}
                  </Link>
                </div>
              </div>
            </div>

            <div className="h-px bg-surface-200" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Phone</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Business Name</label>
              <input
                type="text"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Business Address</label>
              <textarea
                value={profile.business_address}
                onChange={(e) => setProfile({ ...profile, business_address: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Default Terms & Conditions</label>
              <textarea
                value={profile.terms_conditions}
                onChange={(e) => setProfile({ ...profile, terms_conditions: e.target.value })}
                rows={3}
                placeholder="E.g. Payment is due within 15 days."
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">GSTIN</label>
                <input
                  type="text"
                  value={profile.gstin}
                  onChange={(e) => setProfile({ ...profile, gstin: e.target.value })}
                  placeholder="22AAAAA0000A1Z5"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Razorpay Account ID <span className="text-xs text-primary-600">(For card payments)</span></label>
                <input
                  type="text"
                  value={profile.razorpay_account_id}
                  onChange={(e) => setProfile({ ...profile, razorpay_account_id: e.target.value })}
                  placeholder="acc_..."
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">UPI ID <span className="text-xs text-primary-600">(For QR payments)</span></label>
                <input
                  type="text"
                  value={profile.upi_id}
                  onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                  placeholder="phone@ybl"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
                />
              </div>
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logo ? (
                      <img
                        src={URL.createObjectURL(logo)}
                        alt="New logo preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : user?.logo_url ? (
                      <img
                        src={user.logo_url}
                        alt="Current logo"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <HiOutlinePhoto className="w-6 h-6 text-surface-700/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogo(e.target.files[0])}
                      className="w-full text-sm text-surface-700/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 file:cursor-pointer"
                    />
                    <p className="text-xs text-surface-700/40 mt-1">PNG, JPG, WebP • Max 2MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Signature</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-12 rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {signature ? (
                      <img
                        src={URL.createObjectURL(signature)}
                        alt="New signature preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : user?.signature_url ? (
                      <img
                        src={user.signature_url}
                        alt="Current signature"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <HiOutlinePhoto className="w-6 h-6 text-surface-700/30" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSignature(e.target.files[0])}
                      className="w-full text-sm text-surface-700/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 file:cursor-pointer"
                    />
                    <p className="text-xs text-surface-700/40 mt-1">PNG, JPG, WebP • Max 2MB</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-60 cursor-pointer"
            >
              {profileLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* ========= Password Tab ========= */}
      {activeTab === 'password' && (
        <div className="max-w-md">
          <Msg msg={passwordMsg} />
          <form onSubmit={handlePasswordSubmit} className="glass-card p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Current Password</label>
              <input
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords({ ...passwords, current_password: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                required
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm_password}
                onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-white text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-60 cursor-pointer"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* ========= Templates Tab ========= */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          <div className="space-y-6">
          <Msg msg={templateMsg} />

          {/* Color Themes */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Default Color Theme</h3>
            <div className="flex flex-wrap gap-3">
              {THEMES.map((theme) => {
                const isActive = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setThemeId(theme.id);
                      setTemplateMsg({ type: '', text: '' });
                    }}
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
                    <span className="text-[10px] font-medium text-surface-700/70 mt-1">
                      {theme.emoji} {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template Designs */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Default Template Design</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map((tpl) => {
                const isActive = templateId === tpl.id;
                const activeTheme = getThemeById(themeId);
                const unlockedTemplates = user?.unlocked_templates || [];
                const isPremiumLocked = tpl.isPremium && !unlockedTemplates.includes(tpl.id);
                
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setTemplateId(tpl.id);
                      if (isPremiumLocked) {
                        setTemplateMsg({ type: 'error', text: `Previewing ${tpl.name}. You can unlock it below to apply as default.` });
                      } else {
                        setTemplateMsg({ type: '', text: '' });
                      }
                    }}
                    className={`template-card cursor-pointer relative ${isActive ? 'active' : ''} ${isPremiumLocked ? 'opacity-80' : ''}`}
                  >
                    {tpl.badge && (
                      <span
                        className="template-badge"
                        style={{ background: tpl.isPremium ? '#eab308' : activeTheme.colors.primary, color: '#fff' }}
                      >
                        {tpl.badge}
                      </span>
                    )}

                    {isPremiumLocked && (
                      <div className="absolute inset-0 z-10 bg-surface-900/5 rounded-xl flex items-center justify-center backdrop-blur-[1px]">
                         <div className="bg-surface-900/80 p-2 rounded-full shadow-lg">
                            <HiOutlineLockClosed className="w-4 h-4 text-white" />
                         </div>
                      </div>
                    )}

                    {isActive && (
                      <div
                        className="template-check"
                        style={{ background: activeTheme.colors.primary }}
                      >
                        <HiOutlineCheck className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="p-3 pb-2">
                      <p className="text-sm font-semibold text-surface-900 flex items-center gap-1.5">
                        <span className="text-base">{tpl.icon}</span> {tpl.name}
                      </p>
                      <p className="text-[11px] text-surface-700/50 mt-1 leading-tight">{tpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current selection info */}
          <div className="glass-card p-4 flex items-center justify-between">
            <p className="text-sm text-surface-700/60 leading-tight">
              Default:<br /> <span className="font-semibold text-surface-900">{getTemplateById(templateId).icon} {getTemplateById(templateId).name}</span>
              <br />with <span className="font-semibold text-surface-900">{getThemeById(themeId).emoji} {getThemeById(themeId).name}</span> theme
            </p>
            {(() => {
              const selectedTpl = getTemplateById(templateId);
              const isPremiumLocked = selectedTpl.isPremium && !(user?.unlocked_templates || []).includes(templateId);
              
              if (isPremiumLocked) {
                return (
                  <button
                    onClick={() => handlePurchase(templateId)}
                    disabled={purchasing}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs whitespace-nowrap font-bold rounded-lg shadow-md hover:from-yellow-600 hover:to-yellow-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {purchasing && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    <HiOutlineLockClosed className="w-3.5 h-3.5" />
                    Unlock for ₹{selectedTpl.price}
                  </button>
                );
              }

              return (
                <button
                  onClick={() => {
                    savePrefs(templateId, themeId);
                    setTemplateMsg({ type: 'success', text: 'Default invoice template saved successfully!' });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs whitespace-nowrap font-bold rounded-lg shadow-md hover:from-primary-700 hover:to-primary-800 transition-colors cursor-pointer"
                >
                  Apply Changes
                </button>
              );
            })()}
          </div>
          </div>

          <div className="hidden xl:block sticky top-6">
            <h3 className="text-sm font-bold text-surface-900 uppercase tracking-wider mb-4">Live Preview</h3>
            <div className="border border-surface-200 rounded-xl overflow-hidden bg-surface-50 shadow-xl ring-1 ring-surface-900/5 w-full flex justify-center" style={{ height: '800px' }}>
              <div style={{ width: '850px', transform: 'scale(0.75)', transformOrigin: 'top center' }}>
                <InvoicePreview
                client={{ name: 'Example Client', address: '123 Business Rd\nTech City, TC 10100', email: 'client@example.com', phone: '+1 234 567 8900', gstin: '22AAAAA0000A1Z5' }}
                items={[ { description: 'Web Development Services', quantity: 1, rate: 1500 }, { description: 'Hosting (1 Year)', quantity: 1, rate: 200 } ]}
                gstRate={18}
                dueDate={new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]}
                templateId={templateId}
                themeId={themeId}
                invoiceNumber="INV-001"
                userOverride={user}
              />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
