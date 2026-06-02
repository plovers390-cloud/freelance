import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlineUser, HiOutlineEnvelope, HiOutlineLockClosed,
  HiOutlineBuildingOffice2, HiOutlineEye, HiOutlineEyeSlash,
} from 'react-icons/hi2';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', business_name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
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
      await register(form);
      navigate('/onboarding');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'name', label: 'Full Name', type: 'text', icon: HiOutlineUser, placeholder: 'Enter your full name', required: true },
    { name: 'email', label: 'Email', type: 'email', icon: HiOutlineEnvelope, placeholder: 'Enter your email', required: true },
    { name: 'password', label: 'Password', type: 'password', icon: HiOutlineLockClosed, placeholder: 'Enter your password', required: true },
    { name: 'business_name', label: 'Business Name', type: 'text', icon: HiOutlineBuildingOffice2, placeholder: 'Enter your business name (optional)', required: false },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h1 className="text-4xl font-extrabold mb-4 leading-tight">
            Start your journey with<br />
            <span className="text-5xl">Freelance</span>
          </h1>
          <p className="text-lg text-white/70 leading-relaxed">
            Create professional invoices, automate payments with Razorpay, and manage GST — all from a beautiful dashboard.
          </p>
          <div className="mt-10 space-y-4">
            {['Professional GST Invoices', 'Razorpay Payment Links', 'Automated Overdue Reminders', 'Monthly Reports & Analytics'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm">✓</div>
                <span className="text-white/80">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface-50">
        <div className="w-full max-w-md fade-in">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-surface-900">Create account</h2>
            <p className="text-surface-700/60 mt-2">Get started for free — no credit card required</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {fields.map(({ name, label, type, icon: Icon, placeholder, required }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">{label}</label>
                <div className="relative">
                  <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-700/40" />
                  <input
                    id={`register-${name}`}
                    type={name === 'password' ? (showPassword ? 'text' : 'password') : type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    required={required}
                    placeholder={placeholder}
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-surface-200 bg-white text-sm focus:border-primary-500 transition-colors"
                  />
                  {name === 'password' && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-surface-700/40 hover:text-surface-700 cursor-pointer"
                    >
                      {showPassword ? <HiOutlineEyeSlash className="w-5 h-5" /> : <HiOutlineEye className="w-5 h-5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg shadow-primary-600/25 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-surface-700/60 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
