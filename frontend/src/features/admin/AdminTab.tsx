import React, { Suspense, useEffect, useState } from "react";
import { BookOpen, Download, ShieldCheck, Sliders } from "lucide-react";
import { DictionariesSection } from "./components/dictionaries/DictionariesSection";
import { RbacSection } from "./components/rbac/RbacSection";
import { CustomFieldsSection } from "./components/custom-fields/CustomFieldsSection";
import styles from "./AdminTab.module.css";
import { useAppContext } from "../../app/store";
import { AppLoader } from "../../components/ui/AppLoader";

const ExportSection = React.lazy(() =>
  import("./components/export/ExportSection").then((module) => ({
    default: module.ExportSection,
  })),
);

type AdminSection = "dicts" | "rbac" | "fields" | "exports";

const navigation: Array<{
  id: AdminSection;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "dicts", label: "Довідники", icon: <BookOpen size={16} /> },
  { id: "rbac", label: "Права та Ролі", icon: <ShieldCheck size={16} /> },
  { id: "fields", label: "Конструктор полів", icon: <Sliders size={16} /> },
  { id: "exports", label: "Експорт даних", icon: <Download size={16} /> },
];

/** Coordinates administration sections while each section owns its own state and UI. */
export const AdminTab = () => {
  const { setInitiativeDataScope } = useAppContext();
  useEffect(() => {
    setInitiativeDataScope({ mode: "none" });
  }, [setInitiativeDataScope]);
  const [activeSection, setActiveSection] = useState<AdminSection>("dicts");

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h2 className={styles.title}>Адміністрування</h2>
        <nav className={styles.navigation} aria-label="Розділи адміністрування">
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
        {activeSection === "exports" && (
          <Suspense fallback={<AppLoader label="Завантаження експорту…" />}>
            <ExportSection />
          </Suspense>
        )}
      </div>
    </div>
  );
};
