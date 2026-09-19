import styles from "./AuthBackground.module.css";

const Donut = ({ tone = "blue" }: { tone?: "blue" | "cyan" | "violet" }) => (
  <span
    className={`${styles.donut} ${tone === "blue" ? "" : styles[tone]}`}
  />
);

const Legend = () => (
  <div className={styles.legend}>
    <span><i className={styles.legendViolet} /><b /></span>
    <span><i className={styles.legendCyan} /><b /></span>
    <span><i className={styles.legendBlue} /><b /></span>
  </div>
);

/** Lightweight analytics scene shared by authentication pages. */
export const AuthBackground = () => (
  <div className={styles.scene} aria-hidden="true">
    <span className={styles.glowTop} />
    <span className={styles.glowLeft} />
    <span className={styles.glowRight} />

    <svg className={styles.routes} viewBox="0 0 1400 800" preserveAspectRatio="none">
      <path
        className={styles.softRoute}
        d="M280 178 C365 190 400 248 382 322 S400 454 470 470"
      />
      <path
        className={styles.softRoute}
        d="M296 610 C385 604 414 548 390 486 S408 382 470 354"
      />
      <path
        className={styles.softRoute}
        d="M1120 178 C1035 190 1000 248 1018 322 S1000 454 930 470"
      />
      <path
        className={styles.softRoute}
        d="M1104 610 C1015 604 986 548 1010 486 S992 382 930 354"
      />
      <path
        className={styles.dashedRoute}
        d="M318 250 C362 276 348 344 389 374 S424 421 470 424"
      />
      <path
        className={styles.dashedRoute}
        d="M1082 250 C1038 276 1052 344 1011 374 S976 421 930 424"
      />
      <g className={styles.routeNodes}>
        <circle cx="382" cy="322" r="4" />
        <circle cx="390" cy="486" r="4" />
        <circle cx="470" cy="424" r="4" />
        <circle cx="1018" cy="322" r="4" />
        <circle cx="1010" cy="486" r="4" />
        <circle cx="930" cy="424" r="4" />
      </g>
    </svg>

    <div className={`${styles.cluster} ${styles.leftCluster}`}>
      <div className={`${styles.metricCard} ${styles.structureCard}`}>
        <Donut tone="blue" />
        <Legend />
      </div>
      <div className={`${styles.metricCard} ${styles.barsCard}`}>
        <span className={styles.barShort} />
        <span className={styles.barMedium} />
        <span className={styles.barTall} />
        <span className={styles.barHighest} />
      </div>
      <div className={`${styles.metricCard} ${styles.listCard}`}>
        <Legend />
      </div>
    </div>

    <div className={`${styles.cluster} ${styles.rightCluster}`}>
      <div className={`${styles.metricCard} ${styles.trendCard}`}>
        <span className={styles.chartGrid} />
        <svg viewBox="0 0 320 150" preserveAspectRatio="none">
          <path className={styles.trendShadow} d="M10 130 C34 86 48 112 68 82 S104 52 130 80 S166 112 190 72 S225 35 247 49 S278 48 310 12" />
          <path className={styles.trendLine} d="M10 130 C34 86 48 112 68 82 S104 52 130 80 S166 112 190 72 S225 35 247 49 S278 48 310 12" />
          <g className={styles.trendPoints}>
            <circle cx="68" cy="82" r="5" />
            <circle cx="130" cy="80" r="5" />
            <circle cx="190" cy="72" r="5" />
            <circle cx="247" cy="49" r="5" />
            <circle cx="310" cy="12" r="5" />
          </g>
        </svg>
      </div>
      <div className={`${styles.metricCard} ${styles.donutsCard}`}>
        <span><Donut tone="cyan" /><i /><b /></span>
        <span><Donut tone="blue" /><i /><b /></span>
        <span><Donut tone="violet" /><i /><b /></span>
      </div>
    </div>
  </div>
);
