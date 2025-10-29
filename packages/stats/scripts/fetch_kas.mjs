#!/usr/bin/env node
/**
 * Fetch Kosovo ASKdata PxWeb series and save JSON outputs without Python.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const API_BASES = [
  'https://askdata.rks-gov.net/PXWeb/api/v1',
  'https://askdata.rks-gov.net/api/v1',
];

export const PATHS = {
  trade_monthly: ['ASKdata', 'External trade', 'Monthly indicators', '08_qarkullimi.px'],
  energy_monthly: ['ASKdata', 'Energy', 'Monthly indicators', 'tab01.px'],
  imports_by_partner: ['ASKdata', 'External trade', 'Monthly indicators', '07_imp_country.px'],
  fuel_gasoline: ['ASKdata', 'Energy', 'Monthly indicators', 'tab03.px'],
  fuel_diesel: ['ASKdata', 'Energy', 'Monthly indicators', 'tab04.px'],
  fuel_lng: ['ASKdata', 'Energy', 'Monthly indicators', 'tab05.px'],
  fuel_jet: ['ASKdata', 'Energy', 'Monthly indicators', 'tab06.px'],
  tourism_region: ['ASKdata', 'Tourism and hotels', 'Treguesit mujorë', 'tab01.px'],
  tourism_country: ['ASKdata', 'Tourism and hotels', 'Treguesit mujorë', 'tab02.px'],
};

const FUEL_SPECS = {
  gasoline: { path_key: 'fuel_gasoline', label: 'Gasoline' },
  diesel: { path_key: 'fuel_diesel', label: 'Diesel' },
  lng: { path_key: 'fuel_lng', label: 'LNG' },
  jet: { path_key: 'fuel_jet', label: 'Jet / kerosene' },
};

const USER_AGENT = 'kas-pxweb-fetch/1.1 (kosovatools.org)';

export class PxError extends Error {}

function jsonStringify(obj) {
  return JSON.stringify(obj, (_key, value) => value ?? null, 2);
}

export function coerceNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number(value);
  const str = String(value).trim();
  if (!str || ['.', '..', '...', '-'].includes(str)) return null;
  const cleaned = str.replace(/\u00a0/g, '').replace(/,/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
}

export function tidyNumber(value) {
  if (value === null || value === undefined) return null;
  if (Number.isInteger(Number(value))) return Number(value);
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function slugifyLabel(text) {
  const slug = text.toLowerCase().trim().replace(/[^0-9a-z]+/gi, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return slug || 'value';
}

function normalizeFuelField(label) {
  const l = label.toLowerCase();
  if (l.includes('ready') && l.includes('market')) return 'ready_for_market';
  if (l.includes('production')) return 'production';
  if (l.includes('import')) return 'import';
  if (l.includes('export')) return 'export';
  if (l.includes('stock')) return 'stock';
  return slugifyLabel(label);
}

function normalizeTourismMetric(label) {
  const l = label.toLowerCase();
  return l.includes('night') ? 'nights' : 'visitors';
}

function normalizeGroupLabel(label) {
  const l = label.toLowerCase();
  if (l.startsWith('tot')) return 'total';
  if (l.startsWith('loc')) return 'local';
  if (l.startsWith('ext')) return 'external';
  return slugifyLabel(label);
}

export function normalizeYM(code) {
  if (/^\d{6}$/.test(code)) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  if (code.includes('M')) {
    const [year, month] = code.split('M', 2);
    return `${year}-${month.padStart(2, '0')}`;
  }
  if (code.length === 7 && code[4] === '-') return code;
  return code;
}

function apiJoin(base, parts, lang = 'en') {
  const segs = [base.replace(/\/+$/, ''), lang, ...parts.map((p) => encodeURIComponent(p))];
  return segs.join('/');
}

async function requestJson(url, { method = 'GET', body, timeout = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, status: res.status, statusText: res.statusText, text };
    }
    try {
      return { ok: true, json: text ? JSON.parse(text) : {} };
    } catch (err) {
      return { ok: false, status: res.status, statusText: res.statusText, text: `invalid json: ${err}` };
    }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { ok: false, statusText: 'timeout', text: 'Request timed out' };
    }
    return { ok: false, statusText: err?.message ?? 'error', text: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

export async function pxGetMeta(parts, lang = 'en') {
  let lastErr = null;
  for (const base of API_BASES) {
    const url = apiJoin(base, parts, lang);
    const result = await requestJson(url, { method: 'GET', timeout: 30000 });
    if (result.ok) return result.json;
    lastErr = `GET ${url} -> ${result.status ?? ''} ${result.statusText ?? ''}`.trim();
  }
  throw new PxError(lastErr ?? 'Meta fetch failed');
}

export async function pxPostData(parts, body, lang = 'en') {
  let lastErr = null;
  const payload = { ...body };
  if (!payload.response) payload.response = { format: 'JSON' };
  for (const base of API_BASES) {
    const url = apiJoin(base, parts, lang);
    const result = await requestJson(url, { method: 'POST', body: payload, timeout: 60000 });
    if (result.ok) return result.json;
    lastErr = `POST ${url} -> ${result.status ?? ''} ${result.statusText ?? ''} ${(result.text ?? '').slice(0, 200)}`.trim();
    if (result.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new PxError(lastErr ?? 'Data fetch failed');
}

function metaVariables(meta) {
  return Array.isArray(meta?.variables) ? [...meta.variables] : [];
}

function metaFindVar(meta, predicate) {
  for (const v of metaVariables(meta)) {
    const text = String(v?.text ?? '');
    const code = String(v?.code ?? '');
    if (predicate(text, code, v)) return v;
  }
  return null;
}

export function metaFindVarCode(meta, predicate) {
  const found = metaFindVar(meta, predicate);
  return found?.code ?? null;
}

export function metaValueMap(meta, varCode) {
  const variable = metaVariables(meta).find((v) => v?.code === varCode);
  if (!variable) return [];
  const values = Array.isArray(variable.values) ? variable.values : [];
  let texts = Array.isArray(variable.valueTexts) ? variable.valueTexts : [];
  if (!texts.length || texts.length !== values.length) {
    texts = values.map((c) => String(c));
  }
  return values.map((value, index) => [String(value), String(texts[index] ?? value)]);
}

export function metaTimeCodes(meta, timeCode) {
  const variable = metaVariables(meta).find((v) => v?.code === timeCode);
  if (!variable) return [];
  const values = Array.isArray(variable.values) ? [...variable.values] : [];
  if (variable.time === true) values.reverse();
  return values.map((v) => String(v));
}

function tableLookup(cube, dimOrder = null) {
  const dataRows = Array.isArray(cube?.data) ? cube.data : null;
  if (!dataRows?.length) return null;
  let dimCodes;
  if (Array.isArray(cube?.columns)) {
    const dimCols = cube.columns.filter((col) => col?.type !== 'c');
    dimCodes = dimCols.map((col) => String(col?.code ?? ''));
  } else if (Array.isArray(dimOrder) && dimOrder.length) {
    dimCodes = dimOrder.map((c) => String(c));
  } else {
    return null;
  }
  const lookup = new Map();
  for (const row of dataRows) {
    const keyVals = Array.isArray(row?.key) ? row.key.map((v) => String(v)) : [];
    if (keyVals.length !== dimCodes.length) continue;
    let value = null;
    if (Array.isArray(row?.values)) {
      const vals = row.values.length ? row.values : [null];
      value = vals[0];
    } else if (Object.prototype.hasOwnProperty.call(row ?? {}, 'value')) {
      value = row.value;
    }
    lookup.set(JSON.stringify(keyVals), coerceNumber(value));
  }
  return { dimCodes, lookup };
}

function lookupTableValue(dimCodes, lookup, assignments) {
  const key = dimCodes.map((dim) => {
    const val = assignments?.[dim];
    return val === undefined || val === null ? null : String(val);
  });
  if (key.some((v) => v === null)) return null;
  return lookup.get(JSON.stringify(key)) ?? null;
}

async function writeJson(outDir, name, data) {
  await fs.mkdir(outDir, { recursive: true });
  const filePath = path.join(outDir, name);
  await fs.writeFile(filePath, jsonStringify(data), 'utf8');
  console.log(`✔ wrote ${filePath}`);
}

async function fetchTradeMonthly(outDir, months) {
  const parts = PATHS.trade_monthly;
  const meta = await pxGetMeta(parts);

  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  const dimVar =
    metaFindVarCode(meta, (text, code) => text.toLowerCase().includes('variable') || ['variabla', 'variables'].includes(code.toLowerCase()))
    || 'Variabla';
  if (!dimTime || !dimVar) {
    throw new PxError('Trade table: missing Year/month or Variables dimension');
  }

  const valPairs = metaValueMap(meta, dimVar);
  let impCode = null;
  for (const [code, text] of valPairs) {
    if (text.toLowerCase().includes('imports') && text.toLowerCase().includes('cif')) {
      impCode = code;
      break;
    }
  }
  if (!impCode) {
    for (const [code, text] of valPairs) {
      if (text.toLowerCase().includes('import')) {
        impCode = code;
        break;
      }
    }
  }
  if (!impCode) impCode = '3';

  const allMonths = metaTimeCodes(meta, dimTime) ?? [];
  const pick = months ? allMonths.slice(-months) : allMonths;

  const body = {
    query: [
      { code: dimVar, selection: { filter: 'item', values: [impCode] } },
      { code: dimTime, selection: { filter: 'item', values: pick } },
    ],
  };

  const data = await pxPostData(parts, body);
  const values = Array.isArray(data?.value) ? data.value : [];
  let coerced = [];
  if (values.length) {
    coerced = values.map((v) => coerceNumber(v));
  } else {
    const table = tableLookup(data, [dimTime, dimVar]);
    if (table) {
      const { dimCodes, lookup } = table;
      coerced = pick.map((code) => lookupTableValue(dimCodes, lookup, { [dimTime]: code, [dimVar]: impCode }));
    }
  }
  const series = pick.map((code, idx) => ({
    period: normalizeYM(code),
    imports_th_eur: tidyNumber(coerced[idx] ?? null),
  }));
  await writeJson(outDir, 'kas_imports_monthly.json', series);
  return { periods: series.length };
}

async function fetchEnergyMonthly(outDir, months) {
  const parts = PATHS.energy_monthly;
  const meta = await pxGetMeta(parts);

  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  const dimInd =
    metaFindVarCode(meta, (text, code) =>
      text.toLowerCase().includes('mwh') || text.toLowerCase().includes('indicator') || code.toLowerCase() === 'mwh') || 'MWH';
  if (!dimTime || !dimInd) {
    throw new PxError('Energy table: missing Year/month or indicator (MWH) dimension');
  }

  const valPairs = metaValueMap(meta, dimInd);
  let importCode = null;
  let prodCode = null;
  for (const [code, text] of valPairs) {
    const t = text.toLowerCase();
    if (!importCode && t.includes('import')) importCode = code;
    if (!prodCode && (t.includes('gross production from power plants') || t.startsWith('gross production'))) prodCode = code;
  }
  if (!prodCode) {
    for (const [code, text] of valPairs) {
      const t = text.toLowerCase();
      if (t.includes('gross') && t.includes('production')) {
        prodCode = code;
        break;
      }
    }
  }
  if (!importCode || !prodCode) {
    throw new PxError("Energy table: could not find 'Import' and 'Gross Production from Power Plants' in indicator list");
  }

  const allMonths = metaTimeCodes(meta, dimTime) ?? [];
  const pick = months ? allMonths.slice(-months) : allMonths;
  const body = {
    query: [
      { code: dimInd, selection: { filter: 'item', values: [importCode, prodCode] } },
      { code: dimTime, selection: { filter: 'item', values: pick } },
    ],
  };
  const cube = await pxPostData(parts, body);
  const series = [];
  if (Array.isArray(cube?.value) && cube?.dimension) {
    const order = cube.id;
    const sizes = cube.size;
    const strides = Array(order.length).fill(1);
    for (let i = sizes.length - 2; i >= 0; i -= 1) {
      strides[i] = strides[i + 1] * sizes[i + 1];
    }
    const idxTime = cube.dimension[dimTime].category.index;
    const idxInd = cube.dimension[dimInd].category.index;
    const impOrd = idxInd[importCode];
    const prodOrd = idxInd[prodCode];
    const pos = (coords) => coords.reduce((sum, c, idx) => sum + c * strides[idx], 0);
    for (const code of pick) {
      const timeOrd = idxTime[code];
      const coords = order.map((key) => {
        if (key === dimInd) return impOrd;
        if (key === dimTime) return timeOrd;
        return 0;
      });
      const coordsProd = order.map((key) => {
        if (key === dimInd) return prodOrd;
        if (key === dimTime) return timeOrd;
        return 0;
      });
      const importVal = coerceNumber(cube.value[pos(coords)]);
      const prodVal = coerceNumber(cube.value[pos(coordsProd)]);
      series.push({
        period: normalizeYM(code),
        import_gwh: tidyNumber(importVal),
        production_gwh: tidyNumber(prodVal),
      });
    }
  } else {
    const table = tableLookup(cube, [dimInd, dimTime]);
    if (!table) throw new PxError('Energy table: unexpected response format');
    const { dimCodes, lookup } = table;
    for (const code of pick) {
      const importVal = lookupTableValue(dimCodes, lookup, { [dimInd]: importCode, [dimTime]: code });
      const prodVal = lookupTableValue(dimCodes, lookup, { [dimInd]: prodCode, [dimTime]: code });
      series.push({
        period: normalizeYM(code),
        import_gwh: tidyNumber(importVal),
        production_gwh: tidyNumber(prodVal),
      });
    }
  }
  await writeJson(outDir, 'kas_energy_electricity_monthly.json', series);
  return { periods: series.length };
}

async function fetchFuelTable(outDir, months, name, spec) {
  const parts = PATHS[spec.path_key];
  const label = spec.label ?? name;
  const meta = await pxGetMeta(parts);
  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  let measureDim = null;
  for (const variable of metaVariables(meta)) {
    const code = String(variable?.code ?? '');
    if (code && code !== dimTime) {
      measureDim = code;
      break;
    }
  }
  if (!measureDim) throw new PxError(`${label}: missing measure dimension`);
  const measurePairs = metaValueMap(meta, measureDim);
  const measureCodes = measurePairs.map(([code]) => code);
  const fieldMap = Object.fromEntries(measurePairs.map(([code, text]) => [code, normalizeFuelField(text)]));
  const labelMap = Object.fromEntries(measurePairs.map(([code, text]) => [fieldMap[code], text]));
  const allMonths = metaTimeCodes(meta, dimTime) ?? [];
  const pick = months ? allMonths.slice(-months) : allMonths;
  const body = {
    query: [
      { code: measureDim, selection: { filter: 'item', values: measureCodes } },
      { code: dimTime, selection: { filter: 'item', values: pick } },
    ],
  };
  const cube = await pxPostData(parts, body);
  const table = tableLookup(cube, [measureDim, dimTime]);
  if (!table) throw new PxError(`${label}: unexpected response format`);
  const { dimCodes, lookup } = table;
  const series = [];
  for (const code of pick) {
    const row = { period: normalizeYM(code) };
    for (const measure of measureCodes) {
      const value = lookupTableValue(dimCodes, lookup, { [measureDim]: measure, [dimTime]: code });
      row[fieldMap[measure]] = tidyNumber(value);
    }
    series.push(row);
  }
  await writeJson(outDir, `kas_energy_${name}_monthly.json`, series);
  return {
    periods: series.length,
    metrics: measurePairs.map(([code, text]) => ({ field: fieldMap[code], label: text })),
    table: parts[parts.length - 1],
    path: parts.join('/'),
    label,
  };
}

async function fetchTourismRegion(outDir, months) {
  const parts = PATHS.tourism_region;
  const meta = await pxGetMeta(parts);
  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  const dimRegion =
    metaFindVarCode(meta, (text) => text.toLowerCase().includes('region') || text.toLowerCase().includes('rajon')) || 'Rajonet';
  const dimOrigin =
    metaFindVarCode(meta, (text) => text.toLowerCase().includes('local') || text.toLowerCase().includes('jasht'))
    || 'Vendor/jashtem';
  const dimVar = metaFindVarCode(meta, (text) => text.toLowerCase().includes('variable')) || 'Variabla';

  const regionPairs = metaValueMap(meta, dimRegion);
  const originPairs = metaValueMap(meta, dimOrigin);
  const varPairs = metaValueMap(meta, dimVar);
  const metricCodes = {};
  for (const [code, text] of varPairs) {
    metricCodes[normalizeTourismMetric(text)] = code;
  }
  const allMonths = metaTimeCodes(meta, dimTime) ?? [];
  const pick = months ? allMonths.slice(-months) : allMonths;
  const query = [
    { code: dimRegion, selection: { filter: 'item', values: regionPairs.map(([code]) => code) } },
    { code: dimOrigin, selection: { filter: 'item', values: originPairs.map(([code]) => code) } },
    { code: dimVar, selection: { filter: 'item', values: Object.values(metricCodes) } },
    { code: dimTime, selection: { filter: 'item', values: pick } },
  ];
  const cube = await pxPostData(parts, { query, response: { format: 'JSON' } });
  const table = tableLookup(cube, [dimTime, dimRegion, dimOrigin, dimVar]);
  if (!table) throw new PxError('Tourism region: unexpected response format');
  const { dimCodes, lookup } = table;
  const records = [];
  for (const timeCode of pick) {
    const period = normalizeYM(timeCode);
    for (const [regionCode, regionLabel] of regionPairs) {
      for (const [originCode, originLabel] of originPairs) {
        const row = {
          period,
          region: regionLabel,
          visitor_group: normalizeGroupLabel(originLabel),
          visitor_group_label: originLabel,
        };
        for (const [metricKey, metricCode] of Object.entries(metricCodes)) {
          const value = lookupTableValue(dimCodes, lookup, {
            [dimTime]: timeCode,
            [dimRegion]: regionCode,
            [dimOrigin]: originCode,
            [dimVar]: metricCode,
          });
          row[metricKey] = tidyNumber(value);
        }
        records.push(row);
      }
    }
  }
  await writeJson(outDir, 'kas_tourism_region_monthly.json', records);
  return {
    periods: pick.length,
    regions: regionPairs.length,
    visitor_groups: originPairs.map(([, label]) => normalizeGroupLabel(label)),
    metrics: Object.keys(metricCodes),
    table: parts[parts.length - 1],
    path: parts.join('/'),
  };
}

async function fetchTourismCountry(outDir, months) {
  const parts = PATHS.tourism_country;
  const meta = await pxGetMeta(parts);
  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  const dimVar = metaFindVarCode(meta, (text) => text.toLowerCase().includes('variable')) || 'Variabla';
  const dimCountry =
    metaFindVarCode(meta, (text) => text.toLowerCase().includes('country') || text.toLowerCase().includes('shtetet')) || 'Shtetet';
  const varPairs = metaValueMap(meta, dimVar);
  const metricCodes = {};
  for (const [code, text] of varPairs) {
    metricCodes[normalizeTourismMetric(text)] = code;
  }
  const countryPairs = metaValueMap(meta, dimCountry);
  const allMonths = metaTimeCodes(meta, dimTime) ?? [];
  const pick = months ? allMonths.slice(-months) : allMonths;
  const query = [
    { code: dimVar, selection: { filter: 'item', values: Object.values(metricCodes) } },
    { code: dimCountry, selection: { filter: 'item', values: countryPairs.map(([code]) => code) } },
    { code: dimTime, selection: { filter: 'item', values: pick } },
  ];
  const cube = await pxPostData(parts, { query, response: { format: 'JSON' } });
  const table = tableLookup(cube, [dimTime, dimVar, dimCountry]);
  if (!table) throw new PxError('Tourism country: unexpected response format');
  const { dimCodes, lookup } = table;
  const records = [];
  for (const timeCode of pick) {
    const period = normalizeYM(timeCode);
    for (const [countryCode, countryLabel] of countryPairs) {
      if (countryLabel.toLowerCase() === 'external') continue;
      const row = { period, country: countryLabel };
      for (const [metricKey, metricCode] of Object.entries(metricCodes)) {
        const value = lookupTableValue(dimCodes, lookup, {
          [dimTime]: timeCode,
          [dimVar]: metricCode,
          [dimCountry]: countryCode,
        });
        row[metricKey] = tidyNumber(value);
      }
      records.push(row);
    }
  }
  await writeJson(outDir, 'kas_tourism_country_monthly.json', records);
  return {
    periods: pick.length,
    countries: countryPairs.length,
    metrics: Object.keys(metricCodes),
    table: parts[parts.length - 1],
    path: parts.join('/'),
  };
}

async function fetchImportsByPartner(outDir, months, partners) {
  const parts = PATHS.imports_by_partner;
  const meta = await pxGetMeta(parts);
  const dimTime =
    metaFindVarCode(meta, (text, code, v) => v.time === true || (text.toLowerCase().includes('year') && text.toLowerCase().includes('month')))
    || 'Viti/muaji';
  const dimPartner =
    metaFindVarCode(meta, (text, code) => text.toLowerCase().includes('partner') || code.toLowerCase().includes('partnerc'))
    || 'PartnerC';
  const dimUnit = metaFindVarCode(meta, (text) => text.toLowerCase().includes('unit'));
  if (!dimTime || !dimPartner) throw new PxError('Partner table: missing Year/month or Partner dimension');
  const allMonths = metaTimeCodes(meta, dimTime);
  const pick = months ? allMonths.slice(-months) : allMonths;
  const partnerPairs = metaValueMap(meta, dimPartner);
  let partnerCodes;
  let labelLookup = Object.fromEntries(partnerPairs);
  if (partners.length === 1 && partners[0].toUpperCase() === 'ALL') {
    partnerCodes = partnerPairs.map(([code]) => code);
  } else {
    const wanted = new Set(partners.map((p) => p.trim().toUpperCase()));
    partnerCodes = [];
    labelLookup = {};
    for (const [code, label] of partnerPairs) {
      if (wanted.has(code.toUpperCase()) || wanted.has(String(label).toUpperCase())) {
        partnerCodes.push(code);
        labelLookup[code] = label;
      }
    }
    if (!partnerCodes.length) {
      console.warn('! No partner codes matched; skipping partner download');
      return { skipped: true };
    }
  }
  const query = [
    { code: dimPartner, selection: { filter: 'item', values: partnerCodes } },
    { code: dimTime, selection: { filter: 'item', values: pick } },
  ];
  if (dimUnit) {
    const unitPairs = metaValueMap(meta, dimUnit);
    const thou = unitPairs.find(([, text]) => String(text).includes('000') || String(text).toLowerCase().includes('thousand'));
    if (thou) {
      query.push({ code: dimUnit, selection: { filter: 'item', values: [thou[0]] } });
    }
  }
  const cube = await pxPostData(parts, { query });
  const rows = [];
  if (Array.isArray(cube?.value) && cube?.dimension) {
    const order = cube.id;
    const sizes = cube.size;
    const strides = Array(order.length).fill(1);
    for (let i = sizes.length - 2; i >= 0; i -= 1) {
      strides[i] = strides[i + 1] * sizes[i + 1];
    }
    const idxTime = cube.dimension[dimTime].category.index;
    const idxPartner = cube.dimension[dimPartner].category.index;
    const pos = (coords) => coords.reduce((sum, c, idx) => sum + c * strides[idx], 0);
    for (const partnerCode of partnerCodes) {
      const partnerLabel = labelLookup[partnerCode] ?? partnerCode;
      const partnerOrd = idxPartner[partnerCode];
      for (const timeCode of pick) {
        const timeOrd = idxTime[timeCode];
        const coords = order.map((key) => {
          if (key === dimPartner) return partnerOrd;
          if (key === dimTime) return timeOrd;
          return 0;
        });
        const value = coerceNumber(cube.value[pos(coords)]);
        rows.push({
          period: normalizeYM(timeCode),
          partner: partnerLabel,
          imports_th_eur: tidyNumber(value),
        });
      }
    }
  } else {
    const table = tableLookup(cube, [dimPartner, dimTime]);
    if (!table) throw new PxError('Partner table: unexpected response format');
    const { dimCodes, lookup } = table;
    for (const partnerCode of partnerCodes) {
      const partnerLabel = labelLookup[partnerCode] ?? partnerCode;
      for (const timeCode of pick) {
        const value = lookupTableValue(dimCodes, lookup, { [dimPartner]: partnerCode, [dimTime]: timeCode });
        rows.push({
          period: normalizeYM(timeCode),
          partner: partnerLabel,
          imports_th_eur: tidyNumber(value),
        });
      }
    }
  }
  await writeJson(outDir, 'kas_imports_by_partner.json', rows);
  return { partners: partnerCodes.length, periods: pick.length };
}

export async function main() {
  const argv = process.argv.slice(2);
  const args = { months: null, out: null, all: false, partners: null, noPartners: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--out':
        args.out = argv[++i] ?? null;
        break;
      case '--months':
        args.months = Number.parseInt(argv[++i] ?? '', 10);
        if (Number.isNaN(args.months)) args.months = null;
        break;
      case '--all':
        args.all = true;
        break;
      case '--partners':
        args.partners = (argv[++i] ?? '').split(',').map((p) => p.trim()).filter(Boolean);
        break;
      case '--no-partners':
        args.noPartners = true;
        break;
      default:
        if (arg.startsWith('--')) {
          throw new PxError(`Unknown argument: ${arg}`);
        }
    }
  }

  const outDir = args.out ? path.resolve(process.cwd(), args.out) : path.resolve(process.cwd(), 'data');
  const months = args.all ? null : args.months ?? 24;
  let partners = null;
  if (!args.noPartners) {
    partners = args.partners?.length ? args.partners : ['ALL'];
  }

  console.log('ASKdata PxWeb consolidator');
  console.log('  out     :', outDir);
  console.log('  months  :', months ?? 'ALL');
  console.log('  partners:', partners ? partners.join(',') : '(none)');

  await fs.mkdir(outDir, { recursive: true });
  const started = new Date().toISOString();
  const tradeInfo = await fetchTradeMonthly(outDir, months ?? undefined);
  const energyInfo = await fetchEnergyMonthly(outDir, months ?? undefined);
  const fuelInfos = {};
  for (const [fuelName, spec] of Object.entries(FUEL_SPECS)) {
    try {
      fuelInfos[fuelName] = await fetchFuelTable(outDir, months ?? undefined, fuelName, spec);
    } catch (error) {
      console.warn(`! Fuel ${fuelName} download failed:`, error.message ?? error);
    }
  }
  let tourismRegionInfo = null;
  let tourismCountryInfo = null;
  try {
    tourismRegionInfo = await fetchTourismRegion(outDir, months ?? undefined);
  } catch (error) {
    console.warn('! Tourism region download failed:', error.message ?? error);
  }
  try {
    tourismCountryInfo = await fetchTourismCountry(outDir, months ?? undefined);
  } catch (error) {
    console.warn('! Tourism country download failed:', error.message ?? error);
  }
  let partnerInfo = null;
  if (partners) {
    try {
      partnerInfo = await fetchImportsByPartner(outDir, months ?? undefined, partners);
    } catch (error) {
      console.warn('! Partner download failed:', error.message ?? error);
    }
  }
  const fuelManifest = Object.keys(fuelInfos).length ? fuelInfos : null;
  const tourismManifest = {};
  if (tourismRegionInfo) tourismManifest.region = tourismRegionInfo;
  if (tourismCountryInfo) tourismManifest.country = tourismCountryInfo;
  const manifest = {
    generated_at: started,
    api_bases_tried: API_BASES,
    sources: {
      trade_monthly: {
        table: '08_qarkullimi.px',
        path: PATHS.trade_monthly.join('/'),
        unit: 'thousand euro (CIF)',
        periods: tradeInfo.periods,
      },
      energy_monthly: {
        table: 'tab01.px',
        path: PATHS.energy_monthly.join('/'),
        unit: 'GWh',
        periods: energyInfo.periods,
      },
      fuel_monthly: fuelManifest,
      tourism_monthly: Object.keys(tourismManifest).length ? tourismManifest : null,
      imports_by_partner: partners
        ? {
            table: '07_imp_country.px',
            path: PATHS.imports_by_partner.join('/'),
            unit: 'thousand euro',
            ...(partnerInfo ?? {}),
          }
        : null,
    },
    notes: [
      "Uses PxWeb API; handles GET-meta variables[] (e.g., 'Viti/muaji', 'Variabla')",
      'Trade values are in thousand euro; imports are CIF',
      'Energy quantities are electricity volumes; indicators include Import and Gross Production from Power Plants',
      'Fuel balances include production, import, export, stock, and ready-for-market categories',
      'Tourism figures include visitors and nights by region (split by local/external) and by country of origin',
    ],
  };
  await writeJson(outDir, 'kas_sources.json', manifest);
  console.log('Done.');
}

const isDirectRun = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectRun) {
  main().catch((err) => {
    console.error('FAILED:', err.message ?? err);
    process.exit(err instanceof PxError ? 2 : 1);
  });
}

export const __internal = {
  tableLookup,
  lookupTableValue,
  tidyNumber,
  jsonStringify,
  requestJson,
};
