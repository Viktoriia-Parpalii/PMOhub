import React, { useState, useRef } from 'react';
import { useAppContext } from '../store';
import { getAvailableYears } from '../utils';
import { FullExportData } from '../types';
import { 
  FileSpreadsheet, 
  FileJson, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  Database, 
  Layers, 
  Table, 
  Info,
  Check,
  RotateCcw
} from 'lucide-react';

export const DataManagementSection = () => {
  const { 
    projects, 
    tasks, 
    departments, 
    managers, 
    priorities, 
    taskWeights,
    initiativeSizes, 
    customFields,
    users,
    rolePermissions,
    getFullDataSnapshot,
    importFullData
  } = useAppContext();

  const [excelYear, setExcelYear] = useState<number | 'ALL'>('ALL');
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  
  // JSON Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<FullExportData | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importError, setImportError] = useState<string>('');
  const [importSuccess, setImportSuccess] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Excel Export
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const { exportPortfolioToExcel } = await import('../utils/excelExport');
      await exportPortfolioToExcel({
        projects,
        tasks,
        departments,
        managers,
        priorities,
        taskWeights,
        initiativeSizes,
        customFields,
        selectedYear: excelYear
      });
      setIsExportingExcel(false);
    } catch (err) {
      console.error(err);
      setIsExportingExcel(false);
    }
  };

  // Handle JSON Export
  const handleExportJson = () => {
    setIsExportingJson(true);
    try {
      const snapshot = getFullDataSnapshot();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(snapshot, null, 2)
      )}`;
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `pmo_hub_backup_${dateStr}.json`;

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setIsExportingJson(false);
    } catch (err) {
      console.error(err);
      setIsExportingJson(false);
    }
  };

  // Handle File Selection for Import
  const handleFileChange = (file: File) => {
    setImportError('');
    setImportSuccess('');
    setImportFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Basic verification
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Файл не містить коректного JSON-об’єкта');
        }

        // Validate that it has at least some standard entities
        const hasProjects = Array.isArray(parsed.projects);
        const hasTasks = Array.isArray(parsed.tasks);
        const hasDepts = Array.isArray(parsed.departments);

        if (!hasProjects && !hasTasks && !hasDepts) {
          throw new Error('Файл не містить валідної структури PMO Hub (відсутні масиви проєктів, задач або відділів)');
        }

        setParsedData(parsed as FullExportData);
        setIsImportModalOpen(true);
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Помилка при читанні JSON-файлу');
        setParsedData(null);
      }
    };
    reader.onerror = () => {
      setImportError('Не вдалося прочитати файл');
      setParsedData(null);
    };
    reader.readAsText(file);
  };

  // Perform Import
  const handleConfirmImport = () => {
    if (!parsedData) return;

    const result = importFullData(parsedData, importMode);
    if (result.success) {
      setImportSuccess(`${result.message}. Оновлено проєктів: ${result.counts.projects}, задач: ${result.counts.tasks}.`);
      setIsImportModalOpen(false);
      setParsedData(null);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setImportError(result.message);
    }
  };

  // Compute stats for available years in Excel
  const allYears = Array.from(new Set([
    ...projects.map(p => p.year),
    ...tasks.map(t => t.year),
    ...projects.flatMap(project => Object.keys(project.yearSnapshots ?? {}).map(Number)),
    ...tasks.flatMap(task => Object.keys(task.yearSnapshots ?? {}).map(Number)),
    ...getAvailableYears()
  ])).filter(Boolean).sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      {/* Top Banner with Alert Messages */}
      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1 font-medium">{importSuccess}</div>
          <button onClick={() => setImportSuccess('')} className="text-emerald-600 hover:text-emerald-900 font-bold text-xs">Закрити</button>
        </div>
      )}

      {importError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle size={20} className="text-rose-600 shrink-0" />
          <div className="flex-1 font-medium">{importError}</div>
          <button onClick={() => setImportError('')} className="text-rose-600 hover:text-rose-900 font-bold text-xs">Закрити</button>
        </div>
      )}

      {/* 1. EXCEL EXPORT SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0 shadow-sm">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Експорт звітності в Excel (.xlsx)</h3>
              <p className="text-slate-500 text-sm">
                Формує багатосторінковий документ з аналітикою, беклогами та квартальними аркушами проєктів і задач.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <select
              value={excelYear}
              onChange={(e) => setExcelYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">Всі роки (повний звіт)</option>
              {allYears.map(y => (
                <option key={y} value={y}>{y} рік</option>
              ))}
            </select>

            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isExportingExcel ? (
                <>
                  <RotateCcw size={16} className="animate-spin" />
                  <span>Формування...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Завантажити Excel</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Structure description & preview badges */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            <Table size={14} className="text-emerald-600" />
            <span>Структура згенерованих аркушів у файлі</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              📊 Аркуш: Аналітика (Зведена статистика & KPIs)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
              🗄️ Беклог_2025_Проєкти
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold border border-indigo-200">
              📝 Беклог_2025_Задачі
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
              📋 Q1_2025_Проєкти
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200">
              ☑️ Q1_2025_Задачі
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
              📋 Q2_2025_Проєкти
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200">
              ☑️ Q2_2025_Задачі
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-200 text-slate-600 text-xs font-medium">
              ...і наступні роки та квартали
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600 pt-2 border-t border-slate-200">
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Кольоровий фон назви:</strong> Фон клітинки назви ініціативи автоматично зафарбовується у колір її статусу (зелений, жовтий, червоний, сірий).</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Кольоровий скоуп (чекліст):</strong> Кожне підзавдання в колонці скоупу містить кольоровий індикатор та оформлений текст відповідно до свого статусу.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Розділений беклог:</strong> Окремі аркуші для беклогу проєктів та задач, блакитні заголовки та повне збереження кастомних полів.</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. JSON BACKUP & IMPORT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JSON Export Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0 shadow-sm">
                <FileJson size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Експорт бази у JSON</h3>
                <p className="text-slate-500 text-xs mt-0.5">Повна резервна копія всіх сутностей</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Створює єдиний файл резервної копії (.json), який містить усі проєкти, операційні задачі, беклог, довідники, відділи, стратегічні задачі, права доступу та кастомні поля.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-1 mb-6">
              <div className="flex justify-between">
                <span>Проєктів у системі:</span>
                <span className="font-bold text-slate-800">{projects.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Операційних задач:</span>
                <span className="font-bold text-slate-800">{tasks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Відділів:</span>
                <span className="font-bold text-slate-800">{departments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Користувацьких полів:</span>
                <span className="font-bold text-slate-800">{customFields.length}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleExportJson}
            disabled={isExportingJson}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isExportingJson ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                <span>Експортування...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Завантажити повний JSON</span>
              </>
            )}
          </button>
        </div>

        {/* JSON Import Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0 shadow-sm">
                <Database size={26} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Імпорт даних з JSON</h3>
                <p className="text-slate-500 text-xs mt-0.5">Відновлення або об'єднання з резервної копії</p>
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Завантажте збережений раніше JSON-файл для відновлення структури або додавання нових даних. Перед застосуванням відкриється вікно попереднього перегляду.
            </p>

            {/* Drop / Upload Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors mb-4 ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50' 
                  : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <Upload size={24} className="mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">Натисніть для вибору або перетягніть .json файл</p>
              <p className="text-[11px] text-slate-400 mt-1">Підтримуються бекап-файли PMO Hub</p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Upload size={16} />
            <span>Обрати JSON-файл для імпорту</span>
          </button>
        </div>
      </div>

      {/* 3. IMPORT CONFIRMATION MODAL */}
      {isImportModalOpen && parsedData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 p-6 flex flex-col my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                <Database size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Підтвердження імпорту даних</h3>
                <p className="text-xs text-slate-500">Файл: {importFile?.name}</p>
              </div>
            </div>

            {/* Found Data Overview */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Знайдено в файлі:</p>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Проєктів:</span>
                  <span className="font-bold text-slate-900">{Array.isArray(parsedData.projects) ? parsedData.projects.length : 0}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Операційних задач:</span>
                  <span className="font-bold text-slate-900">{Array.isArray(parsedData.tasks) ? parsedData.tasks.length : 0}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Відділів:</span>
                  <span className="font-bold text-slate-900">{Array.isArray(parsedData.departments) ? parsedData.departments.length : 0}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Менеджерів:</span>
                  <span className="font-bold text-slate-900">{Array.isArray(parsedData.managers) ? parsedData.managers.length : 0}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Кастомних полів:</span>
                  <span className="font-bold text-slate-900">{Array.isArray(parsedData.customFields) ? parsedData.customFields.length : 0}</span>
                </div>
              </div>
            </div>

            {/* Mode selection */}
            <div className="mb-6 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Оберіть режим імпорту:
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  importMode === 'replace' 
                    ? 'border-rose-300 bg-rose-50/60 ring-2 ring-rose-200' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="mt-1 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Повна заміна (Відновлення)
                    <span className="text-[10px] uppercase font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                      Перезапис
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Повністю замінює поточні дані системи даними з файлу.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  importMode === 'merge' 
                    ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-200' 
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="importMode"
                  value="merge"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="mt-1 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-900">
                    Об'єднання (Merge)
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Додає нові елементи та оновлює існуючі за ID, не видаляючи інші поточні записи.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedData(null);
                  setImportFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
              >
                Скасувати
              </button>
              <button
                onClick={handleConfirmImport}
                className={`px-5 py-2 rounded-xl font-bold text-sm text-white transition-all shadow-sm ${
                  importMode === 'replace' 
                    ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                }`}
              >
                {importMode === 'replace' ? 'Замінити всі дані' : 'Об\'єднати дані'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagementSection;
