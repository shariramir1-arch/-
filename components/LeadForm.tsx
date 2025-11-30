
import React, { useState } from 'react';
import { Send, CheckCircle, Loader2, MessageSquare, Mic, Code, Lightbulb, Crown, ArrowLeft } from 'lucide-react';
import ServiceModal from './ServiceModal';
import { SERVICE_DETAILS } from '../constants';
import { ServiceDetail } from '../types';

const LeadForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    interest: 'consulting', // Default interest
    message: ''
  });
  
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [selectedServiceModal, setSelectedServiceModal] = useState<ServiceDetail | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    // Simulate Backend API call for Email and WhatsApp automation
    setTimeout(() => {
      setStatus('success');
      // In a real backend environment, here we would call:
      // await sendEmail({ to: formData.email, subject: "ברוכים הבאים - שריר אמיר" });
      // await sendWhatsApp({ to: formData.phone, message: "תודה שפנית אלינו..." });
    }, 2000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleServiceSelectFromModal = (serviceId: string) => {
    setFormData(prev => ({ ...prev, interest: serviceId }));
    setSelectedServiceModal(null);
    // Smooth scroll to form (optional, as modal is over form usually)
    const formElement = document.getElementById('contact-form-inputs');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const openServiceModal = (serviceKey: string) => {
    const service = SERVICE_DETAILS[serviceKey];
    if (service) {
      setSelectedServiceModal(service);
    }
  };

  const getWhatsAppLink = () => {
    const text = `היי אמיר, השארתי פרטים באתר בנושא ${
      formData.interest === 'lectures' ? 'הרצאות' : 
      formData.interest === 'development' ? 'פיתוח סוכנים' : 'ייעוץ'
    }. אשמח לשמוע פרטים נוספים.`;
    return `https://wa.me/972536576136?text=${encodeURIComponent(text)}`;
  };

  if (status === 'success') {
    return (
      <div className="bg-luxury-black py-24 px-6 flex items-center justify-center relative overflow-hidden">
        {/* Background glow for success */}
        <div className="absolute inset-0 bg-luxury-gold/5 blur-[100px] pointer-events-none"></div>

        <div className="max-w-2xl w-full bg-luxury-card border border-luxury-gold/20 rounded-3xl p-12 text-center shadow-[0_0_80px_rgba(197,160,89,0.15)] relative z-10 animate-fade-in-up">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-luxury-gold to-transparent"></div>
          
          <div className="w-24 h-24 bg-gradient-to-br from-luxury-gold to-yellow-600 text-black rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg animate-float">
            <CheckCircle size={48} />
          </div>
          
          <h3 className="text-4xl font-black text-white mb-6">הפרטים נקלטו בהצלחה</h3>
          
          <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
            <p className="text-lg text-gray-300 font-light leading-relaxed">
              תודה <span className="text-luxury-gold font-bold">{formData.name}</span>, <br/>
              מייל אישור והודעת WhatsApp עם פרטים נוספים נשלחו אליך כעת לנייד {formData.phone}.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              * המערכת האוטומטית מטפלת בפנייתך ברגעים אלו.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1"
            >
              <MessageSquare size={20} />
              המשך שיחה ב-WhatsApp
            </a>
            
            <button 
              onClick={() => {
                setStatus('idle');
                setFormData({ name: '', email: '', phone: '', company: '', interest: 'consulting', message: '' });
              }}
              className="px-8 py-4 border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl transition-all"
            >
              חזרה לאתר
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ServiceModal 
        isOpen={!!selectedServiceModal}
        onClose={() => setSelectedServiceModal(null)}
        service={selectedServiceModal}
        onSelect={handleServiceSelectFromModal}
      />
      
      <div className="bg-[#050505] py-24 relative overflow-hidden">
        {/* Decorative Lights */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-luxury-gold/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-900/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-start">
            
            {/* Left Side: Call to Action */}
            <div className="lg:w-5/12 pt-10">
              <div className="flex items-center gap-2 mb-6">
                <Crown className="text-luxury-gold w-6 h-6" />
                <span className="text-luxury-gold uppercase tracking-widest text-sm font-bold">Premium Services</span>
              </div>
              
              <h2 className="text-5xl font-black text-white mb-8 leading-[1.1]">
                הצעד הבא <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-400 to-gray-600">של הארגון שלך.</span>
              </h2>
              
              <p className="text-xl text-gray-400 mb-12 leading-relaxed font-light">
                הצטרף לנבחרת הארגונים המובילים שכבר הטמיעו פתרונות AI מתקדמים. לחץ על כרטיס שירות לפרטים נוספים.
              </p>
              
              <div className="space-y-6">
                {[
                  { key: 'lectures', icon: Mic, title: "הרצאות Executive", text: "תוכן אסטרטגי להנהלה בכירה" },
                  { key: 'development', icon: Code, title: "פיתוח סוכני עילית", text: "ארכיטקטורת Custom Made" },
                  { key: 'consulting', icon: Lightbulb, title: "ייעוץ אסטרטגי", text: "בניית מפת דרכים טכנולוגית" }
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => openServiceModal(item.key)}
                    className="flex items-center gap-6 p-6 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors border border-transparent hover:border-luxury-gold/30 cursor-pointer group animate-fade-in-up"
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div className="p-4 bg-black rounded-xl border border-white/10 group-hover:border-luxury-gold/50 text-luxury-gold transition-colors shadow-lg group-hover:shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg group-hover:text-luxury-gold transition-colors">{item.title}</h4>
                      <p className="text-sm text-gray-500">{item.text}</p>
                    </div>
                    <ArrowLeft className="mr-auto opacity-0 group-hover:opacity-100 transition-opacity text-luxury-gold" size={18} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Form */}
            <div className="lg:w-7/12 w-full" id="contact-form-inputs">
              <form onSubmit={handleSubmit} className="bg-luxury-card/40 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-2xl border border-white/5 relative group hover:border-luxury-gold/20 transition-colors duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-luxury-gold/0 via-luxury-gold/50 to-luxury-gold/0"></div>
                
                <h3 className="text-3xl font-bold text-white mb-2">תיאום שיחת אפיון</h3>
                <p className="text-gray-500 mb-8 text-sm">מלא את הפרטים ואנו נדאג לשאר.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">שם מלא</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder-gray-700 hover:bg-black/70"
                      placeholder="ישראל ישראלי"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">ארגון</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder-gray-700 hover:bg-black/70"
                      placeholder="שם החברה"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">אימייל</label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder-gray-700 hover:bg-black/70"
                      placeholder="email@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">טלפון</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder-gray-700 hover:bg-black/70"
                      placeholder="050-0000000"
                    />
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">תחום עניין</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['lectures', 'development', 'consulting'].map((opt) => (
                      <label key={opt} className={`cursor-pointer border rounded-xl p-4 text-center transition-all ${
                        formData.interest === opt 
                          ? 'bg-luxury-gold text-black font-bold border-luxury-gold shadow-[0_0_15px_rgba(197,160,89,0.4)] transform -translate-y-1' 
                          : 'bg-black/30 border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}>
                        <input type="radio" name="interest" value={opt} className="hidden" checked={formData.interest === opt} onChange={handleChange} />
                        {opt === 'lectures' && 'הרצאות'}
                        {opt === 'development' && 'פיתוח'}
                        {opt === 'consulting' && 'ייעוץ'}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-10">
                  <label className="block text-xs font-bold text-luxury-gold uppercase tracking-wider mb-3">הודעה</label>
                  <textarea
                    name="message"
                    rows={3}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-5 py-4 rounded-xl bg-black/50 border border-white/10 text-white focus:border-luxury-gold focus:ring-1 focus:ring-luxury-gold outline-none transition-all placeholder-gray-700 resize-none hover:bg-black/70"
                    placeholder="פרטים נוספים..."
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full bg-gradient-to-r from-luxury-gold to-[#b8860b] text-black font-bold py-5 rounded-xl shadow-[0_0_20px_rgba(197,160,89,0.2)] hover:shadow-[0_0_40px_rgba(197,160,89,0.4)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide overflow-hidden relative group"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div>
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="animate-spin" /> מעבד נתונים...
                    </>
                  ) : (
                    <>
                      שלח פרטים והתחל תהליך <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadForm;
