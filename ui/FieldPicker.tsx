import * as React from 'react';
import { ArrayShape, ObjectShape, ScalarShape, Shape } from 'shape';
import { PanelResult } from '../shared/state';
import { title } from '../shared/text';
import { Button } from './component-library/Button';
import { Input } from './component-library/Input';
import { Select } from './component-library/Select';

export type FieldGroup = { name: string; elements: Array<[string, Shape]> };

export function orderedObjectFields(
  o: ObjectShape,
  preferredDefaultType: 'number' | 'string' = 'string'
) {
  const fields = Object.entries(o.children);
  fields.sort(([aName, a], [bName, b]) => {
    if (a.kind === 'scalar' && b.kind === 'scalar') {
      const ass = a as ScalarShape;
      const bss = b as ScalarShape;
      if (ass.name !== bss.name) {
        if (ass.name === preferredDefaultType) {
          return -1;
        }

        if (bss.name === preferredDefaultType) {
          return 1;
        }
      }
    }

    if (a.kind !== 'scalar' && b.kind === 'scalar') {
      return 1;
    }

    return aName > bName ? 1 : -1;
  });

  const groups: Array<FieldGroup> = [];
  fields.forEach(([field, shape]) => {
    const ss = shape as ScalarShape;
    const scalar = shape.kind === 'scalar';
    let last = groups[groups.length - 1];

    // If first time, start a new group with this name
    if (!last) {
      groups.push({
        name: scalar ? title(ss.name) : 'Other',
        elements: [[field, shape]],
      });
      return;
    }

    // If needed, create a new group for scalars
    if (scalar && last.name != title(ss.name)) {
      groups.push({
        name: title(ss.name),
        elements: [[field, shape]],
      });
      return;
    }

    // Start the "Other" group when needed
    if (!scalar && last.name !== 'Other') {
      groups.push({
        name: 'Other',
        elements: [[field, shape]],
      });
      return;
    }

    last.elements.push([field, shape]);
  });
  return groups;
}

function renderOptions(group: FieldGroup, grouped: boolean) {
  const options = group.elements.map(([name]) => (
    <option key={name} value={name}>
      {name}
    </option>
  ));

  if (grouped) {
    return (
      <optgroup key={group.name} label={group.name}>
        {options}
      </optgroup>
    );
  }

  return options;
}

function wellFormedGraphInput(panelSourceResult: PanelResult) {
  return (
    panelSourceResult &&
    panelSourceResult.shape &&
    panelSourceResult.shape.kind === 'array' &&
    (panelSourceResult.shape as ArrayShape).children.kind === 'object'
  );
}

export function unusedFields(data: PanelResult, ...fields: Array<string>) {
  if (!wellFormedGraphInput(data)) {
    return 0;
  }

  const os = (data.shape as ArrayShape).children as ObjectShape;
  return Object.keys(os.children).filter((field) => {
    return !fields.includes(field);
  }).length;
}

export function FieldPicker({
  onChange,
  label,
  value,
  panelSourceResult,
  labelValue,
  labelOnChange,
  onDelete,
  preferredDefaultType,
  used,
}: {
  onChange: (v: string) => void;
  label: string;
  value: string;
  panelSourceResult: PanelResult;
  labelValue?: string;
  labelOnChange?: (v: string) => void;
  onDelete?: () => void;
  preferredDefaultType?: 'number' | 'string';
  used?: Array<string>;
}) {
  // Default the label to the field name
  const [labelModified, setLabelModified] = React.useState(false);
  React.useEffect(() => {
    if (
      labelOnChange &&
      !labelModified &&
      value &&
      title(value) !== labelValue
    ) {
      labelOnChange(title(value));
    }
  }, [value, labelValue, labelModified, labelOnChange]);

  const labelOnChangeWrapper = (v: string) => {
    setLabelModified(true);
    return labelOnChange(v);
  };

  let fieldPicker = null;
  if (wellFormedGraphInput(panelSourceResult)) {
    const fieldGroups = orderedObjectFields(
      (panelSourceResult.shape as ArrayShape).children as ObjectShape,
      preferredDefaultType
    );
    fieldPicker = (
      <Select label={label} value={value} onChange={onChange} used={used}>
        {fieldGroups.length === 1
          ? renderOptions(fieldGroups[0], false)
          : fieldGroups.map((fg) => renderOptions(fg, true))}
      </Select>
    );
  } else {
    fieldPicker = <Input label={label} value={value} onChange={onChange} />;
  }

  if (!labelOnChange) {
    return fieldPicker;
  }

  return (
    <React.Fragment>
      {onDelete && (
        <Button icon onClick={onDelete} type="outline">
          delete
        </Button>
      )}
      {fieldPicker}
      <Input label="Label" value={labelValue} onChange={labelOnChangeWrapper} />
    </React.Fragment>
  );
}
