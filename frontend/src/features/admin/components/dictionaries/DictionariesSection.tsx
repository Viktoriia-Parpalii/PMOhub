import React, { useState } from "react";
import { MutationResult } from "../../../../shared/types";
import { DepartmentsSection, ProtectedDelete } from "./DepartmentsSection";
import {
  DictionaryDialogs,
  DeleteBlocked,
  DeleteConfirmation,
} from "./DictionaryDialogs";
import { InitiativeSizesSection } from "./InitiativeSizesSection";
import { InitiativeStatusesSection } from "./InitiativeStatusesSection";
import { ManagersSection } from "./ManagersSection";
import { PrioritiesSection } from "./PrioritiesSection";
import {
  BulkWeight,
  TaskWeightsSection,
  WeightEditor,
} from "./TaskWeightsSection";
import styles from "./DictionariesSection.module.css";

/** Coordinates dictionary sections and their shared confirmation dialogs. */
export const DictionariesSection = () => {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation>(null);
  const [deleteBlocked, setDeleteBlocked] = useState<DeleteBlocked>(null);
  const [editingWeight, setEditingWeight] = useState<WeightEditor>(null);
  const [bulkWeight, setBulkWeight] = useState<BulkWeight>(null);

  const requestProtectedDelete: ProtectedDelete = (
    title,
    name,
    check,
    onConfirm,
  ) => {
    const result = check();
    if (!result.success) {
      setDeleteBlocked({ title, name, message: result.message });
      return;
    }
    setDeleteConfirm({ title, name, onConfirm });
  };

  return (
    <div className={styles.root}>
      <DepartmentsSection requestProtectedDelete={requestProtectedDelete} />
      <ManagersSection requestProtectedDelete={requestProtectedDelete} />
      <PrioritiesSection requestProtectedDelete={requestProtectedDelete} />
      <InitiativeStatusesSection
        requestProtectedDelete={requestProtectedDelete}
      />
      <TaskWeightsSection
        openDeleteConfirm={setDeleteConfirm}
        setEditingWeight={setEditingWeight}
        setBulkWeight={setBulkWeight}
      />
      <InitiativeSizesSection openDeleteConfirm={setDeleteConfirm} />
      <DictionaryDialogs
        deleteConfirm={deleteConfirm}
        setDeleteConfirm={setDeleteConfirm}
        deleteBlocked={deleteBlocked}
        setDeleteBlocked={setDeleteBlocked}
        editingWeight={editingWeight}
        setEditingWeight={setEditingWeight}
        bulkWeight={bulkWeight}
        setBulkWeight={setBulkWeight}
      />
    </div>
  );
};
