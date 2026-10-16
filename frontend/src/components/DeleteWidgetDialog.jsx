import { useRef } from 'react';
import { X } from 'lucide-react';
import ModalDialog from './ModalDialog.jsx';
import Notice from './Notice.jsx';

export default function DeleteWidgetDialog({ widget, mutation, onClose, onConfirm }) {
  const closeRequestRef = useRef(null);

  return (
    <ModalDialog
      ariaLabel="Confirm widget deletion"
      canClose={!mutation.isPending}
      closeRequestRef={closeRequestRef}
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
          onClick={() => closeRequestRef.current()}
        >
          <X size={18} />
        </button>
      </div>
      <Notice message={mutation.error?.message} />
      <div className="modal-actions">
        <button className="button secondary" disabled={mutation.isPending} onClick={() => closeRequestRef.current()}>
          Cancel
        </button>
        <button
          className="button danger-button"
          disabled={mutation.isPending}
          onClick={() => onConfirm(() => closeRequestRef.current(onClose))}
        >
          {mutation.isPending ? 'Deleting…' : 'Delete widget'}
        </button>
      </div>
    </ModalDialog>
  );
}
