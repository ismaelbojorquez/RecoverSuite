import {
  Add,
  Delete,
  Edit,
  Info,
  Refresh
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState, useCallback } from 'react';
import BaseDialog from './BaseDialog.jsx';
import BaseTable from './BaseTable.jsx';
import EmptyState from './EmptyState.jsx';
import FormActions from './form/FormActions.jsx';
import FormField from './form/FormField.jsx';
import FormSection from './form/FormSection.jsx';
import useNotify from '../hooks/useNotify.jsx';
import {
  createSaldoField,
  deleteSaldoField,
  listSaldoFields,
  updateSaldoField
} from '../services/saldoFields.js';
import { extractDependencies, buildGraph, topologicalSort } from '../utils/calculatedFields.js';
import { Parser } from 'expr-eval';

const fieldTypeOptions = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'currency', label: 'Moneda' },
  { value: 'date', label: 'Fecha' },
  { value: 'time', label: 'Hora' },
  { value: 'datetime', label: 'Fecha/Hora' },
  { value: 'boolean', label: 'Booleano' }
];

const valueTypeOptions = [
  { value: 'dynamic', label: 'Dinámico' },
  { value: 'calculated', label: 'Calculado' }
];

const defaultForm = {
  label: '',
  key: '',
  field_type: 'text',
  value_type: 'dynamic',
  required: false,
  visible: true,
  order_index: 0,
  calc_expression: ''
};

const exprParser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    additive: true,
    multiplicative: true,
    power: true,
    factorial: false
  }
});

const validateForm = (form, existingFields, editingId) => {
  const errors = {};
  if (!form.label.trim()) errors.label = 'Label es requerido';
  if (!form.key.trim()) errors.key = 'Key es requerido';
  if (/\s/.test(form.key)) errors.key = 'Key no debe tener espacios';
  const duplicate = existingFields.find(
    (f) => f.key?.toLowerCase() === form.key.trim().toLowerCase() && f.id !== editingId
  );
  if (duplicate) errors.key = 'Key ya existe en el portafolio';
  if (!fieldTypeOptions.some((opt) => opt.value === form.field_type)) {
    errors.field_type = 'Tipo de campo inválido';
  }
  if (!valueTypeOptions.some((opt) => opt.value === form.value_type)) {
    errors.value_type = 'Origen inválido';
  }
  if (form.value_type === 'calculated' && !form.calc_expression.trim()) {
    errors.calc_expression = 'Expresión requerida para calculados';
  }
  if (form.order_index !== '' && !Number.isInteger(Number(form.order_index))) {
    errors.order_index = 'Orden debe ser entero';
  }

  if (form.value_type === 'calculated' && form.calc_expression.trim()) {
    const deps = Array.from(extractDependencies(form.calc_expression));
    const keys = new Set(
      existingFields
        .filter((f) => f.id === editingId || f.key) // all keys
        .map((f) => f.key)
    );
    const missing = deps.filter((dep) => !keys.has(dep));
    if (missing.length) {
      errors.calc_expression = `Referencias inexistentes: ${missing.join(', ')}`;
    } else {
      // syntax
      let exprText = form.calc_expression;
      deps.forEach((dep, idx) => {
        const safeVar = `v${idx}`;
        const re = new RegExp(`\\{${dep.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\}`, 'g');
        exprText = exprText.replace(re, safeVar);
      });
      try {
        exprParser.parse(exprText);
      } catch (err) {
        errors.calc_expression = `Expresión inválida: ${err.message}`;
      }
    }

    // cycle detection
    const futureFields = existingFields.map((f) =>
      f.id === editingId
        ? {
            ...f,
            key: form.key.trim(),
            calc_expression: form.calc_expression
          }
        : f
    );
    if (!editingId) {
      futureFields.push({
        id: -1,
        key: form.key.trim(),
        calc_expression: form.calc_expression,
        value_type: 'calculated'
      });
    }
    const calcFields = futureFields.filter(
      (f) => (f.value_type || f.valueType) === 'calculated'
    );
    const graph = buildGraph(calcFields);
    const { hasCycle } = topologicalSort(graph);
    if (hasCycle) {
      errors.calc_expression = 'Dependencia circular detectada';
    }
  }

  return errors;
};

export default function SaldoFieldsManager({ open, onClose, portfolio }) {
  const { notify } = useNotify();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadFields = useCallback(
    async (signal) => {
      if (!portfolio?.id) return;
      setLoading(true);
      setError('');
      try {
        const data = await listSaldoFields({ portfolioId: portfolio.id, signal });
        setFields(data);
      } catch (err) {
        if (!signal?.aborted) {
          const message = err.message || 'No fue posible cargar campos de saldo.';
          setError(message);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [portfolio?.id]
  );

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    loadFields(controller.signal);
    return () => controller.abort();
  }, [open, loadFields]);

  const columns = useMemo(
    () => [
      { id: 'order_index', label: 'Orden', render: (row) => row.order_index ?? 0 },
      { id: 'label', label: 'Label' },
      { id: 'key', label: 'Key' },
      {
        id: 'field_type',
        label: 'Tipo de campo',
        render: (row) => row.field_type
      },
      {
        id: 'value_type',
        label: 'Origen',
        render: (row) =>
          row.value_type === 'calculated' ? (
            <Chip size="small" label="Calculado" color="info" variant="outlined" />
          ) : (
            <Chip size="small" label="Dinámico" color="primary" variant="outlined" />
          )
      },
      {
        id: 'visible',
        label: 'Visible',
        render: (row) =>
          row.visible ? (
            <Chip size="small" label="Sí" color="success" variant="outlined" />
          ) : (
            <Chip size="small" label="No" variant="outlined" />
          )
      },
      {
        id: 'actions',
        label: 'Acciones',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title="Editar">
              <IconButton size="small" onClick={() => openEdit(row)}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Eliminar">
              <IconButton size="small" color="error" onClick={() => handleDelete(row)}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )
      }
    ],
    []
  );

  const openCreate = () => {
    setForm({ ...defaultForm, order_index: (fields.length || 0) + 1 });
    setFormErrors({});
    setModalMode('create');
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setForm({
      label: row.label || '',
      key: row.key || '',
      field_type: row.field_type || 'text',
      value_type: row.value_type || 'dynamic',
      required: Boolean(row.required),
      visible: Boolean(row.visible),
      order_index: row.order_index ?? 0,
      calc_expression: row.calc_expression || ''
    });
    setFormErrors({});
    setModalMode('edit');
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    const confirm = window.confirm(
      `¿Eliminar el campo "${row.label}"? No se permitirá si está en uso.`
    );
    if (!confirm) return;
    try {
      await deleteSaldoField({ fieldId: row.id });
      notify.success('Campo eliminado.');
      loadFields();
    } catch (err) {
      notify.error(err.message || 'No fue posible eliminar el campo.');
    }
  };

  const handleSave = async () => {
    const errors = validateForm(form, fields, editingId);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        key: form.key.trim(),
        field_type: form.field_type,
        value_type: form.value_type,
        required: Boolean(form.required),
        visible: Boolean(form.visible),
        order_index: Number(form.order_index) || 0,
        calc_expression: form.value_type === 'calculated' ? form.calc_expression.trim() : null
      };

      if (modalMode === 'create') {
        await createSaldoField({ portfolioId: portfolio.id, data: payload });
        notify.success('Campo creado.');
      } else if (editingId) {
        await updateSaldoField({ fieldId: editingId, data: payload });
        notify.success('Campo actualizado.');
      }
      setModalOpen(false);
      setEditingId(null);
      loadFields();
    } catch (err) {
      notify.error(err.message || 'No fue posible guardar el campo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Campos de saldo"
      subtitle={portfolio ? `Portafolio: ${portfolio.name || portfolio.id}` : ''}
      maxWidth="lg"
      actions={
        <Stack direction="row" spacing={1}>
          <Button startIcon={<Refresh />} onClick={() => loadFields()} disabled={loading}>
            Recargar
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={openCreate}>
            Nuevo campo
          </Button>
        </Stack>
      }
    >
      {error ? <Alert severity="error" className="crm-alert--spaced">{error}</Alert> : null}
      <BaseTable
        columns={columns}
        rows={fields}
        loading={loading}
        emptyContent={
          <EmptyState
            title="Sin campos de saldo"
            description="Crea campos para capturar saldos de este portafolio."
          />
        }
        pagination={null}
      />

      <BaseDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? 'Nuevo campo' : 'Editar campo'}
        subtitle="Configura la metadata del campo de saldo"
        maxWidth="md"
        actions={
          <FormActions spacing={1}>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              Guardar
            </Button>
          </FormActions>
        }
      >
        <Stack className="crm-form">
          <FormSection
            title="Definicion del campo"
            subtitle="Configura la identidad tecnica y el tipo de dato del saldo."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormField
                  label="Label"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                  error={formErrors.label}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField
                  label="Key"
                  value={form.key}
                  onChange={(e) => setForm((prev) => ({ ...prev, key: e.target.value }))}
                  error={formErrors.key}
                  helperText={formErrors.key || 'Sin espacios; unico por portafolio.'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField
                  component={TextField}
                  select
                  label="Tipo de campo"
                  value={form.field_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, field_type: e.target.value }))}
                  SelectProps={{ native: true }}
                  error={formErrors.field_type}
                >
                  {fieldTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormField
                  component={TextField}
                  select
                  label="Origen"
                  value={form.value_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, value_type: e.target.value }))}
                  SelectProps={{ native: true }}
                  error={formErrors.value_type}
                >
                  {valueTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </FormField>
              </Grid>
            </Grid>
          </FormSection>

          <FormSection
            title="Comportamiento"
            subtitle="Ajusta orden, visibilidad y obligatoriedad del campo."
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormField
                  label="Orden"
                  type="number"
                  value={form.order_index}
                  onChange={(e) => setForm((prev) => ({ ...prev, order_index: e.target.value }))}
                  error={formErrors.order_index}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack className="crm-form__stack">
                  <FormControlLabel
                    className="crm-form__toggle-row"
                    control={
                      <Switch
                        checked={form.visible}
                        onChange={(e) => setForm((prev) => ({ ...prev, visible: e.target.checked }))}
                      />
                    }
                    label="Visible"
                  />
                  <FormControlLabel
                    className="crm-form__toggle-row"
                    control={
                      <Switch
                        checked={form.required}
                        onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
                      />
                    }
                    label="Requerido"
                  />
                </Stack>
              </Grid>
            </Grid>
          </FormSection>

          {form.value_type === 'calculated' ? (
            <FormSection
              title="Expresion calculada"
              subtitle="Usa referencias a otros campos; la validacion final ocurre en backend."
            >
              <Stack className="crm-form__stack">
                <FormField
                  label="Expresion"
                  value={form.calc_expression}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, calc_expression: e.target.value }))
                  }
                  multiline
                  minRows={3}
                  error={formErrors.calc_expression}
                  helperText={
                    formErrors.calc_expression ||
                    'Sintaxis: usa nombres de otros campos como variables; no se evalua en el frontend.'
                  }
                />
                <Paper variant="outlined" className="crm-saldo-fields__syntax-help">
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Info fontSize="small" />
                    <Typography variant="subtitle2">Ayuda de sintaxis</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    - Usa operadores aritmeticos (+ - * /) y nombres de campos como variables.
                    {'\n'}- Las expresiones se validan en backend; aqui solo se captura texto.
                    {'\n'}- No se ejecutan calculos en frontend.
                  </Typography>
                </Paper>
              </Stack>
            </FormSection>
          ) : null}
        </Stack>
      </BaseDialog>
    </BaseDialog>
  );
}
