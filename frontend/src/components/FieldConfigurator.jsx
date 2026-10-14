import { FileText, Plus, Trash2 } from 'lucide-react';
import { withClientId } from '../utils/data.js';

export default function FieldConfigurator({ fields, setFields, duplicateFieldIds }) {
  function updateField(index, patch) {
    setFields((currentFields) => currentFields.map((field, current) => (
      current === index ? { ...field, ...patch } : field
    )));
  }

  function addField() {
    setFields((currentFields) => [
      ...currentFields,
      withClientId({
        name: `field_${currentFields.length + 1}`,
        label: 'New field',
        type: 'text',
        required: false,
      }),
    ]);
  }

  function removeField(index) {
    setFields((currentFields) => currentFields.filter((_, current) => current !== index));
  }

  return (
    <section className="field-configurator">
      <div className="field-config-heading">
        <span>CAPTURE FIELDS <b>{fields.length}</b></span>
        <button type="button" onClick={addField}><Plus size={14} />Add field</button>
      </div>
      {fields.length ? fields.map((field, index) => (
        <div className="builder-field-row" key={field.id}>
          <span className="field-type-icon"><FileText size={14} /></span>
          <div className="builder-field-grid">
            <input
              aria-label="Field label"
              required
              value={field.label || ''}
              onChange={(event) => updateField(index, { label: event.target.value })}
              placeholder="Field label"
            />
            <div>
              <input
                aria-label="Field key"
                required
                aria-invalid={duplicateFieldIds.has(field.id)}
                value={field.name || ''}
                onChange={(event) => updateField(index, { name: event.target.value })}
                placeholder="field_key"
              />
              {duplicateFieldIds.has(field.id) && <small className="field-error">Field keys must be unique.</small>}
            </div>
            <select
              aria-label="Field type"
              value={field.type || 'text'}
              onChange={(event) => updateField(index, { type: event.target.value })}
            >
              <option value="text">Text</option>
              <option value="email">Email</option>
              <option value="tel">Phone</option>
              <option value="url">Website URL</option>
              <option value="number">Number</option>
            </select>
          </div>
          <label className="required-toggle">
            <input
              type="checkbox"
              checked={Boolean(field.required)}
              onChange={(event) => updateField(index, { required: event.target.checked })}
            />
            Required
          </label>
          <button
            type="button"
            className="row-action danger-action"
            title="Remove field"
            aria-label={`Remove ${field.label || field.name || 'field'}`}
            onClick={() => removeField(index)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )) : <p className="fields-empty">Add at least one field to collect a submission.</p>}
    </section>
  );
}
