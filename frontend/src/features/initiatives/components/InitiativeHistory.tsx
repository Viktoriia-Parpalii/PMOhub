import { HistoryEvent } from '../../../shared/types';
import styles from './InitiativeCardModal.module.css';

export const InitiativeHistory = ({ events = [] }: { events?: HistoryEvent[] }) => (
  <div className={styles.historyList}>
    {events.length ? events.map((event) => (
      <article key={event.id} className={styles.historyItem}>
        <p className={styles.historyAction}>{event.action}</p>
        <p className={styles.historyMeta}>{event.author} · {new Date(event.date).toLocaleString()}</p>
      </article>
    )) : <p className={styles.emptyHistory}>Історія змін поки порожня.</p>}
  </div>
);
