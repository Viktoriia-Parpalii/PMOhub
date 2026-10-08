import { ReactNode } from "react";
import styles from "../AppShell.module.css";

type AppContentAreaProps = {
  isWide: boolean;
  header: ReactNode;
  children: ReactNode;
};

export const AppContentArea = ({
  isWide,
  header,
  children,
}: AppContentAreaProps) => (
  <main className={styles.mainArea}>
    {header}
    <div className={`${styles.contentScroller} custom-scrollbar`}>
      <div
        className={`${styles.contentContainer} ${isWide ? styles.wideContent : styles.standardContent}`}
      >
        {children}
      </div>
    </div>
  </main>
);
