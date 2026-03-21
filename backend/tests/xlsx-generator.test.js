import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import XLSX from 'xlsx';

const { generarArchivo, resolveCampaignUploadsDir } = await import('../src/utils/xlsxGenerator.js');

test('generarArchivo crea xlsx en uploads/campaigns con columnas normalizadas y sin duplicados', async () => {
  const absolutePath = await generarArchivo('test-suite/whatsapp_campaign', [
    {
      nombre: 'Ana Lopez',
      clienteId: 'client-1',
      telefonos: ['5551111111', '5552222222'],
      emails: ['ana@example.com'],
      direccion: 'Av. Reforma 1',
      scoreGeneral: 72,
      riesgo: 'BAJO',
      canalRecomendado: 'WHATSAPP',
      razon: 'Canal no explorado'
    },
    {
      nombre: 'Ana Lopez',
      clienteId: 'client-1',
      telefonos: ['5551111111', '5552222222'],
      emails: ['ana@example.com'],
      direccion: 'Av. Reforma 1',
      scoreGeneral: 72,
      riesgo: 'bajo',
      canalRecomendado: 'whatsapp',
      razon: 'Canal no explorado'
    }
  ]);

  try {
    assert.equal(absolutePath.startsWith(resolveCampaignUploadsDir()), true);
    assert.equal(path.extname(absolutePath), '.xlsx');

    const workbook = XLSX.readFile(absolutePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });
    assert.equal(worksheet['!autofilter']?.ref, 'A1:I2');

    assert.deepEqual(rows, [
      {
        'Nombre Cliente': 'Ana Lopez',
        'Cliente ID': 'client-1',
        Telefonos: '5551111111, 5552222222',
        Emails: 'ana@example.com',
        Direccion: 'Av. Reforma 1',
        'Score General': 72,
        Riesgo: 'BAJO',
        'Canal Recomendado': 'WHATSAPP',
        'Razon Operativa': 'Canal no explorado'
      }
    ]);
  } finally {
    await fs.rm(path.join(resolveCampaignUploadsDir(), 'test-suite'), {
      recursive: true,
      force: true
    });
  }
});
