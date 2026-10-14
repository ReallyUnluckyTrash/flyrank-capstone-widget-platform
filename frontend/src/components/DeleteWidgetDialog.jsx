import { X } from 'lucide-react';
import ModalDialog from './ModalDialog.jsx';
import Notice from './Notice.jsx';

export default function DeleteWidgetDialog({ widget, mutation, onClose, onConfirm }) {
  return (
    <ModalDialog
      ariaLabel="Confirm widget deletion"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">DELETE WIDGET</span>
          <h2>Delete “{widget.title}”?</h2>
          <p>This also permanently deletes its submissions.</p>
        </div>
        <button
          className="icon-button"
          aria-label="Close delete confirmation"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <Notice message={mutation.error?.message} />
      <div className="modal-actions">
        <button className="button secondary" disabled={mutation.isPending} onClick={onClose}>
          Cancel
        </button>
        <button className="button danger-button" disabled={mutation.isPending} onClick={onConfirm}>
          {mutation.isPending ? 'Deleting…' : 'Delete widget'}
        </button>
      </div>
    </ModalDialog>
  );
}
