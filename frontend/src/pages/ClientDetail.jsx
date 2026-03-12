import {
  AccountBalanceWalletOutlined,
  ArrowBack,
  DashboardOutlined,
  PercentOutlined,
  SupportAgentOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Can from '../components/Can.jsx';
import { Page, PageContent, PageHeader } from '../components/layout/Page.jsx';
import usePermissions from '../hooks/usePermissions.js';
import useNotify from '../hooks/useNotify.jsx';
import useNavigation from '../hooks/useNavigation.js';
import { getClientDetail } from '../services/clients.js';
import { createGestion, listHistorialGestiones, listResultadosGestion } from '../services/gestiones.js';
import { buildRoutePath, getRouteParams } from '../routes/paths.js';
import BalancesWidget from '../modules/clientDetail/widgets/BalancesWidget.jsx';
import ClientInfoWidget from '../modules/clientDetail/widgets/ClientInfoWidget.jsx';
import ContactsWidget from '../modules/clientDetail/widgets/ContactsWidget.jsx';
import CreditsWidget from '../modules/clientDetail/widgets/CreditsWidget.jsx';
import GestionesWidget from '../modules/clientDetail/widgets/GestionesWidget.jsx';
import NegotiationsWidget from '../modules/clientDetail/widgets/NegotiationsWidget.jsx';
import PaymentsWidget from '../modules/clientDetail/widgets/PaymentsWidget.jsx';

const DETAIL_TAB_VALUES = {
  summary: 'summary',
  gestiones: 'gestiones',
  financiero: 'financiero',
  negociaciones: 'negociaciones'
};

const getClientIdFromPath = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = getRouteParams('clientDetail', window.location.pathname);
  const id = (params?.id || '').trim();
  return id || null;
};


const resolveClientFullName = (client) =>
  [client?.nombre, client?.apellido_paterno, client?.apellido_materno].filter(Boolean).join(' ');

const resolvePrimaryPhone = (contacts) => {
  if (!Array.isArray(contacts?.phones) || contacts.phones.length === 0) {
    return '';
  }

  return String(contacts.phones[0]?.telefono || '').trim();
};

const resolvePrimaryEmail = (contacts) => {
  if (!Array.isArray(contacts?.emails) || contacts.emails.length === 0) {
    return '';
  }

  return String(contacts.emails[0]?.email || '').trim();
};

export default function ClientDetail({ routeParams }) {
  const { hasPermission } = usePermissions();
  const { notify } = useNotify();
  const canRead = hasPermission('clients.read');
  const canLog = hasPermission('gestiones.create');
  const canViewGestiones =
    hasPermission('gestiones.view_all') ||
    hasPermission('gestiones.view_portfolio') ||
    hasPermission('gestiones.view_own');
  const canReadNegotiations = hasPermission('negotiations.read');
  const canWriteNegotiations = hasPermission('negotiations.write');
  const { navigate } = useNavigation();

  const clientId = useMemo(() => {
    const fromRoute = (routeParams?.id || '').trim();
    if (fromRoute) {
      return fromRoute;
    }

    return getClientIdFromPath();
  }, [routeParams]);

  const [portafolioId, setPortafolioId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [resultados, setResultados] = useState([]);
  const [resultadosLoading, setResultadosLoading] = useState(false);
  const [form, setForm] = useState({
    resultado_id: '',
    comentario: '',
    promesa_monto: '',
    promesa_fecha: ''
  });
  const [savingGestion, setSavingGestion] = useState(false);
  const [formError, setFormError] = useState('');

  const [gestiones, setGestiones] = useState([]);
  const [gestionesLoading, setGestionesLoading] = useState(false);
  const [gestionesError, setGestionesError] = useState('');
  const [gestionesPage, setGestionesPage] = useState(0);
  const [gestionesHasNext, setGestionesHasNext] = useState(false);
  const gestionesRowsPerPage = 20;

  const [activeTab, setActiveTab] = useState(DETAIL_TAB_VALUES.summary);
  const emptyPayments = useMemo(() => [], []);

  useEffect(() => {
    if (!canRead) {
      return undefined;
    }

    if (!clientId) {
      setError('Cliente no valido.');
      return undefined;
    }

    const controller = new AbortController();

    const fetchDetail = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getClientDetail({
          id: clientId,
          signal: controller.signal
        });

        if (data?.client?.portafolio_id) {
          setPortafolioId(data.client.portafolio_id);
        }

        setDetail(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || 'No fue posible cargar el cliente.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => controller.abort();
  }, [canRead, clientId]);

  useEffect(() => {
    if (!canRead && activeTab !== DETAIL_TAB_VALUES.summary) {
      setActiveTab(DETAIL_TAB_VALUES.summary);
      return;
    }

    if (!canReadNegotiations && activeTab === DETAIL_TAB_VALUES.negociaciones) {
      setActiveTab(DETAIL_TAB_VALUES.summary);
    }
  }, [activeTab, canRead, canReadNegotiations]);

  const loadGestiones = useCallback(
    async (opts = {}) => {
      if (!canRead || !clientId || !portafolioId) {
        return;
      }

      const page = Number.isInteger(opts.page) && opts.page >= 0 ? opts.page : 0;
      const offset = page * gestionesRowsPerPage;

      setGestionesLoading(true);
      setGestionesError('');

      try {
        const { data } = await listHistorialGestiones({
          clienteId: clientId,
          portafolioId,
          limit: gestionesRowsPerPage,
          offset
        });

        setGestiones(data);
        setGestionesHasNext(data.length === gestionesRowsPerPage);
      } catch (err) {
        setGestionesError(err.message || 'No fue posible cargar el historial de gestiones.');
        setGestiones([]);
        setGestionesHasNext(false);
      } finally {
        setGestionesLoading(false);
      }
    },
    [canRead, clientId, gestionesRowsPerPage, portafolioId]
  );

  useEffect(() => {
    if (!canLog || !portafolioId) {
      return;
    }

    setResultadosLoading(true);
    listResultadosGestion({ portafolioId })
      .then((data) => setResultados(data))
      .catch(() => {
        notify('No se pudieron cargar los resultados de gestion', { severity: 'error' });
      })
      .finally(() => setResultadosLoading(false));
  }, [canLog, notify, portafolioId]);

  useEffect(() => {
    if (!canRead || !canViewGestiones || !clientId || !portafolioId) {
      return;
    }

    setGestionesPage(0);
    loadGestiones({ page: 0 });
  }, [canRead, canViewGestiones, clientId, loadGestiones, portafolioId]);

  const client = detail?.client;
  const credits = detail?.credits || [];
  const contacts = detail?.contacts || { phones: [], emails: [], addresses: [] };
  const isReady = Boolean(detail);
  const clientFullName = resolveClientFullName(client);
  const primaryPhone = resolvePrimaryPhone(contacts);
  const primaryEmail = resolvePrimaryEmail(contacts);

  const detailMetrics = useMemo(
    () => [
      { id: 'portfolio', label: `Portafolio ${portafolioId || '-'}` },
      { id: 'credits', label: `${credits.length} creditos` },
      { id: 'phones', label: `${contacts.phones?.length || 0} telefonos` },
      { id: 'emails', label: `${contacts.emails?.length || 0} emails` },
      { id: 'addresses', label: `${contacts.addresses?.length || 0} direcciones` }
    ],
    [contacts.addresses?.length, contacts.emails?.length, contacts.phones?.length, credits.length, portafolioId]
  );

  const selectedResultado = resultados.find(
    (item) => String(item.id) === String(form.resultado_id)
  );
  const requierePromesa = Boolean(selectedResultado?.requiere_promesa);

  const balanceColumns = useMemo(() => {
    const columnMap = new Map();

    credits.forEach((credit) => {
      (credit.balances || []).forEach((balance) => {
        const field = balance.campo_saldo;
        if (!field?.id) {
          return;
        }

        if (!columnMap.has(field.id)) {
          columnMap.set(field.id, {
            id: field.id,
            label: field.etiqueta_visual || field.nombre_campo || `Saldo ${field.id}`,
            tipo_dato: field.tipo_dato,
            orden: field.orden,
            es_principal: Boolean(field.es_principal)
          });
        }
      });
    });

    const columns = Array.from(columnMap.values());
    columns.sort((a, b) => {
      if (a.es_principal !== b.es_principal) {
        return a.es_principal ? -1 : 1;
      }

      const orderA = Number.isFinite(a.orden) ? a.orden : Number.MAX_SAFE_INTEGER;
      const orderB = Number.isFinite(b.orden) ? b.orden : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return a.label.localeCompare(b.label, 'es');
    });

    return columns;
  }, [credits]);

  const balancesByCredit = useMemo(() => {
    const map = new Map();

    credits.forEach((credit) => {
      const balanceMap = new Map();
      (credit.balances || []).forEach((balance) => {
        if (balance.campo_saldo_id) {
          balanceMap.set(balance.campo_saldo_id, balance);
        }
      });
      map.set(credit.id, balanceMap);
    });

    return map;
  }, [credits]);

  const handleRegisterGestion = useCallback(async () => {
    setFormError('');

    const resultadoId = form.resultado_id;
    const comentario = (form.comentario || '').trim();

    if (!resultadoId) {
      setFormError('Selecciona un resultado.');
      return;
    }

    if (!comentario) {
      setFormError('El comentario es obligatorio.');
      return;
    }

    if (!portafolioId) {
      setFormError('No hay portafolio asociado al cliente.');
      return;
    }

    const payload = {
      portafolio_id: portafolioId,
      cliente_id: clientId,
      credito_id: credits[0]?.id || null,
      resultado_id: resultadoId,
      comentario,
      fecha_gestion: new Date().toISOString()
    };

    if (requierePromesa) {
      if (!form.promesa_monto || Number.parseFloat(form.promesa_monto) <= 0) {
        setFormError('Ingresa un monto de promesa valido.');
        return;
      }

      if (!form.promesa_fecha) {
        setFormError('Ingresa la fecha de promesa.');
        return;
      }

      payload.promesa_monto = Number.parseFloat(form.promesa_monto);
      payload.promesa_fecha = new Date(form.promesa_fecha).toISOString();
    }

    try {
      setSavingGestion(true);
      await createGestion(payload);
      notify('Gestion registrada', { severity: 'success' });

      if (canViewGestiones) {
        setGestionesPage(0);
        loadGestiones({ page: 0 });
      }

      setForm({
        resultado_id: '',
        comentario: '',
        promesa_monto: '',
        promesa_fecha: ''
      });
    } catch (err) {
      setFormError(err.message || 'No fue posible registrar la gestion.');
    } finally {
      setSavingGestion(false);
    }
  }, [
    canViewGestiones,
    clientId,
    credits,
    form,
    loadGestiones,
    notify,
    portafolioId,
    requierePromesa
  ]);

  const handleLoadMoreGestiones = useCallback(() => {
    const nextPage = gestionesPage + 1;
    setGestionesPage(nextPage);
    loadGestiones({ page: nextPage });
  }, [gestionesPage, loadGestiones]);

  const handleClearFormError = useCallback(() => {
    setFormError('');
  }, []);

  const handleClearGestionesError = useCallback(() => {
    setGestionesError('');
  }, []);

  const handleTabChange = useCallback((_, nextTab) => {
    setActiveTab(nextTab);
  }, []);

  if (!canRead) {
    return (
      <Paper variant="page">
        <Stack spacing={1}>
          <Typography variant="h6">Sin permisos</Typography>
          <Typography variant="body2" color="text.secondary">
            No tienes acceso para ver clientes.
          </Typography>
        </Stack>
      </Paper>
    );
  }

  const breadcrumbs = [
    { label: 'Inicio', href: buildRoutePath('dashboard') },
    {
      label: 'Clientes',
      href: portafolioId
        ? buildRoutePath('clients', {}, { portafolio_id: portafolioId })
        : buildRoutePath('clients')
    },
    { label: 'Detalle' }
  ];

  return (
    <Page>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Detalle del cliente"
        subtitle={portafolioId ? `Portafolio ${portafolioId}` : 'Vista integral del cliente'}
        actions={
          <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap>
            <Can permission="clients.read">
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() =>
                  navigate(
                    portafolioId
                      ? buildRoutePath('clients', {}, { portafolio_id: portafolioId })
                      : buildRoutePath('clients')
                  )
                }
              >
                Volver
              </Button>
            </Can>
          </Stack>
        }
      />

      <PageContent>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper variant="panel" className="crm-client-detail__hero">
          {loading && !isReady ? (
            <Stack spacing={2}>
              <Skeleton variant="text" width="28%" height={28} />
              <Skeleton variant="text" width="56%" height={42} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} variant="rounded" width={120} height={26} />
                ))}
              </Stack>
              <Divider />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Box key={index} className="crm-client-detail__hero-meta-item">
                    <Skeleton variant="text" width={90} />
                    <Skeleton variant="text" width={180} />
                  </Box>
                ))}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={2.25}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', lg: 'center' }}
                spacing={2}
              >
                <Stack spacing={0.5}>
                  <Typography variant="overline" className="crm-label">
                    Ficha del cliente
                  </Typography>
                  <Typography variant="h4" className="crm-client-detail__hero-title">
                    {clientFullName || client?.nombre || 'Cliente sin nombre'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {client?.numero_cliente
                      ? `No. cliente ${client.numero_cliente}`
                      : `ID cliente ${client?.id || clientId || '-'}`}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {detailMetrics.map((metric) => (
                    <Chip key={metric.id} label={metric.label} variant="outlined" />
                  ))}
                </Stack>
              </Stack>

              <Divider />

              <Box className="crm-client-detail__hero-meta">
                <Box className="crm-client-detail__hero-meta-item">
                  <Typography variant="caption" color="text.secondary">
                    RFC
                  </Typography>
                  <Typography variant="body2">{client?.rfc || '-'}</Typography>
                </Box>
                <Box className="crm-client-detail__hero-meta-item">
                  <Typography variant="caption" color="text.secondary">
                    CURP
                  </Typography>
                  <Typography variant="body2">{client?.curp || '-'}</Typography>
                </Box>
                <Box className="crm-client-detail__hero-meta-item">
                  <Typography variant="caption" color="text.secondary">
                    Telefono principal
                  </Typography>
                  <Typography variant="body2">{primaryPhone || '-'}</Typography>
                </Box>
                <Box className="crm-client-detail__hero-meta-item">
                  <Typography variant="caption" color="text.secondary">
                    Email principal
                  </Typography>
                  <Typography variant="body2">{primaryEmail || '-'}</Typography>
                </Box>
                <Box className="crm-client-detail__hero-meta-item">
                  <Typography variant="caption" color="text.secondary">
                    ID publico
                  </Typography>
                  <Typography variant="body2">{client?.id || '-'}</Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </Paper>

        <Paper variant="panel-sm" className="crm-client-detail__tabs-shell">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            allowScrollButtonsMobile
            className="crm-client-detail__tabs"
          >
            <Tab
              icon={<DashboardOutlined fontSize="small" />}
              iconPosition="start"
              value={DETAIL_TAB_VALUES.summary}
              label="Resumen"
            />
            <Tab
              icon={<SupportAgentOutlined fontSize="small" />}
              iconPosition="start"
              value={DETAIL_TAB_VALUES.gestiones}
              label="Gestiones"
            />
            <Tab
              icon={<AccountBalanceWalletOutlined fontSize="small" />}
              iconPosition="start"
              value={DETAIL_TAB_VALUES.financiero}
              label="Financiero"
            />
            {canReadNegotiations && (
              <Tab
                icon={<PercentOutlined fontSize="small" />}
                iconPosition="start"
                value={DETAIL_TAB_VALUES.negociaciones}
                label="Negociaciones"
              />
            )}
          </Tabs>
        </Paper>

        {activeTab === DETAIL_TAB_VALUES.summary && (
          <Box className="crm-client-detail__tab-panel">
            <Box className="crm-client-detail__summary-grid">
              <Box className="crm-client-detail__summary-col crm-client-detail__summary-col--wide">
                <ClientInfoWidget
                  client={client}
                  contacts={contacts}
                  credits={credits}
                  loading={loading}
                  title="Datos del cliente"
                />
              </Box>

              <Box className="crm-client-detail__summary-col crm-client-detail__summary-col--narrow">
                <ContactsWidget
                  title="Contactabilidad"
                  contacts={contacts}
                  loading={loading}
                  isReady={isReady}
                />
              </Box>

              <Box className="crm-client-detail__summary-col crm-client-detail__summary-col--wide">
                <CreditsWidget
                  title="Creditos"
                  credits={credits}
                  balanceColumns={balanceColumns}
                  balancesByCredit={balancesByCredit}
                  loading={loading}
                  isReady={isReady}
                />
              </Box>

              <Box className="crm-client-detail__summary-col crm-client-detail__summary-col--narrow">
                <BalancesWidget
                  title="Saldos principales"
                  credits={credits}
                  balanceColumns={balanceColumns}
                  balancesByCredit={balancesByCredit}
                  loading={loading && !isReady}
                />
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === DETAIL_TAB_VALUES.gestiones && (
          <Box className="crm-client-detail__tab-panel">
            <GestionesWidget
              title="Gestiones y seguimiento"
              canLog={canLog}
              canViewGestiones={canViewGestiones}
              form={form}
              setForm={setForm}
              formError={formError}
              onFormErrorClear={handleClearFormError}
              resultados={resultados}
              resultadosLoading={resultadosLoading}
              requierePromesa={requierePromesa}
              savingGestion={savingGestion}
              onSubmit={handleRegisterGestion}
              gestiones={gestiones}
              gestionesLoading={gestionesLoading}
              gestionesError={gestionesError}
              onGestionesErrorClear={handleClearGestionesError}
              gestionesHasNext={gestionesHasNext}
              onLoadMore={handleLoadMoreGestiones}
              showForm={canLog}
              showHistory
            />
          </Box>
        )}

        {activeTab === DETAIL_TAB_VALUES.financiero && (
          <Box className="crm-client-detail__tab-panel">
            <Box className="crm-client-detail__financial-grid">
              <Box className="crm-client-detail__financial-col crm-client-detail__financial-col--wide">
                <CreditsWidget
                  title="Creditos y producto"
                  credits={credits}
                  balanceColumns={balanceColumns}
                  balancesByCredit={balancesByCredit}
                  loading={loading}
                  isReady={isReady}
                />
              </Box>

              <Box className="crm-client-detail__financial-col crm-client-detail__financial-col--narrow">
                <BalancesWidget
                  title="Detalle de saldos"
                  credits={credits}
                  balanceColumns={balanceColumns}
                  balancesByCredit={balancesByCredit}
                  loading={loading && !isReady}
                />
              </Box>

              <Box className="crm-client-detail__financial-col crm-client-detail__financial-col--full">
                <PaymentsWidget title="Pagos del cliente" payments={emptyPayments} loading={false} />
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === DETAIL_TAB_VALUES.negociaciones && canReadNegotiations && (
          <Box className="crm-client-detail__tab-panel">
            <NegotiationsWidget
              clientId={clientId}
              portafolioId={portafolioId}
              credits={credits}
              canRead={canReadNegotiations}
              canWrite={canWriteNegotiations}
            />
          </Box>
        )}

      </PageContent>
    </Page>
  );
}
