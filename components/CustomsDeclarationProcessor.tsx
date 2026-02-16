import React, { useState, useRef } from 'react';
import { extractCustomsDeclaration } from '../services/geminiService';
import { CustomsDeclarationData } from '../types';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, ClipboardList, Ship, ArrowLeft, Printer, RotateCcw } from 'lucide-react';

interface ProcessingState {
  step: 'input' | 'upload' | 'processing' | 'results';
  shipmentRequestNumber: string;
  shipmentDescription: string;
  uploadedFile: File | null;
  uploadedImageUrl: string | null;
  extractedData: CustomsDeclarationData | null;
  error: string | null;
}

const initialState: ProcessingState = {
  step: 'input',
  shipmentRequestNumber: '',
  shipmentDescription: '',
  uploadedFile: null,
  uploadedImageUrl: null,
  extractedData: null,
  error: null,
};

const FIELD_LABELS: { key: keyof CustomsDeclarationData; label: string; certificateLabel: string }[] = [
  { key: 'submissionDate', label: 'תאריך הגשה', certificateLabel: 'תאריך הגשת ההצהרה' },
  { key: 'agentName', label: 'שם סוכן', certificateLabel: 'שם עמיל המכס' },
  { key: 'importerName', label: 'שם יבואן', certificateLabel: 'שם היבואן' },
  { key: 'fullDeclarationNumber', label: 'מספר הצהרה מלא', certificateLabel: 'מספר בקשת שינוע' },
  { key: 'lastFourDigits', label: '4 ספרות אחרונות', certificateLabel: '4 ספרות אחרונות' },
  { key: 'quantity', label: 'כמות', certificateLabel: 'כמות יחידות' },
  { key: 'weight', label: 'משקל', certificateLabel: 'משקל כולל (ק"ג)' },
  { key: 'internalTransit', label: 'מעבר פנימי', certificateLabel: 'מעבר פנימי' },
  { key: 'billOfLadingDate', label: 'תאריך שטר מטען', certificateLabel: 'תאריך שטר מטען (B/L)' },
  { key: 'cargoDescription', label: 'תיאור מטען', certificateLabel: 'תיאור הסחורה' },
];

const CustomsDeclarationProcessor: React.FC = () => {
  const [state, setState] = useState<ProcessingState>(initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputSubmit = () => {
    if (!state.shipmentRequestNumber.trim()) return;
    setState(prev => ({ ...prev, step: 'upload', error: null }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setState(prev => ({ ...prev, error: 'סוג קובץ לא נתמך. נא להעלות תמונה (PNG, JPEG, WebP) או PDF.' }));
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setState(prev => ({ ...prev, uploadedFile: file, uploadedImageUrl: imageUrl, error: null }));
  };

  const handleProcess = async () => {
    if (!state.uploadedFile) return;

    setState(prev => ({ ...prev, step: 'processing', error: null }));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(state.uploadedFile);

      const base64 = await base64Promise;
      const result = await extractCustomsDeclaration(
        base64,
        state.uploadedFile.type,
        state.shipmentRequestNumber
      );

      if (result.success && result.data) {
        setState(prev => ({ ...prev, step: 'results', extractedData: result.data!, error: null }));
      } else {
        setState(prev => ({ ...prev, step: 'upload', error: result.error || 'שגיאה בעיבוד המסמך.' }));
      }
    } catch {
      setState(prev => ({ ...prev, step: 'upload', error: 'אירעה שגיאה בלתי צפויה. אנא נסה שנית.' }));
    }
  };

  const handleReset = () => {
    if (state.uploadedImageUrl) {
      URL.revokeObjectURL(state.uploadedImageUrl);
    }
    setState(initialState);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-[#050505] py-24 text-white relative min-h-screen">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30"></div>

      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 text-luxury-gold mb-4">
            <Ship size={24} />
            <span className="text-sm font-mono tracking-widest">CUSTOMS_PROCESSOR</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-white leading-tight">
            סוכן <span className="text-transparent bg-clip-text bg-gradient-to-r from-luxury-gold to-yellow-200">עמילות מכס</span>
          </h2>
          <p className="text-gray-400 text-lg font-light max-w-2xl mx-auto">
            עיבוד הצהרות מכס ומילוי תעודות מעבר מטען באופן אוטומטי באמצעות בינה מלאכותית
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[
            { label: 'פרטי שינוע', step: 'input' },
            { label: 'העלאת מסמך', step: 'upload' },
            { label: 'עיבוד', step: 'processing' },
            { label: 'תוצאות', step: 'results' },
          ].map((s, idx, arr) => {
            const stepOrder = ['input', 'upload', 'processing', 'results'];
            const currentIdx = stepOrder.indexOf(state.step);
            const thisIdx = stepOrder.indexOf(s.step);
            const isActive = thisIdx <= currentIdx;

            return (
              <React.Fragment key={s.step}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    isActive
                      ? 'bg-luxury-gold text-black border-luxury-gold shadow-[0_0_15px_rgba(197,160,89,0.5)]'
                      : 'bg-transparent text-gray-500 border-gray-600'
                  }`}>
                    {thisIdx < currentIdx ? <CheckCircle size={18} /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? 'text-luxury-gold' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className={`h-[2px] w-12 md:w-20 mt-[-20px] ${
                    thisIdx < currentIdx ? 'bg-luxury-gold' : 'bg-gray-700'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1: Input */}
        {state.step === 'input' && (
          <div className="bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <ClipboardList className="text-luxury-gold" size={24} />
              <h3 className="text-2xl font-bold">הזנת פרטי שינוע</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  מספר בקשת שינוע
                </label>
                <input
                  type="text"
                  value={state.shipmentRequestNumber}
                  onChange={e => setState(prev => ({ ...prev, shipmentRequestNumber: e.target.value }))}
                  placeholder="הזן מספר בקשת שינוע..."
                  className="w-full bg-luxury-charcoal/50 text-white p-4 rounded-xl border border-white/10 focus:border-luxury-gold/50 focus:ring-1 focus:ring-luxury-gold/50 outline-none transition-all placeholder-gray-600"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  מהות המטען
                </label>
                <input
                  type="text"
                  value={state.shipmentDescription}
                  onChange={e => setState(prev => ({ ...prev, shipmentDescription: e.target.value }))}
                  placeholder="תיאור קצר של המטען..."
                  className="w-full bg-luxury-charcoal/50 text-white p-4 rounded-xl border border-white/10 focus:border-luxury-gold/50 focus:ring-1 focus:ring-luxury-gold/50 outline-none transition-all placeholder-gray-600"
                />
              </div>

              <button
                onClick={handleInputSubmit}
                disabled={!state.shipmentRequestNumber.trim()}
                className="w-full py-4 bg-luxury-gold text-black font-bold rounded-xl hover:bg-luxury-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                המשך להעלאת מסמך
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Upload */}
        {state.step === 'upload' && (
          <div className="bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Upload className="text-luxury-gold" size={24} />
              <h3 className="text-2xl font-bold">העלאת הצהרת מכס</h3>
            </div>

            <p className="text-gray-400 text-sm mb-2">
              מספר בקשת שינוע: <span className="text-luxury-gold font-mono" dir="ltr">{state.shipmentRequestNumber}</span>
            </p>
            {state.shipmentDescription && (
              <p className="text-gray-400 text-sm mb-6">
                מהות: <span className="text-gray-200">{state.shipmentDescription}</span>
              </p>
            )}

            {state.error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="text-red-400 shrink-0" size={20} />
                <p className="text-red-300 text-sm">{state.error}</p>
              </div>
            )}

            {/* Upload area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                state.uploadedFile
                  ? 'border-luxury-gold/50 bg-luxury-gold/5'
                  : 'border-gray-600 hover:border-luxury-gold/30 hover:bg-white/5'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {state.uploadedFile ? (
                <div className="space-y-4">
                  {state.uploadedImageUrl && state.uploadedFile.type.startsWith('image/') && (
                    <img
                      src={state.uploadedImageUrl}
                      alt="תצוגה מקדימה"
                      className="max-h-64 mx-auto rounded-lg border border-white/10"
                    />
                  )}
                  <div className="flex items-center justify-center gap-2 text-luxury-gold">
                    <FileText size={20} />
                    <span className="text-sm">{state.uploadedFile.name}</span>
                  </div>
                  <p className="text-gray-500 text-xs">לחץ להחלפת קובץ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="mx-auto text-gray-500" size={48} />
                  <p className="text-gray-300">גרור קובץ או לחץ להעלאה</p>
                  <p className="text-gray-500 text-xs">PNG, JPEG, WebP, PDF</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setState(prev => ({ ...prev, step: 'input', error: null }))}
                className="flex-1 py-4 bg-white/5 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-all border border-white/10"
              >
                חזרה
              </button>
              <button
                onClick={handleProcess}
                disabled={!state.uploadedFile}
                className="flex-1 py-4 bg-luxury-gold text-black font-bold rounded-xl hover:bg-luxury-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                עבד הצהרה
                <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {state.step === 'processing' && (
          <div className="bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-16 max-w-2xl mx-auto text-center">
            <Loader2 className="mx-auto text-luxury-gold animate-spin mb-6" size={64} />
            <h3 className="text-2xl font-bold mb-3">מעבד הצהרת מכס...</h3>
            <p className="text-gray-400">
              הבינה המלאכותית מנתחת את המסמך ומחלצת את הנתונים הרלוונטיים
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-2 h-2 bg-luxury-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-luxury-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-luxury-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {state.step === 'results' && state.extractedData && (
          <div className="space-y-8">
            {/* Extracted Data */}
            <div className="bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 p-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="text-green-400" size={24} />
                  <h3 className="text-2xl font-bold">נתונים שחולצו מההצהרה</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-right py-3 px-4 text-luxury-gold font-medium">שדה</th>
                      <th className="text-right py-3 px-4 text-luxury-gold font-medium">ערך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_LABELS.map(({ key, label }) => (
                      <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 text-gray-300 font-medium">{label}</td>
                        <td className="py-3 px-4 text-white" dir={key === 'fullDeclarationNumber' || key === 'lastFourDigits' || key === 'weight' ? 'ltr' : 'rtl'}>
                          {state.extractedData![key]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cargo Transit Certificate */}
            <div className="bg-luxury-charcoal/80 backdrop-blur-xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-luxury-gold/30 p-10 print:bg-white print:text-black print:border-black print:shadow-none" id="cargo-certificate">
              <div className="text-center mb-8 border-b border-luxury-gold/20 pb-6">
                <h3 className="text-3xl font-black text-luxury-gold mb-2">תעודת מעבר מטען</h3>
                <p className="text-gray-400 text-sm print:text-gray-600">Cargo Transit Certificate</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {FIELD_LABELS.map(({ key, certificateLabel }) => (
                  <div key={key} className="bg-black/30 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-300">
                    <p className="text-xs text-luxury-gold font-medium mb-1 print:text-gray-500">
                      {certificateLabel}
                    </p>
                    <p className="text-white text-lg font-medium print:text-black" dir={key === 'fullDeclarationNumber' || key === 'lastFourDigits' || key === 'weight' ? 'ltr' : 'rtl'}>
                      {state.extractedData![key]}
                    </p>
                  </div>
                ))}
              </div>

              {state.shipmentDescription && (
                <div className="mt-6 bg-black/30 rounded-xl p-4 border border-white/5 print:bg-gray-50 print:border-gray-300">
                  <p className="text-xs text-luxury-gold font-medium mb-1 print:text-gray-500">מהות המטען (קלט)</p>
                  <p className="text-white text-lg font-medium print:text-black">{state.shipmentDescription}</p>
                </div>
              )}

              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-gray-500 text-xs print:text-gray-400 print:border-gray-300">
                <span>תאריך הנפקה: {new Date().toLocaleDateString('he-IL')}</span>
                <span>מופק באמצעות מערכת AI עמילות מכס</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 max-w-md mx-auto">
              <button
                onClick={handlePrint}
                className="flex-1 py-4 bg-luxury-gold text-black font-bold rounded-xl hover:bg-luxury-gold-light transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                הדפסה
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-4 bg-white/5 text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                הצהרה חדשה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomsDeclarationProcessor;
