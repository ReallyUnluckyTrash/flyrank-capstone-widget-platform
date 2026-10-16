import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, X, Zap } from 'lucide-react';
import { api, jsonBody } from '../api.js';
import { defaultFields, unwrap, withClientId } from '../utils/data.js';
import FieldConfigurator from './FieldConfigurator.jsx';
import ModalDialog from './ModalDialog.jsx';
import Notice from './Notice.jsx';
import styles from './WidgetFormModal.module.css';

export default function WidgetFormModal({ widget, onClose, onSaved }) {
  const closeRequestRef = useRef(null);
  const [title, setTitle] = useState(widget?.title || '');
  const [description, setDescription] = useState(widget?.description || '');
  const [buttonText, setButtonText] = useState(widget?.button_text || 'Sign up');
  const [fields, setFields] = useState(() => (
    (widget?.form_fields || defaultFields)
      .filter((field) => !field.honeypot)
      .map(withClientId)
  ));
  const [validationError, setValidationError] = useState('');
  const saveMutation = useMutation({
    mutationFn: (body) => widget
      ? api(`/widgets/${widget.id}`, { method: 'PATCH', body: jsonBody(body) })
      : api('/widgets', { method: 'POST', body: jsonBody(body) }),
  });
  const busy = saveMutation.isPending;
  const error = validationError || saveMutation.error?.message;
  const duplicateFieldIds = useMemo(() => {
    const counts = new Map();
    fields.forEach((field) => {
      const key = field.name.trim().toLowerCase();
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return new Set(
      fields
        .filter((field) => field.name.trim() && counts.get(field.name.trim().toLowerCase()) > 1)
        .map((field) => field.id),
    );
  }, [fields]);

  function submit(event) {
    event.preventDefault();
    saveMutation.reset();
    if (!fields.length || fields.some((field) => !field.name.trim() || !field.label.trim() || !field.type)) {
      setValidationError('Add at least one field with a label, key, and type.');
      return;
    }
    if (duplicateFieldIds.size) {
      setValidationError('Each field key must be unique.');
      return;
    }
    setValidationError('');
    const formFields = fields.map(({ id, ...field }) => field);
    saveMutation.mutate(
      { title, description, button_text: buttonText, form_fields: formFields },
      {
        onSuccess: (response) => closeRequestRef.current(() => onSaved(unwrap(response))),
      },
    );
  }

  return (
    <ModalDialog
      ariaLabel={widget ? 'Edit widget configuration' : 'Create a widget'}
      className={styles.builderModal}
      canClose={!busy}
      closeRequestRef={closeRequestRef}
      onClose={onClose}
    >
      <div className={styles.root}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{widget ? 'EDIT CONFIGURATION' : 'FAST PROVISION'}</span>
            <h2>{widget ? 'Update widget' : 'Create a widget'}</h2>
            <p>Set up the public capture form and its fields.</p>
          </div>
          <button
            className="icon-button"
            aria-label="Close widget form"
            disabled={busy}
            onClick={() => closeRequestRef.current()}
          >
            <X size={18} />
          </button>
        </div>
        <Notice message={error} />
        <form onSubmit={submit} className="widget-form">
          <div className="builder-modal-grid">
            <div className="builder-fields">
              <label>
                Widget title
                <input required maxLength="120" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Product updates" />
              </label>
              <label>
                Description <span className="optional">OPTIONAL</span>
                <textarea rows="2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell visitors what happens when they sign up." />
              </label>
              <label>
                Submit button text
                <input required maxLength="60" value={buttonText} onChange={(event) => setButtonText(event.target.value)} />
              </label>
              <FieldConfigurator fields={fields} setFields={setFields} duplicateFieldIds={duplicateFieldIds} />
            </div>
            <div className="field-preview">
              <div className="preview-toolbar">
                <span><i /> LIVE PREVIEW</span>
                <span>WIDGET / FORM</span>
              </div>
              <div className="preview-card">
                <span className="preview-brand"><Zap size={12} fill="currentColor" /> FLYRANK WIDGET</span>
                <h3>{title || 'Your widget title'}</h3>
                <p>{description || 'Your description will appear here.'}</p>
                {fields.filter((field) => !field.honeypot).map((field) => (
                  <div className="preview-input" key={field.id}>
                    <span>{field.label || field.name}{field.required && <b> *</b>}</span>
                    <i />
                  </div>
                ))}
                <button type="button" className="preview-submit">
                  {buttonText || 'Sign up'} <ArrowRight size={13} />
                </button>
                <small>Protected by spam filtering</small>
              </div>
            </div>
          </div>
          <div className="form-hint">
            <ShieldCheck size={15} /> A honeypot field is added automatically to reduce spam.
          </div>
          <div className="modal-actions">
            <button type="button" className="button secondary" disabled={busy} onClick={() => closeRequestRef.current()}>Cancel</button>
            <button className="button primary" disabled={busy}>
              {busy ? 'Saving…' : widget ? 'Save changes' : 'Create widget'}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </ModalDialog>
  );
}
