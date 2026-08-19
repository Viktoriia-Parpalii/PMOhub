import React, { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

/** Replaces browser alert() with one accessible dialog matching the PMO Hub UI. */
export const SystemAlertDialog = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (nextMessage?: string) => setMessage(String(nextMessage ?? ''));
    return () => { window.alert = nativeAlert; };
  }, []);

  if (!message) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setMessage(null)}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="system-alert-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><AlertCircle size={22} /></span><div><h2 id="system-alert-title" className="text-lg font-extrabold text-slate-800">Потрібна увага</h2><p className="mt-0.5 text-xs font-medium text-slate-500">PMO Hub</p></div></div>
          <button type="button" onClick={() => setMessage(null)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Закрити"><X size={19} /></button>
        </div>
        <div className="px-6 py-5"><p className="whitespace-pre-line text-sm leading-6 text-slate-600">{message}</p></div>
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/70 px-6 py-4"><button type="button" onClick={() => setMessage(null)} autoFocus className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-indigo-700">Зрозуміло</button></div>
      </section>
    </div>
  );
};
