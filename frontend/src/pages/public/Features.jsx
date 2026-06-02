import React from 'react';
import PublicNavbar from '../../components/PublicNavbar';
import PublicFooter from '../../components/PublicFooter';
import { 
  HiOutlineDocumentText, 
  HiOutlineUserGroup, 
  HiOutlineCurrencyRupee, 
  HiOutlineChartBar 
} from 'react-icons/hi2';

const Features = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30">
      <PublicNavbar />
      
      <main className="pt-32 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6">Powerful Features for Modern Freelancers</h1>
          <p className="text-xl text-slate-400">Everything you need to manage your business from a single dashboard.</p>
        </div>

        <div className="space-y-24">
          {/* Feature 1 */}
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="w-full md:w-1/2">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
                <HiOutlineDocumentText className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">GST Invoicing Made Simple</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Create beautiful, professional invoices in seconds. Our built-in GST calculator automatically handles tax computations, HSN codes, and place of supply logic so you don't have to worry about the math.
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Downloadable PDFs
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Customizable branding
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Multi-currency support
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <img src="/images/freelance2.png" alt="Invoicing" className="rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10" />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-12">
            <div className="w-full md:w-1/2">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <HiOutlineUserGroup className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Seamless Client Management</h2>
              <p className="text-slate-400 text-lg leading-relaxed mb-6">
                Keep your client list organized. Store GSTIN numbers, billing addresses, and contact details securely. Track which clients owe you money and view their entire billing history in one click.
              </p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Centralized client directory
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Outstanding balance tracking
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <img src="/images/freelance3.png" alt="Clients" className="rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/10" />
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};

export default Features;
