import {
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Chip,
  Paper,
  Autocomplete,
  TextField
} from '@mui/material';
import { CloudUpload, Refresh, PlayArrow, CheckCircle, ArrowBack, ArrowForward } from '@mui/icons-material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import { buildRoutePath } from '../routes/paths.js';
import useNotify from '../hooks/useNotify.jsx';
import { listPortfolios } from '../services/portfolios.js';
import {
  createImportSession,
  uploadImportFile,
  getImportPreview,
  getImportTargets,
  saveImportMapping,
  validateImportSession,
  runImportSession,
  getImportSession,
  downloadImportErrors
} from '../services/imports.js';
import BaseTable from '../components/BaseTable.jsx';
import BaseDialog from '../components/BaseDialog.jsx';

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const normalizeKey = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const steps = ['Portafolio', 'Archivo', 'Preview', 'Mapeo', 'Validar', 'Ejecutar'];
const STRATEGIES = [
  { value: 'UPSERT', label: 'Insertar o actualizar' },
  { value: 'ONLY_NEW', label: 'Solo nuevos' },
  { value: 'ONLY_UPDATE', label: 'Solo existentes' }
];

const headerSynonyms = {
  'credit.numero_credito': [
    'numero_credito',
    'credito',
    'no_credito',
    'num_credito',
    'id_credito',
    'numero de credito'
  ],
  'credit.producto': ['producto', 'plan', 'tipo_credito', 'tipo de credito'],
  'client.numero_cliente': ['id_cliente', 'cliente_id', 'numero_cliente', 'num_cliente', 'codigo_cliente'],
  'client.nombre_completo': ['nombre_completo', 'nombre completo', 'nombre', 'nombres'],
  'contact.phone': ['telefono', 'tel', 'celular', 'movil'],
  'contact.email': ['email', 'correo', 'correo_electronico']
};

const saldoSynonyms = ['saldo_actual', 'deuda_actual', 'saldo', 'balance', 'adeudo'];

const groupLabels = {
  credit: 'Crédito',
  client: 'Cliente',
  contacts: 'Contactos',
  addresses: 'Direcciones',
  saldo: 'Saldos dinámicos',
  balance: 'Balances'
};

const SYSTEM_TARGET_FIELDS = new Set(['credit.portafolio_id', 'credit.cliente_id']);

const REQUIRED_CORE_TARGETS = [
  'credit.numero_credito',
  'client.numero_cliente'
];
const REPEATABLE_CORE_TARGETS = new Set([
  'contact.phone',
  'contact.email',
  'client.phones[].telefono',
  'client.emails[].email',
  'address.linea1',
  'address.linea2',
  'address.ciudad',
  'address.estado',
  'address.codigo_postal',
  'address.pais',
  'client.addresses[].linea1',
  'client.addresses[].linea2',
  'client.addresses[].ciudad',
  'client.addresses[].estado',
  'client.addresses[].codigo_postal',
  'client.addresses[].pais'
]);

const FIELD_LABEL_OVERRIDES = {
  'credit.numero_credito': 'Número de crédito',
  'credit.producto': 'Producto del crédito',
  'client.numero_cliente': 'Número de cliente',
  'client.nombre_completo': 'Nombre del cliente',
  'client.rfc': 'RFC',
  'client.curp': 'CURP',
  'client.phones[].telefono': 'Teléfono',
  'client.emails[].email': 'Correo electrónico',
  'client.addresses[].linea1': 'Dirección - Línea 1',
  'client.addresses[].linea2': 'Dirección - Línea 2',
  'client.addresses[].ciudad': 'Dirección - Ciudad',
  'client.addresses[].estado': 'Dirección - Estado',
  'client.addresses[].codigo_postal': 'Dirección - Código postal',
  'client.addresses[].pais': 'Dirección - País'
};

const FIELD_DESTINATION_HINTS = {
  'credit.numero_credito': 'Se guarda en el registro del crédito (identificador único por portafolio).',
  'credit.producto': 'Se guarda en el tipo/producto del crédito.',
  'client.numero_cliente': 'Se usa como número de cliente del layout (obligatorio).',
  'client.nombre_completo': 'Se usa para construir el nombre interno del cliente.',
  'client.rfc': 'Se guarda en la ficha fiscal del cliente.',
  'client.curp': 'Se guarda en la ficha fiscal del cliente.',
  'client.phones[].telefono': 'Se guarda como teléfono del cliente.',
  'client.emails[].email': 'Se guarda como correo del cliente.',
  'client.addresses[].linea1': 'Se guarda como parte de la dirección del cliente.',
  'client.addresses[].linea2': 'Se guarda como parte de la dirección del cliente.',
  'client.addresses[].ciudad': 'Se guarda como parte de la dirección del cliente.',
  'client.addresses[].estado': 'Se guarda como parte de la dirección del cliente.',
  'client.addresses[].codigo_postal': 'Se guarda como parte de la dirección del cliente.',
  'client.addresses[].pais': 'Se guarda como parte de la dirección del cliente.'
};

const toFriendlyFieldLabel = (field) => {
  const path = field?.path || field?.targetField || '';
  if (FIELD_LABEL_OVERRIDES[path]) {
    return FIELD_LABEL_OVERRIDES[path];
  }
  const baseLabel = String(field?.label || '').replace(/^[^-]+-\s*/u, '').trim();
  return baseLabel || path || 'Campo';
};

const toDestinationHint = (field, groupKey) => {
  const path = field?.path || field?.targetField || '';
  if (FIELD_DESTINATION_HINTS[path]) {
    return FIELD_DESTINATION_HINTS[path];
  }
  if (groupKey === 'saldo') {
    return 'Se guarda como saldo dinámico del crédito.';
  }
  if (groupKey === 'balance') {
    return 'Se guarda como balance del crédito.';
  }
  if (groupKey === 'contacts') {
    return 'Se guarda en datos de contacto del cliente.';
  }
  if (groupKey === 'addresses') {
    return 'Se guarda en dirección del cliente.';
  }
  if (groupKey === 'client') {
    return 'Se guarda en la ficha del cliente.';
  }
  return 'Se guarda en el registro del crédito.';
};

// Fallback estático por si el endpoint de targets falla.
const FALLBACK_CORE_TARGETS = {
  credit: [
    {
      key: 'credit.numero_credito',
      label: 'Crédito - Número de crédito',
      path: 'credit.numero_credito',
      required: true
    },
    { key: 'credit.producto', label: 'Crédito - Producto', path: 'credit.producto', required: false }
  ],
  client: [
    {
      key: 'client.numero_cliente',
      label: 'Cliente - Número de cliente',
      path: 'client.numero_cliente',
      required: true
    },
    { key: 'client.nombre_completo', label: 'Cliente - Nombre completo', path: 'client.nombre_completo', required: false },
    { key: 'client.rfc', label: 'Cliente - RFC', path: 'client.rfc', required: false },
    { key: 'client.curp', label: 'Cliente - CURP', path: 'client.curp', required: false }
  ],
  contacts: [
    {
      key: 'contact.phone',
      label: 'Contacto - Teléfono',
      path: 'client.phones[].telefono',
      required: false
    },
    { key: 'contact.email', label: 'Contacto - Email', path: 'client.emails[].email', required: false }
  ],
  addresses: [
    {
      key: 'address.linea1',
      label: 'Dirección - Línea 1',
      path: 'client.addresses[].linea1',
      required: false
    },
    {
      key: 'address.linea2',
      label: 'Dirección - Línea 2',
      path: 'client.addresses[].linea2',
      required: false
    },
    {
      key: 'address.ciudad',
      label: 'Dirección - Ciudad',
      path: 'client.addresses[].ciudad',
      required: false
    },
    {
      key: 'address.estado',
      label: 'Dirección - Estado',
      path: 'client.addresses[].estado',
      required: false
    },
    {
      key: 'address.codigo_postal',
      label: 'Dirección - Código postal',
      path: 'client.addresses[].codigo_postal',
      required: false
    },
    {
      key: 'address.pais',
      label: 'Dirección - País',
      path: 'client.addresses[].pais',
      required: false
    }
  ]
};

const buildOptionKey = (group, item) => `${group}:${item.key}`;

const normalizeHeader = (value) => String(value ?? '').trim().toLowerCase();
const isHandledApiError = (err) => Number.isInteger(err?.status);

const buildOptionIndex = (options) => {
  const index = new Map();
  options.forEach((opt) => {
    const keys = [opt.label, opt.key, opt.targetField]
      .filter(Boolean)
      .map((k) => normalizeKey(k));
    keys.forEach((k) => {
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(opt);
    });
  });
  return index;
};

const suggestOption = (header, options) => {
  const normalizedHeader = normalizeKey(header);
  const index = buildOptionIndex(options);

  // Direct synonym match
  const synonymMatch =
    Object.entries(headerSynonyms).find(([target, list]) =>
      list.map(normalizeKey).includes(normalizedHeader)
    ) || null;

  if (synonymMatch) {
    const [_target, _list] = synonymMatch;
    const match = options.find(
      (opt) =>
        normalizeKey(opt.key) === normalizeKey(_target) ||
        normalizeKey(opt.targetField || '') === normalizeKey(_target)
    );
    if (match) return match.value;
  }

  // Saldo synonym with closest match
  const saldoOptions = options.filter((opt) => opt.targetType === 'saldo_field');
  if (saldoOptions.length) {
    const directSaldo = saldoOptions.find((opt) => {
      const nLabel = normalizeKey(opt.label);
      return (
        nLabel === normalizedHeader ||
        normalizeKey(opt.key).includes(normalizedHeader) ||
        normalizedHeader.includes(nLabel) ||
        saldoSynonyms.map(normalizeKey).includes(normalizedHeader)
      );
    });
    if (directSaldo) return directSaldo.value;
  }

  // Fuzzy: header contains label/key or viceversa
  const scored = options
    .map((opt) => {
      const labelKey = normalizeKey(opt.label);
      const keyKey = normalizeKey(opt.key);
      const score =
        labelKey === normalizedHeader ||
        keyKey === normalizedHeader ||
        labelKey.includes(normalizedHeader) ||
        normalizedHeader.includes(labelKey) ||
        keyKey.includes(normalizedHeader)
          ? 1
          : 0;
      return { opt, score };
    })
    .filter((item) => item.score > 0);

  if (scored.length) return scored[0].opt.value;

  const indexed = index.get(normalizedHeader);
  if (indexed?.length) return indexed[0].value;
  return null;
};

const EmptyNotice = ({ message }) => (
  <Paper variant="outlined" className="crm-credit-import__empty-notice">
    <Typography variant="body2">{message}</Typography>
  </Paper>
);

export default function CreditImport() {
  const { notify } = useNotify();
  const [activeStep, setActiveStep] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [portfolioId, setPortfolioId] = useState('');
  const [loadingPortfolios, setLoadingPortfolios] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [session, setSession] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState({ headers: [], rows: [] });
  const [targets, setTargets] = useState({
    core: FALLBACK_CORE_TARGETS,
    dynamicSaldo: { saldoFields: [], balanceFields: [], primaryBalanceIndex: null }
  });
  const [mapping, setMapping] = useState({});
  const [strategy, setStrategy] = useState('UPSERT');
  const [mappingSaved, setMappingSaved] = useState(false);
  const [validated, setValidated] = useState(false);
  const [running, setRunning] = useState(false);
  const [errors, setErrors] = useState('');
  const fileInputRef = useRef(null);
  const [downloadingErrors, setDownloadingErrors] = useState(false);
  const [downloadingRejected, setDownloadingRejected] = useState(false);

  const groupedOptions = useMemo(() => {
    if (!targets) return [];
    const groups = [];
    const core = targets.core || {};

    const mapCoreField = (groupKey, field) => ({
      label: toFriendlyFieldLabel(field),
      value: buildOptionKey(groupKey, field),
      key: field.key,
      targetType: 'core',
      targetField: field.path,
      path: field.path,
      group: groupLabels[groupKey],
      required: Boolean(field.required),
      destinationHint: toDestinationHint(field, groupKey)
    });

    if (core.credit) {
      const visibleCreditFields = core.credit.filter(
        (field) => !SYSTEM_TARGET_FIELDS.has(field.path || field.key)
      );
      groups.push({
        label: groupLabels.credit,
        options: visibleCreditFields.map((field) => mapCoreField('credit', field))
      });
    }
    if (core.client) {
      groups.push({
        label: groupLabels.client,
        options: core.client.map((field) => mapCoreField('client', field))
      });
    }
    if (core.contacts) {
      groups.push({
        label: groupLabels.contacts,
        options: core.contacts.map((field) => mapCoreField('contacts', field))
      });
    }
    if (core.addresses) {
      groups.push({
        label: groupLabels.addresses,
        options: core.addresses.map((field) => mapCoreField('addresses', field))
      });
    }

    const dynamic = targets.dynamicSaldo || {};
    if (Array.isArray(dynamic.saldoFields) && dynamic.saldoFields.length) {
      groups.push({
        label: groupLabels.saldo,
        options: dynamic.saldoFields.map((field) => ({
          label: toFriendlyFieldLabel(field),
          value: buildOptionKey('saldo', field),
          key: field.key || field.label,
          targetType: 'saldo_field',
          saldoFieldId: field.saldoFieldId,
          path: field.path,
          group: groupLabels.saldo,
          required: Boolean(field.required),
          destinationHint: toDestinationHint(field, 'saldo')
        }))
      });
    }

    if (Array.isArray(dynamic.balanceFields) && dynamic.balanceFields.length) {
      groups.push({
        label: groupLabels.balance,
        options: dynamic.balanceFields.map((field) => ({
          label: toFriendlyFieldLabel(field),
          value: buildOptionKey('balance', field),
          key: field.balanceFieldId || field.key,
          targetType: 'balance_field',
          saldoFieldId: field.balanceFieldId,
          path: field.path,
          group: groupLabels.balance,
          required: Boolean(field.required),
          destinationHint: toDestinationHint(field, 'balance')
        }))
      });
    }

    return groups;
  }, [targets]);

  const allOptions = useMemo(
    () => groupedOptions.flatMap((group) => group.options),
    [groupedOptions]
  );

  const dynamicRequiredOptions = useMemo(
    () => allOptions.filter((option) => option.targetType === 'saldo_field' && option.required),
    [allOptions]
  );

  const requiredFieldGuide = useMemo(() => {
    const optionByTarget = new Map();
    allOptions.forEach((option) => {
      if (option.targetField) {
        optionByTarget.set(option.targetField, option);
      }
    });

    return REQUIRED_CORE_TARGETS.map((targetField) => {
      const option = optionByTarget.get(targetField);
      return {
        targetField,
        label: option?.label || targetField
      };
    });
  }, [allOptions]);

  const mappedHeaders = useMemo(() => preview.headers || [], [preview.headers]);
  const headersByTarget = useMemo(() => {
    const index = new Map();
    Object.entries(mapping || {}).forEach(([target, headers]) => {
      if (!target || target === 'ignore') return;
      const validHeaders = Array.isArray(headers)
        ? Array.from(new Set(headers.filter((header) => mappedHeaders.includes(header))))
        : [];
      if (!validHeaders.length) return;
      index.set(target, validHeaders);
    });
    return index;
  }, [mappedHeaders, mapping]);

  const headerExamples = useMemo(() => {
    const headers = preview.headers || [];
    const rows = preview.rows || [];
    const examples = {};

    headers.forEach((header, colIdx) => {
      let sample = '';
      for (const row of rows) {
        const raw = row?.[colIdx];
        if (raw === undefined || raw === null) continue;
        const text = String(raw).trim();
        if (text) {
          sample = text.length > 60 ? `${text.slice(0, 57)}...` : text;
          break;
        }
      }
      examples[header] = sample;
    });

    return examples;
  }, [preview.headers, preview.rows]);

  useEffect(() => {
    if (!mappedHeaders.length || !allOptions.length) return;
    // Fill suggestions only for currently unmapped headers
    setMapping((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev || {}).map(([target, headers]) => [
          target,
          Array.isArray(headers) ? Array.from(new Set(headers)) : []
        ])
      );
      const assignedHeaders = new Set(
        Object.values(next).flatMap((headers) => (Array.isArray(headers) ? headers : []))
      );

      mappedHeaders.forEach((header) => {
        if (assignedHeaders.has(header)) return;
        const suggestion = suggestOption(header, allOptions);
        if (!suggestion) return;

        const current = Array.isArray(next[suggestion]) ? next[suggestion] : [];
        if (!current.includes(header)) {
          next[suggestion] = [...current, header];
        }
        assignedHeaders.add(header);
      });
      return next;
    });
  }, [allOptions, mappedHeaders]);

  const resetFlow = useCallback(() => {
    setSessionId(null);
    setSession(null);
    setFile(null);
    setPreview({ headers: [], rows: [] });
    setMapping({});
    setStrategy('UPSERT');
    setMappingSaved(false);
    setValidated(false);
    setActiveStep(0);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingPortfolios(true);
      try {
        const data = await listPortfolios({ limit: 50, offset: 0 });
        setPortfolios(data);
      } catch (err) {
        if (!isHandledApiError(err)) {
          notify.error(err.message || 'No se pudieron cargar portafolios');
        }
      } finally {
        setLoadingPortfolios(false);
      }
    };
    load();
  }, [notify]);

  const ensureSession = useCallback(
    async (selectedPortfolioId) => {
      if (!selectedPortfolioId) return null;
      if (sessionId && session?.portfolio_id === selectedPortfolioId) {
        return sessionId;
      }
      try {
        const resp = await createImportSession({ portfolioId: selectedPortfolioId });
        setSessionId(resp?.data?.id || resp?.id);
        setSession(resp?.data || resp);
        return resp?.data?.id || resp?.id;
      } catch (err) {
        if (!isHandledApiError(err)) {
          notify.error(err.message || 'No se pudo crear la sesión');
        }
        return null;
      }
    },
    [notify, session?.portfolio_id, sessionId]
  );

  const loadTargets = useCallback(
    async (portfolio) => {
      if (!portfolio) return;
      try {
        const resp = await getImportTargets({ portfolioId: portfolio });
        const data = resp?.data || resp;
        // Si el backend responde sin core (p.e. degradado), usamos fallback.
        if (!data?.core) {
          setTargets({
            core: FALLBACK_CORE_TARGETS,
            dynamicSaldo: { saldoFields: [], balanceFields: [], primaryBalanceIndex: null }
          });
          return;
        }
        setTargets(data);
      } catch (err) {
        if (!isHandledApiError(err)) {
          notify.error(err.message || 'No se pudieron cargar los targets de mapeo');
        }
        // Fallback local para permitir mapear aunque el endpoint falle.
        setTargets({
          core: FALLBACK_CORE_TARGETS,
          dynamicSaldo: { saldoFields: [], balanceFields: [], primaryBalanceIndex: null }
        });
      }
    },
    [notify]
  );

  useEffect(() => {
    if (portfolioId) {
      loadTargets(portfolioId);
    }
  }, [portfolioId, loadTargets]);

  const handlePortfolioChange = async (event) => {
    const value = event.target.value;
    resetFlow();
    setPortfolioId(value);
    const newSessionId = await ensureSession(value);
    if (newSessionId) {
      setActiveStep(1);
    }
  };

  const handleFileSelect = async (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setFile(selected);
  };

  const uploadFile = async () => {
    if (!file || !sessionId) {
      notify.error('Selecciona un archivo y portafolio primero');
      return;
    }
    setUploading(true);
    setErrors('');
    setValidated(false);
    try {
      const resp = await uploadImportFile({ sessionId, file });
      setSession(resp?.data || resp);
      const previewResp = await getImportPreview({ sessionId });
      setPreview(previewResp?.data || previewResp);
      // auto-suggest mapping
      const suggested = {};
      (previewResp?.headers || preview.headers || []).forEach((header) => {
        const suggestion = suggestOption(header, allOptions);
        if (suggestion) {
          if (!Array.isArray(suggested[suggestion])) {
            suggested[suggestion] = [];
          }
          if (!suggested[suggestion].includes(header)) {
            suggested[suggestion].push(header);
          }
        }
      });
      setMapping(suggested);
      setActiveStep(2);
    } catch (err) {
      if (!isHandledApiError(err)) {
        setErrors(err.message || 'No se pudo subir el archivo');
      }
    } finally {
      setUploading(false);
    }
  };

  const setTargetHeaders = (targetValue, headers) => {
    setMappingSaved(false);
    setValidated(false);
    setMapping((prev) => {
      const next = { ...(prev || {}) };
      const normalizedHeaders = Array.from(
        new Set(headers.filter((header) => mappedHeaders.includes(header)))
      );
      if (normalizedHeaders.length) {
        next[targetValue] = normalizedHeaders;
      } else {
        delete next[targetValue];
      }

      return next;
    });
  };

  const buildMappingPayload = () => {
    const entries = [];
    const optionHeaders = new Map(
      Object.entries(mapping || {}).map(([optionValue, headers]) => [
        optionValue,
        Array.isArray(headers) ? headers : []
      ])
    );

    mappedHeaders.forEach((header) => {
      let mapped = false;

      allOptions.forEach((opt) => {
        const selectedHeaders = optionHeaders.get(opt.value) || [];
        if (!selectedHeaders.includes(header)) {
          return;
        }

        mapped = true;
        if (opt.targetType === 'saldo_field' || opt.targetType === 'balance_field') {
          entries.push({
            column: header,
            action: 'map',
            targetType: opt.targetType,
            saldoFieldId: opt.saldoFieldId
          });
          return;
        }

        entries.push({
          column: header,
          action: 'map',
          targetType: 'core',
          targetField: opt.targetField
        });
      });

      if (!mapped) {
        entries.push({ column: header, action: 'ignore' });
      }
    });

    return entries;
  };

  const validateMappingRules = (payloadEntries) => {
    const errorsList = [];
    const collisions = new Map();
    payloadEntries.forEach((item) => {
      if (item.action === 'ignore') return;
      const key =
        item.targetType === 'core'
          ? item.targetField
          : `${item.targetType}:${item.saldoFieldId}`;
      if (collisions.has(key)) {
        collisions.get(key).push(item.column);
      } else {
        collisions.set(key, [item.column]);
      }
    });

    collisions.forEach((cols, key) => {
      if (cols.length > 1 && !REPEATABLE_CORE_TARGETS.has(key)) {
        errorsList.push(`Colisión: ${cols.join(', ')} apuntan a ${key}`);
      }
    });

    const selectedTargets = payloadEntries.filter((i) => i.action !== 'ignore');
    const selectedCoreTargets = new Set(
      selectedTargets.filter((item) => item.targetType === 'core').map((item) => item.targetField)
    );

    const missingCoreRequired = REQUIRED_CORE_TARGETS.filter(
      (targetField) => !selectedCoreTargets.has(targetField)
    );
    if (missingCoreRequired.length) {
      errorsList.push(
        `Faltan campos obligatorios: ${missingCoreRequired
          .map((targetField) => requiredFieldGuide.find((item) => item.targetField === targetField)?.label || targetField)
          .join(', ')}`
      );
    }

    dynamicRequiredOptions.forEach((option) => {
      const isMapped = selectedTargets.some(
        (item) =>
          item.targetType === 'saldo_field' &&
          Number(item.saldoFieldId) === Number(option.saldoFieldId)
      );
      if (!isMapped) {
        errorsList.push(`Falta mapear saldo obligatorio: ${option.label}`);
      }
    });

    return errorsList;
  };

  const saveMappingAndNext = async () => {
    if (!sessionId) {
      notify.error('No hay sesión activa');
      return;
    }
    try {
      const mappingPayload = buildMappingPayload();
      const mappingErrors = validateMappingRules(mappingPayload);
      if (mappingErrors.length) {
        setErrors(mappingErrors.join('. '));
        return;
      }
      await saveImportMapping({
        sessionId,
        mapping: mappingPayload,
        strategy
      });
      setMappingSaved(true);
      setValidated(false);
      setActiveStep(4);
    } catch (err) {
      if (!isHandledApiError(err)) {
        notify.error(err.message || 'No se pudo guardar el mapping');
      }
    }
  };

  const handleValidate = async () => {
    if (!sessionId) {
      notify.error('No hay sesión activa');
      return;
    }
    setErrors('');
    try {
      const resp = await validateImportSession({ sessionId });
      const sessionData = resp?.session || resp?.data || resp;
      setSession(sessionData);
      setValidated(true);
      setActiveStep(5);
    } catch (err) {
      if (!isHandledApiError(err)) {
        setErrors(err.message || 'No se pudo validar');
      }
    }
  };

  const pollSession = useCallback(
    async (signal) => {
      if (!sessionId) return;
      try {
        const resp = await getImportSession({ sessionId, signal });
        const data = resp?.data || resp;
        setSession(data);
        if (data?.status === 'COMPLETED' || data?.status === 'FAILED' || data?.status === 'CANCELED') {
          setRunning(false);
        }
      } catch (err) {
        if (!signal?.aborted) {
          if (!isHandledApiError(err)) {
            notify.error(err.message || 'No se pudo obtener el estado');
          }
        }
      }
    },
    [notify, sessionId]
  );

  const handleDownload = async (mode) => {
    if (!sessionId) return;
    const setFlag = mode === 'rejected' ? setDownloadingRejected : setDownloadingErrors;
    setFlag(true);
    try {
      const blob = await downloadImportErrors({ sessionId, mode });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        mode === 'rejected'
          ? `session-${sessionId}-rejected.csv`
          : `session-${sessionId}-errors.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (!isHandledApiError(err)) {
        notify.error(err.message || 'No se pudo descargar');
      }
    } finally {
      setFlag(false);
    }
  };

  useEffect(() => {
    if (!running) return undefined;
    const controller = new AbortController();
    pollSession(controller.signal);
    const interval = setInterval(() => pollSession(), 4000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [pollSession, running]);

  const handleRun = async () => {
    if (!sessionId) {
      notify.error('No hay sesión activa');
      return;
    }
    setRunning(true);
    setErrors('');
    try {
      const resp = await runImportSession({ sessionId });
      const sessionData = resp?.data || resp?.session || resp;
      setSession(sessionData);
    } catch (err) {
      if (!isHandledApiError(err)) {
        setErrors(err.message || 'No se pudo ejecutar la importación');
      }
      setRunning(false);
    }
  };

  const previewContent = (
    <BaseTable
      dense
      columns={(preview.headers || []).map((h) => ({ id: h, label: h }))}
      rows={(preview.rows || []).slice(0, 5).map((row, idx) => {
        const data = {};
        preview.headers?.forEach((header, hIdx) => {
          data[header] = row[hIdx];
        });
        return { id: idx, ...data };
      })}
      emptyMessage="No hay datos para previsualizar"
    />
  );

  const mappingContent = (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl size="small" className="crm-credit-import__strategy-control">
          <InputLabel>Estrategia</InputLabel>
          <Select
            value={strategy}
            label="Estrategia"
            onChange={(e) => setStrategy(e.target.value)}
          >
            {STRATEGIES.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Alert severity="info">
        <Stack spacing={0.5}>
          <Typography variant="body2">
            Campos mínimos obligatorios: <strong>{requiredFieldGuide.map((item) => item.label).join(', ')}</strong>.
          </Typography>
          <Typography variant="body2">
            Cliente: <strong>Número de cliente</strong> es obligatorio. Si no existe en el portafolio, agrega también <strong>nombre completo</strong> para crearlo.
          </Typography>
          {dynamicRequiredOptions.length > 0 && (
            <Typography variant="body2">
              Saldos obligatorios para este portafolio:{' '}
              <strong>{dynamicRequiredOptions.map((item) => item.label).join(', ')}</strong>.
            </Typography>
          )}
        </Stack>
      </Alert>
      {groupedOptions.map((group) => (
        <Card key={group.label} variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="subtitle1">{group.label}</Typography>
              {group.options.map((option) => {
                const selectedHeaders = headersByTarget.get(option.value) || [];
                const targetKey =
                  option.targetType === 'core'
                    ? option.targetField || option.key
                    : `${option.targetType}:${option.saldoFieldId}`;
                const isRepeatable =
                  option.targetType === 'core' && REPEATABLE_CORE_TARGETS.has(targetKey);
                const missingRequired = option.required && selectedHeaders.length === 0;

                return (
                  <Card key={option.value} variant="outlined">
                    <CardContent>
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2">{option.label}</Typography>
                          <Stack direction="row" spacing={1}>
                            {option.required && <Chip size="small" color="primary" label="Obligatorio" />}
                            {isRepeatable && <Chip size="small" label="Múltiple" />}
                            {selectedHeaders.length > 0 && <Chip size="small" label="Asignado" />}
                          </Stack>
                        </Stack>
                        <Autocomplete
                          multiple={isRepeatable}
                          options={mappedHeaders}
                          value={isRepeatable ? selectedHeaders : selectedHeaders[0] || null}
                          onChange={(_event, newValue) => {
                            if (isRepeatable) {
                              const values = Array.isArray(newValue)
                                ? Array.from(new Set(newValue.filter(Boolean)))
                                : [];
                              setTargetHeaders(option.value, values);
                              return;
                            }
                            setTargetHeaders(option.value, newValue ? [newValue] : []);
                          }}
                          getOptionLabel={(header) => String(header)}
                          renderOption={(props, header) => (
                            <li {...props} key={`${option.value}:${header}`}>
                              <Stack spacing={0.25} sx={{ width: '100%' }}>
                                <Typography variant="body2">{header}</Typography>
                                {headerExamples[header] && (
                                  <Typography variant="caption" color="text.secondary">
                                    Ejemplo: {headerExamples[header]}
                                  </Typography>
                                )}
                              </Stack>
                            </li>
                          )}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={isRepeatable ? 'Columnas del archivo' : 'Columna del archivo'}
                              margin="normal"
                              fullWidth
                              error={missingRequired}
                              helperText={missingRequired ? 'Campo obligatorio sin asignar.' : ''}
                            />
                          )}
                          clearOnBlur
                          includeInputInList
                          noOptionsText="Sin columnas disponibles"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {option.destinationHint}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  const validateContent = (
    <Stack spacing={2}>
      <Button variant="contained" onClick={handleValidate} disabled={!sessionId}>
        Ejecutar validación
      </Button>
      {validated && (
        <Alert severity="success">
          Validación completada.
        </Alert>
      )}
      {errors && <Alert severity="error">{errors}</Alert>}
    </Stack>
  );

  const runContent = (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={handleRun}
          disabled={running}
        >
          Ejecutar importación
        </Button>
        {running && <LinearProgress className="crm-credit-import__run-progress" />}
      </Stack>
      {(session?.status || running) && (
        <Alert
          severity={session?.status === 'COMPLETED' ? 'success' : 'info'}
          icon={<CheckCircle fontSize="inherit" />}
        >
          {`Estado: ${session?.status || (running ? 'RUNNING' : 'PENDING')}`}
        </Alert>
      )}
      <Stack direction="row" spacing={2}>
        <Button
          variant="outlined"
          onClick={() => handleDownload('errors')}
          disabled={!sessionId || downloadingErrors}
        >
          {downloadingErrors ? 'Descargando...' : 'Descargar errores'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => handleDownload('rejected')}
          disabled={!sessionId || downloadingRejected}
        >
          {downloadingRejected ? 'Descargando...' : 'Descargar filas rechazadas'}
        </Button>
      </Stack>
      {errors && <Alert severity="error">{errors}</Alert>}
    </Stack>
  );

  const uploadCard = (
    <Card variant="outlined" className="crm-credit-import__upload-card">
      <Stack spacing={2} alignItems="center" justifyContent="center">
        <CloudUpload fontSize="large" color="primary" />
        <Typography variant="body2" color="text.secondary">
          Arrastra y suelta el archivo CSV/XLSX o usa el botón
        </Typography>
        <Button variant="contained" onClick={() => fileInputRef.current?.click()}>
          Elegir archivo
        </Button>
        {file && (
          <Chip
            label={`${file.name} (${Math.round(file.size / 1024)} KB)`}
            onDelete={() => setFile(null)}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx"
          hidden
          className="crm-credit-import__file-input"
          onChange={handleFileSelect}
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={uploadFile}
          disabled={uploading || !file}
        >
          Subir y previsualizar
        </Button>
        {uploading && <LinearProgress className="crm-credit-import__upload-progress" />}
        {errors && <Alert severity="error">{errors}</Alert>}
      </Stack>
    </Card>
  );

const stepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Selecciona el portafolio para acotar los saldos dinámicos y permisos de carga.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Portafolio</InputLabel>
              <Select
                value={portfolioId}
                label="Portafolio"
                onChange={handlePortfolioChange}
                disabled={loadingPortfolios}
              >
                {portfolios.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        );
      case 1:
        return uploadCard;
      case 2:
        return preview.rows?.length ? previewContent : <EmptyNotice message="No hay preview" />;
      case 3:
        return mappingContent;
      case 4:
        return validateContent;
      case 5:
        return runContent;
      default:
        return null;
    }
  };

  const canContinue = () => {
    if (activeStep === 0) return !!portfolioId;
    if (activeStep === 1) return preview.rows?.length > 0;
    if (activeStep === 2) return preview.rows?.length > 0;
    if (activeStep === 3) return !!sessionId && mappedHeaders.length > 0;
    if (activeStep === 4) return validated;
    return false;
  };

  const goNext = async () => {
    if (activeStep === 2) {
      setActiveStep(3);
      return;
    }
    if (activeStep === 3) {
      await saveMappingAndNext();
      return;
    }
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  return (
    <Page>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: buildRoutePath('dashboard') },
          { label: 'Importación de información' }
        ]}
        title="Importación de información"
        subtitle="Asistente para cargar clientes, créditos, teléfonos, correos, direcciones y saldos con mapeo y validación previa."
      />
      <PageContent>
        <Card variant="outlined">
          <CardContent>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            <Divider className="crm-credit-import__divider" />
            {stepContent()}
            <Divider className="crm-credit-import__divider" />
            <Stack direction="row" spacing={2} justifyContent="space-between">
              <Button
                startIcon={<ArrowBack />}
                onClick={goBack}
                disabled={activeStep === 0}
              >
                Atrás
              </Button>
              {activeStep < steps.length - 1 && (
                <Button
                  variant="contained"
                  endIcon={<ArrowForward />}
                  onClick={goNext}
                  disabled={!canContinue()}
                >
                  Continuar
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <BaseDialog
          open={Boolean(errors)}
          title="Error"
          onClose={() => setErrors('')}
          actions={
            <Button onClick={() => setErrors('')} color="primary">
              Cerrar
            </Button>
          }
        >
          <Typography variant="body2">{errors}</Typography>
        </BaseDialog>
      </PageContent>
    </Page>
  );
}
