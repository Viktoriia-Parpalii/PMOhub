import React, { useState } from "react";
import { BookOpen, FileSpreadsheet, ShieldCheck, Sliders } from "lucide-react";
import { DictionariesSection } from "./components/dictionaries/DictionariesSection";
import { RbacSection } from "./components/rbac/RbacSection";
import { CustomFieldsSection } from "./components/custom-fields/CustomFieldsSection";
import styles from "./AdminTab.module.css";

const DataManagementSection = React.lazy(() =>
  import("./components/DataManagementSection").then((module) => ({
    default: module.DataManagementSection,
  })),
);

type AdminSection = "dicts" | "rbac" | "fields" | "data";

const navigation: Array<{
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "dicts", label: "Довідники", icon: <BookOpen size={16} /> },
  { id: "rbac", label: "Права та Ролі", icon: <ShieldCheck size={16} /> },
  { id: "fields", label: "Конструктор полів", icon: <Sliders size={16} /> },
  {
    id: "data",
    label: "Експорт / Імпорт",
    icon: <FileSpreadsheet size={16} />,
  },
];

/** Coordinates administration sections while each section owns its own state and UI. */
export const AdminTab = () => {
  const [activeSection, setActiveSection] = useState<AdminSection>("dicts");

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Адміністрування</h2>
        <nav
          className={styles.navigation}
          aria-label="Розділи адміністрування"
        >
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`${styles.navigationButton} ${activeSection === item.id ? styles.navigationButtonActive : styles.navigationButtonInactive}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className={styles.content}>
        {activeSection === "dicts" && <DictionariesSection />}
        {activeSection === "rbac" && <RbacSection />}
        {activeSection === "fields" && <CustomFieldsSection />}
        {activeSection === "data" && (
          <React.Suspense
            fallback={
              <div className="p-8 text-center text-slate-500">
                Завантаження модуля даних…
              </div>
            }
          >
            <DataManagementSection />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};
