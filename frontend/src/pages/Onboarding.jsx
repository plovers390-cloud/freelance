import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { HiOutlineBuildingOffice2, HiOutlineMapPin, HiOutlinePhone, HiOutlineIdentification } from 'react-icons/hi2';

const Onboarding = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    business_name: user?.business_name || '',
    business_address: user?.business_address || '',
    gstin: user?.gstin || '',
    phone: user?.phone || '',
  });
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (logo) formData.append('logo', logo);

      const res = await api.put('/auth/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Could not save business info.');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'business_name', label: 'Business Name *', icon: HiOutlineBuildingOffice2, placeholder: 'Acme Web Solutions', required: true },
    { name: 'business_address', label: 'Business Address *', icon: HiOutlineMapPin, placeholder: '123 MG Road, Mumbai 400001', required: true, textarea: true },
    { name: 'gstin', label: 'GSTIN (optional)', icon: HiOutlineIdentification, placeholder: '22AAAAA0000A1Z5' },
    { name: 'phone', label: 'Phone Number (optional)', icon: HiOutlinePhone, placeholder: '9876543210' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
      <div className="w-full max-w-lg fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-xl shadow-primary-500/25">
            <HiOutlineBuildingOffice2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-surface-900">Set up your business</h2>
          <p className="text-surface-700/60 mt-2">This info will appear on your invoices</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-5">
          {fields.map(({ name, label, icon: Icon, placeholder, required, textarea }) => (
            <div key={name}>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
              <div className="relative">
                <Icon className="absolute left-3.5 top-3.5 w-5 h-5 text-surface-700/40" />
                {textarea ? (
                  <textarea
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                )}
              </div>
            </div>
          ))}

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">Business Logo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files[0])}
              className="w-full text-sm text-surface-700/60 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100 file:cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg shadow-primary-600/25 disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Continue to Dashboard →'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
