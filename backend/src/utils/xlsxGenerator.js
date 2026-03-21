import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const CAMPAIGN_COLUMNS = Object.freeze([
  'Nombre Cliente',
  'Cliente ID',
  'Telefonos',
  'Emails',
  'Direccion',
  'Score General',
  'Riesgo',
  'Canal Recomendado',
  'Razon Operativa'
]);

const normalizeText = (value) => String(value || '').trim();
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const backendRootDir = path.resolve(moduleDir, '..', '..');

const sanitizePathSegment = (value) =>
  normalizeText(value)
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'campaign';

export const resolveCampaignUploadsDir = () =>
  path.resolve(backendRootDir, 'uploads', 'campaigns');

const buildSafeRelativeFilePath = (nombreArchivo) => {
  const normalizedPath = String(nombreArchivo || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map((segment) => sanitizePathSegment(segment));

  if (normalizedPath.length === 0) {
    normalizedPath.push('campaign');
  }

  const lastIndex = normalizedPath.length - 1;
  if (!normalizedPath[lastIndex].toLowerCase().endsWith('.xlsx')) {
    normalizedPath[lastIndex] = `${normalizedPath[lastIndex]}.xlsx`;
  }

  return path.join(...normalizedPath);
};

const joinArrayValues = (value) =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => normalizeText(item)).filter(Boolean))).join(', ')
    : normalizeText(value);

const normalizeChannelValue = (value) => normalizeText(value).toUpperCase() || null;

const buildRowFingerprint = (row = {}) => {
  const clientId =
    normalizeText(row.ClienteID ?? row.clienteId ?? row.cliente_id ?? row['Cliente ID']) || '-';
  const channel = normalizeChannelValue(
    row.Canal ?? row.canal ?? row.canalRecomendado ?? row.canal_recomendado ?? row['Canal Recomendado']
  );
  const phone = joinArrayValues(row.Telefono ?? row.telefono ?? row.telefonos ?? row['Telefonos']);

  return [clientId, channel || '-', phone || '-'].join('::');
};

const mapRowToSheetShape = (row = {}) => ({
  'Nombre Cliente': row.Nombre ?? row.nombre ?? row.nombre_completo ?? null,
  'Cliente ID': row.ClienteID ?? row.clienteId ?? row.cliente_id ?? null,
  Telefonos: row.Telefono ?? row.telefono ?? joinArrayValues(row.telefonos) ?? null,
  Emails: row.Email ?? row.email ?? joinArrayValues(row.emails) ?? null,
  Direccion: row.Direccion ?? row.direccion ?? null,
  'Score General': row.Score ?? row.score ?? row.scoreGeneral ?? row.score_general ?? null,
  Riesgo: normalizeText(row.Riesgo ?? row.riesgo).toUpperCase() || null,
  'Canal Recomendado': normalizeChannelValue(
    row.Canal ?? row.canal ?? row.canalRecomendado ?? row.canal_recomendado
  ),
  'Razon Operativa': row.Razon ?? row.razon ?? null
});

const CAMPAIGN_COLUMN_WIDTHS = Object.freeze([
  { wch: 32 },
  { wch: 24 },
  { wch: 26 },
  { wch: 28 },
  { wch: 44 },
  { wch: 12 },
  { wch: 12 },
  { wch: 22 },
  { wch: 52 }
]);

export const createCampaignWorkbookWriter = (nombreArchivo) => {
  const safeRelativePath = buildSafeRelativeFilePath(nombreArchivo);
  const absolutePath = path.join(resolveCampaignUploadsDir(), safeRelativePath);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([CAMPAIGN_COLUMNS]);
  let appendedRows = 0;
  const seenFingerprints = new Set();

  worksheet['!cols'] = [...CAMPAIGN_COLUMN_WIDTHS];
  worksheet['!autofilter'] = { ref: `A1:I1` };

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Campana');

  return {
    absolutePath,
    relativePath: safeRelativePath,
    getRowCount: () => appendedRows,
    async appendRows(data = []) {
      const rows = (Array.isArray(data) ? data : [])
        .filter((row) => {
          const fingerprint = buildRowFingerprint(row);
          if (seenFingerprints.has(fingerprint)) {
            return false;
          }

          seenFingerprints.add(fingerprint);
          return true;
        })
        .map(mapRowToSheetShape);
      if (!rows.length) {
        return appendedRows;
      }

      XLSX.utils.sheet_add_json(worksheet, rows, {
        header: CAMPAIGN_COLUMNS,
        skipHeader: true,
        origin: -1
      });

      appendedRows += rows.length;
      worksheet['!autofilter'] = {
        ref: `A1:I${Math.max(appendedRows + 1, 1)}`
      };
      return appendedRows;
    },
    async finalize() {
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      XLSX.writeFile(workbook, absolutePath);
      return absolutePath;
    }
  };
};

export const generarArchivo = async (nombreArchivo, data = []) => {
  const writer = createCampaignWorkbookWriter(nombreArchivo);
  await writer.appendRows(data);
  return writer.finalize();
};

export default {
  createCampaignWorkbookWriter,
  generarArchivo,
  resolveCampaignUploadsDir
};
