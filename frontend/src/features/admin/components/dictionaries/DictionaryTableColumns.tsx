import table from "./DictionaryTable.module.css";

/**
 * Єдина сітка для всіх довідників:
 * назва → спеціалізоване значення → статус → дії.
 */
export const DictionaryTableColumns = () => (
  <colgroup>
    <col className={table.primaryColumn} />
    <col className={table.detailColumn} />
    <col className={table.statusColumn} />
    <col className={table.actionsColumn} />
  </colgroup>
);
