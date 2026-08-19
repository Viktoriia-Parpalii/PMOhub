import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ScopeMergePreview } from '../types';

export const ScopeMergeConfirmDialog = ({ preview, onCancel, onConfirm }: {
  preview: ScopeMergePreview;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-lg rounded-2xl bg-white border border-amber-200 shadow-2xl overflow-hidden">
      <div className="p-5 bg-amber-50 border-b border-amber-200 flex gap-3">
        <AlertTriangle className="text-amber-600 shrink-0" />
        <div><h3 className="font-bold text-slate-900">Підтвердіть злиття scope</h3><p className="text-sm text-slate-600 mt-1">У цільовому періоді вже існує картка цього master-record.</p></div>
      </div>
      <div className="p-5 space-y-3 text-sm text-slate-700">
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Source</span><strong className="block">{preview.sourcePeriod}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-slate-500">Target</span><strong className="block">{preview.targetPeriod}</strong></div></div>
        <p>Буде додано завдань: <strong>{preview.addedCount}</strong> із {preview.incomingCount}.</p>
        {preview.duplicateItemIds.length > 0 && <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Дублі за ID залишаться у target без повторного додавання: {preview.duplicateItemIds.join(', ')}.</p>}
        {preview.deletesSource && <p className="font-semibold text-rose-700">Після злиття порожню source-картку буде видалено.</p>}
      </div>
      <div className="p-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={onCancel} className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200">Скасувати</button><button onClick={onConfirm} className="px-4 py-2 rounded-xl font-bold bg-amber-600 text-white hover:bg-amber-700">Об’єднати scope</button></div>
    </div>
  </div>
);
