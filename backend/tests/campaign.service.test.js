import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

const campaignService = await import('../src/services/campaignService.js');
const { generarArchivo, resolveCampaignUploadsDir } = await import('../src/utils/xlsxGenerator.js');

test('generarCampaña agrupa clientes por canal recomendado y devuelve shape operativo', async () => {
  let receivedFilters = null;
  const generatedFiles = [];
  const persistedCampaigns = [];

  const result = await campaignService.generarCampaña(
    {
      riesgo: 'medio',
      scoreMin: 40,
      scoreMax: 80,
      portafolioId: 7
    },
    ['WHATSAPP', 'VISITA'],
    {
      isMongoConfigured: () => true,
      concurrency: 1,
      listClientsContactedToday: async () => [],
      listClients: async (filters) => {
        receivedFilters = filters;

        return [
          {
            client_id: 'client-1',
            nombre: 'Ana',
            apellido_paterno: 'Lopez',
            telefonos: ['5551111111', '5552222222'],
            emails: ['ana@example.com'],
            linea1: 'Av. Reforma 1',
            ciudad: 'CDMX',
            estado: 'CDMX',
            codigo_postal: '06000',
            scoring_global: '61',
            scoring_riesgo_nivel: 'MEDIO'
          },
          {
            client_id: 'client-2',
            nombre: 'Luis',
            apellido_paterno: 'Perez',
            linea1: 'Calle 2',
            ciudad: 'Monterrey',
            estado: 'NL',
            codigo_postal: '64000',
            scoring_global: '55',
            scoring_riesgo_nivel: 'MEDIO'
          }
        ];
      },
      strategyResolver: async () => ({ accion: 'DETENER', canal: null, razon: 'n/a' }),
      createdBy: 'user-1',
      now: new Date('2026-03-20T10:00:00.000Z'),
      fileGenerator: async (fileName, data) => {
        generatedFiles.push({ fileName, data });
        return `/uploads/campaigns/${fileName}.xlsx`;
      },
      CampaignModel: {
        create: async (payload) => {
          persistedCampaigns.push(payload);
          return payload;
        }
      }
    }
  );

  assert.deepEqual(receivedFilters, {
    portafolioId: 7,
    riesgo: 'MEDIO',
    scoreMin: 40,
    scoreMax: 80,
    limit: undefined,
    offset: undefined,
    afterClientInternalId: undefined
  });
  assert.deepEqual(result.llamada, []);
  assert.deepEqual(result.sms, []);
  assert.deepEqual(result.email, []);
  assert.deepEqual(result.whatsapp, []);
  assert.deepEqual(result.visita, []);
  assert.equal(generatedFiles.length, 0);
  assert.equal(persistedCampaigns.length, 1);
  assert.equal(persistedCampaigns[0].estado, 'GENERADA');
  assert.equal(String(persistedCampaigns[0].creadoPor).length, 24);
  assert.deepEqual(persistedCampaigns[0].canales, ['WHATSAPP', 'VISITA']);
  assert.deepEqual(persistedCampaigns[0].archivos, {});
  assert.equal(persistedCampaigns[0].totalClientes, 0);
});

test('generarCampaña filtra solo CONTACTAR o VISITAR, respeta canales solicitados y datos de contacto', async () => {
  const decisions = [
    { accion: 'CONTACTAR', canal: 'WHATSAPP', razon: 'Canal no explorado' },
    { accion: 'VISITAR', canal: 'VISITA', razon: 'Visita elegible' },
    { accion: 'DETENER', canal: null, razon: 'Stop' },
    { accion: 'CONTACTAR', canal: 'EMAIL', razon: 'Correo viable' }
  ];
  const persistedCampaigns = [];
  const generatedFiles = [];

  const result = await campaignService.generarCampaña(
    {},
    ['WHATSAPP', 'VISITA', 'EMAIL'],
    {
      isMongoConfigured: () => true,
      concurrency: 1,
      listClientsContactedToday: async () => [],
      listClients: async () => [
        {
          client_id: 'client-1',
          nombre: 'Ana',
          apellido_paterno: 'Lopez',
          telefonos: ['5551111111', '5552222222'],
          emails: ['ana@example.com'],
          linea1: 'Av. Reforma 1',
          ciudad: 'CDMX',
          estado: 'CDMX',
          codigo_postal: '06000',
          scoring_global: '61',
          scoring_riesgo_nivel: 'MEDIO'
        },
        {
          client_id: 'client-2',
          nombre: 'Luis',
          apellido_paterno: 'Perez',
          linea1: 'Calle 2',
          ciudad: 'Monterrey',
          estado: 'NL',
          codigo_postal: '64000',
          scoring_global: '55',
          scoring_riesgo_nivel: 'MEDIO'
        },
        {
          client_id: 'client-3',
          nombre: 'Eva',
          apellido_paterno: 'Ruiz',
          telefonos: ['5553333333'],
          scoring_global: '20',
          scoring_riesgo_nivel: 'ALTO'
        },
        {
          client_id: 'client-4',
          nombre: 'Mario',
          apellido_paterno: 'Diaz',
          telefonos: ['5554444444'],
          scoring_global: '70',
          scoring_riesgo_nivel: 'BAJO'
        }
      ],
      strategyResolver: async () => decisions.shift(),
      createdBy: 'user-2',
      now: new Date('2026-03-20T12:00:00.000Z'),
      fileGenerator: async (fileName, data) => {
        generatedFiles.push({ fileName, data });
        return `/uploads/campaigns/${fileName}.xlsx`;
      },
      CampaignModel: {
        create: async (payload) => {
          persistedCampaigns.push(payload);
          return payload;
        }
      }
    }
  );

  assert.equal(result.whatsapp.length, 1);
  assert.deepEqual(result.whatsapp[0], {
    clienteId: 'client-1',
    nombre: 'Ana Lopez',
    telefonos: ['5551111111', '5552222222'],
    emails: ['ana@example.com'],
    direccion: 'Av. Reforma 1, CDMX, CDMX, 06000',
    scoreGeneral: 61,
    riesgo: 'MEDIO',
    canalRecomendado: 'WHATSAPP',
    razon: 'Canal no explorado'
  });
  assert.equal(result.visita.length, 1);
  assert.equal(result.visita[0].clienteId, 'client-2');
  assert.equal(result.visita[0].canalRecomendado, 'VISITA');
  assert.equal(result.email.length, 0);
  assert.equal(result.llamada.length, 0);
  assert.equal(result.sms.length, 0);
  assert.equal(generatedFiles.length, 2);
  assert.deepEqual(
    generatedFiles.map((entry) => entry.fileName),
    [
      'campaign_global_whatsapp_visita_email_20260320_120000_20260320_120000/whatsapp',
      'campaign_global_whatsapp_visita_email_20260320_120000_20260320_120000/visita'
    ]
  );
  assert.equal(generatedFiles[0].data.length, 1);
  assert.equal(generatedFiles[1].data.length, 1);
  assert.equal(persistedCampaigns.length, 1);
  assert.equal(persistedCampaigns[0].estado, 'GENERADA');
  assert.equal(persistedCampaigns[0].totalClientes, 2);
  assert.deepEqual(persistedCampaigns[0].canales, ['WHATSAPP', 'VISITA', 'EMAIL']);
  assert.deepEqual(persistedCampaigns[0].archivos, {
    whatsapp: '/uploads/campaigns/campaign_global_whatsapp_visita_email_20260320_120000_20260320_120000/whatsapp.xlsx',
    visita: '/uploads/campaigns/campaign_global_whatsapp_visita_email_20260320_120000_20260320_120000/visita.xlsx'
  });
});

test('generarCampaña valida rangos de score antes de consultar clientes', async () => {
  await assert.rejects(
    campaignService.generarCampaña(
      {
        scoreMin: 80,
        scoreMax: 40
      },
      [],
      {
        isMongoConfigured: () => true,
        listClients: async () => []
      }
    ),
    /scoreMin no puede ser mayor a scoreMax/i
  );
});

test('generarCampaña excluye bloqueados, clientes con contacto hoy y conserva solo el canal más prioritario por cliente', async () => {
  const generatedFiles = [];
  const persistedCampaigns = [];
  let strategyCallCount = 0;

  const result = await campaignService.generarCampaña(
    {},
    ['VISITA', 'LLAMADA', 'WHATSAPP', 'SMS', 'EMAIL'],
    {
      isMongoConfigured: () => true,
      concurrency: 1,
      listClientsContactedToday: async () => ['client-3'],
      listClients: async () => [
        {
          client_id: 'client-1',
          nombre: 'Ana',
          apellido_paterno: 'Lopez',
          telefonos: ['5551111111'],
          emails: ['ana@example.com'],
          linea1: 'Av. Reforma 1',
          ciudad: 'CDMX',
          estado: 'CDMX',
          codigo_postal: '06000',
          scoring_global: '61',
          scoring_riesgo_nivel: 'MEDIO'
        },
        {
          client_id: 'client-1',
          nombre: 'Ana',
          apellido_paterno: 'Lopez',
          telefonos: ['5551111111'],
          emails: ['ana@example.com'],
          linea1: 'Av. Reforma 1',
          ciudad: 'CDMX',
          estado: 'CDMX',
          codigo_postal: '06000',
          scoring_global: '61',
          scoring_riesgo_nivel: 'MEDIO'
        },
        {
          client_id: 'client-2',
          nombre: 'Luis',
          apellido_paterno: 'Perez',
          telefonos: ['5552222222'],
          scoring_bloquear_cliente: true,
          scoring_global: '75',
          scoring_riesgo_nivel: 'BAJO'
        },
        {
          client_id: 'client-3',
          nombre: 'Eva',
          apellido_paterno: 'Ruiz',
          telefonos: ['5553333333'],
          scoring_global: '52',
          scoring_riesgo_nivel: 'MEDIO'
        },
        {
          client_id: 'client-4',
          nombre: 'Mario',
          apellido_paterno: 'Diaz',
          telefonos: ['5554444444'],
          emails: ['mario@example.com'],
          scoring_global: '48',
          scoring_riesgo_nivel: 'MEDIO'
        }
      ],
      strategyResolver: async () => {
        strategyCallCount += 1;
        return [
          { accion: 'CONTACTAR', canal: 'EMAIL', razon: 'Email posible' },
          { accion: 'CONTACTAR', canal: 'LLAMADA', razon: 'Llamada prioritaria' },
          { accion: 'DETENER', canal: null, razon: 'Stop' }
        ][strategyCallCount - 1];
      },
      createdBy: 'user-3',
      now: new Date('2026-03-20T13:00:00.000Z'),
      fileGenerator: async (fileName, data) => {
        generatedFiles.push({ fileName, data });
        return `/uploads/campaigns/${fileName}.xlsx`;
      },
      CampaignModel: {
        create: async (payload) => {
          persistedCampaigns.push(payload);
          return payload;
        }
      }
    }
  );

  assert.equal(strategyCallCount, 3);
  assert.equal(result.visita.length, 0);
  assert.equal(result.whatsapp.length, 0);
  assert.equal(result.sms.length, 0);
  assert.equal(result.email.length, 0);
  assert.equal(result.llamada.length, 1);
  assert.deepEqual(result.llamada[0], {
    clienteId: 'client-1',
    nombre: 'Ana Lopez',
    telefonos: ['5551111111'],
    emails: ['ana@example.com'],
    direccion: 'Av. Reforma 1, CDMX, CDMX, 06000',
    scoreGeneral: 61,
    riesgo: 'MEDIO',
    canalRecomendado: 'LLAMADA',
    razon: 'Llamada prioritaria'
  });
  assert.equal(persistedCampaigns.length, 1);
  assert.equal(persistedCampaigns[0].totalClientes, 1);
  assert.equal(generatedFiles.length, 1);
  assert.equal(generatedFiles[0].fileName.includes('/llamada'), true);
});

test('generarCampaña pagina clientes por lotes para procesar volúmenes grandes', async () => {
  const listCalls = [];
  const decisions = [
    { accion: 'CONTACTAR', canal: 'LLAMADA', razon: 'Llamada prioritaria' },
    { accion: 'CONTACTAR', canal: 'LLAMADA', razon: 'Llamada prioritaria' },
    { accion: 'CONTACTAR', canal: 'EMAIL', razon: 'Correo viable' },
    { accion: 'VISITAR', canal: 'VISITA', razon: 'Visita prioritaria' },
    { accion: 'CONTACTAR', canal: 'LLAMADA', razon: 'Llamada prioritaria' }
  ];
  const sourceRows = [
    {
      client_id: 'client-1',
      client_internal_id: 1,
      nombre: 'Ana',
      apellido_paterno: 'Lopez',
      telefonos: ['5551111111'],
      scoring_global: '61',
      scoring_riesgo_nivel: 'MEDIO'
    },
    {
      client_id: 'client-2',
      client_internal_id: 2,
      nombre: 'Luis',
      apellido_paterno: 'Perez',
      telefonos: ['5552222222'],
      scoring_global: '52',
      scoring_riesgo_nivel: 'MEDIO'
    },
    {
      client_id: 'client-3',
      client_internal_id: 3,
      nombre: 'Eva',
      apellido_paterno: 'Ruiz',
      emails: ['eva@example.com'],
      email: 'eva@example.com',
      scoring_global: '45',
      scoring_riesgo_nivel: 'MEDIO'
    },
    {
      client_id: 'client-4',
      client_internal_id: 4,
      nombre: 'Mario',
      apellido_paterno: 'Diaz',
      linea1: 'Calle 4',
      ciudad: 'CDMX',
      estado: 'CDMX',
      codigo_postal: '06000',
      scoring_global: '73',
      scoring_riesgo_nivel: 'BAJO'
    },
    {
      client_id: 'client-5',
      client_internal_id: 5,
      nombre: 'Sofia',
      apellido_paterno: 'Neri',
      telefonos: ['5555555555'],
      scoring_global: '67',
      scoring_riesgo_nivel: 'MEDIO'
    }
  ];

  const result = await campaignService.generarCampaña(
    {},
    ['LLAMADA', 'WHATSAPP', 'EMAIL', 'VISITA'],
    {
      isMongoConfigured: () => true,
      paginateClients: true,
      batchSize: 2,
      listClients: async ({ limit, offset }) => {
        listCalls.push({ limit, offset });
        return sourceRows.slice(offset, offset + limit);
      },
      listClientsContactedToday: async () => [],
      strategyResolver: async () => decisions.shift(),
      createdBy: 'user-4',
      now: new Date('2026-03-20T15:00:00.000Z'),
      fileGenerator: async (fileName) => `/uploads/campaigns/${fileName}.xlsx`,
      CampaignModel: {
        create: async (payload) => payload
      }
    }
  );

  assert.deepEqual(listCalls, [
    { limit: 2, offset: 0 },
    { limit: 2, offset: 2 },
    { limit: 2, offset: 4 }
  ]);
  assert.equal(result.llamada.length, 3);
  assert.equal(result.email.length, 1);
  assert.equal(result.visita.length, 1);
});

test('obtenerArchivoCampaña devuelve descriptor valido para descarga', async () => {
  const absolutePath = await generarArchivo('test-suite-download/whatsapp_campaign', [
    {
      nombre: 'Ana Lopez',
      clienteId: 'client-1',
      telefonos: ['5551111111'],
      direccion: 'Av. Reforma 1',
      scoreGeneral: 72,
      riesgo: 'BAJO',
      canalRecomendado: 'WHATSAPP',
      razon: 'Canal no explorado'
    }
  ]);

  try {
    const descriptor = await campaignService.obtenerArchivoCampaña('campaign-1', 'WHATSAPP', {
      CampaignModel: {
        findById: () => ({
          lean: async () => ({
            _id: 'campaign-1',
            archivos: {
              whatsapp: absolutePath
            }
          })
        })
      }
    });

    assert.equal(descriptor.absolutePath, absolutePath);
    assert.equal(descriptor.fileName, path.basename(absolutePath));
    assert.equal(descriptor.canal, 'WHATSAPP');
    assert.equal(descriptor.absolutePath.startsWith(resolveCampaignUploadsDir()), true);
  } finally {
    await fs.rm(path.join(resolveCampaignUploadsDir(), 'test-suite-download'), {
      recursive: true,
      force: true
    });
  }
});
