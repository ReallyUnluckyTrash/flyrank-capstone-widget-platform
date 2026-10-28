import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import FieldConfigurator from './FieldConfigurator.jsx';

vi.mock('@formkit/auto-animate/react', () => ({
  useAutoAnimate: () => [() => {}],
}));

afterEach(cleanup);

function FieldConfiguratorHarness({ initialFields, duplicateFieldIds = new Set() }) {
  const [fields, setFields] = useState(initialFields);

  return (
    <FieldConfigurator
      fields={fields}
      setFields={setFields}
      duplicateFieldIds={duplicateFieldIds}
    />
  );
}

describe('FieldConfigurator', () => {
  it('updates configured field properties and shows duplicate-key validation', () => {
    render(
      <FieldConfiguratorHarness
        initialFields={[
          { id: 'name-id', name: 'name', label: 'Name', type: 'text', required: false },
        ]}
        duplicateFieldIds={new Set(['name-id'])}
      />,
    );

    expect(screen.getByText('Field keys must be unique.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Field label'), { target: { value: 'Full name' } });
    fireEvent.change(screen.getByLabelText('Field key'), { target: { value: 'full_name' } });
    fireEvent.change(screen.getByLabelText('Field type'), { target: { value: 'email' } });
    fireEvent.click(screen.getByLabelText('Required'));

    expect(screen.getByLabelText('Field label')).toHaveValue('Full name');
    expect(screen.getByLabelText('Field key')).toHaveValue('full_name');
    expect(screen.getByLabelText('Field type')).toHaveValue('email');
    expect(screen.getByLabelText('Required')).toBeChecked();
    expect(screen.getByLabelText('Field key')).toHaveAttribute('aria-invalid', 'true');
  });

  it('adds and removes a field', () => {
    render(<FieldConfiguratorHarness initialFields={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add field' }));
    expect(screen.getByLabelText('Field label')).toHaveValue('New field');
    expect(screen.getByLabelText('Field key')).toHaveValue('field_1');

    fireEvent.click(screen.getByRole('button', { name: 'Remove New field' }));
    expect(screen.getByText('Add at least one field to collect a submission.')).toBeInTheDocument();
  });
});
