import { ExternalLink, Link2, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { InitiativeRelation } from "../../../shared/types";
import styles from "./BacklogModals.module.css";

export const InitiativeRelationsModal = ({
  initiativeName,
  relations,
  onClose,
  getHref,
}: {
  initiativeName: string;
  relations: InitiativeRelation[];
  onClose: () => void;
  getHref: (relation: InitiativeRelation) => string;
}) =>
  createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div
        className={styles.relationsModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="relations-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle} id="relations-modal-title">
              Пов’язані ініціативи
            </h2>
            <p className={styles.relationsModalSubtitle}>{initiativeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрити"
            className={styles.closeButton}
          >
            <X size={22} />
          </button>
        </div>
        <div className={styles.relationsModalBody}>
          {relations.map((relation) => (
            <a
              key={relation.id}
              href={getHref(relation)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className={styles.relationNavigationItem}
              aria-label={`Відкрити пов’язану ініціативу ${relation.related_name} у новій вкладці`}
            >
              <Link2 size={19} aria-hidden="true" />
              <span className={styles.relationNavigationContent}>
                <span className={styles.candidateTitle}>
                  <span className={styles.relationKind}>
                    {relation.related_kind === "PROJECT"
                      ? "Проєкт"
                      : "Операційна задача"}
                  </span>
                  <strong>{relation.related_name}</strong>
                </span>
                <span className={styles.candidateYears}>
                  Роки: {relation.available_years.join(", ")}
                </span>
              </span>
              <ExternalLink size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
