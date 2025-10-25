#!/usr/bin/env python3
"""
scripts/fetch_kas.py

Standalone Python 3 script that fetches Kosovo statistics from the
KAS PxWeb (ASKdata) API and saves tidy JSON to disk.

It consolidates:
  1) Monthly goods IMPORTS (CIF) — (000 €)
     table: 08_qarkullimi.px  (ASKdata / External trade / Monthly indicators)
  2) Monthly ELECTRICITY — Import & Gross Production from Power Plants, GWh
     table: tab01.px          (ASKdata / Energy / Monthly indicators)
  3) Liquid fuel balances (gasoline, diesel, LNG, jet) — tonnes
     tables: tab03.px–tab06.px (ASKdata / Energy / Monthly indicators)
  4) Tourism occupancy — visitors and nights by region & by country
     tables: tab01.px–tab02.px (ASKdata / Tourism and hotels / Monthly indicators)
  5) Imports by partner country — (000 €)
     table: 07_imp_country.px (ASKdata / External trade / Monthly indicators)

The script is robust to:
  • API base-path differences (tries both /PXWeb/api/v1 and /api/v1)
  • Spaces vs double-underscore folder naming (uses clean folder segments)
  • **PxWeb meta formats**: handles both classic `variables[]` meta (your example)
    and JSON-stat `dimension` meta from POST responses
  • Dimension names in different languages (e.g. "Year/month" / "Viti/muaji")
  • Odd month codes (e.g. "202308")

Usage examples:
  python scripts/fetch_kas.py --out data --months 36
  python scripts/fetch_kas.py --all --partners AL,RS,DE
  python scripts/fetch_kas.py --partners ALL --months 24

Outputs (in --out, default ./data):
  kas_imports_monthly.json            [{ period: YYYY-MM, imports_th_eur: number|null }]
  kas_energy_electricity_monthly.json [{ period: YYYY-MM, import_gwh: number|null, production_gwh: number|null }]
  kas_energy_gasoline_monthly.json    [{ period, production, import, export, stock, ready_for_market }]
  kas_energy_diesel_monthly.json      [{ ... }]
  kas_energy_lng_monthly.json         [{ ... }]
  kas_energy_jet_monthly.json         [{ ... }]
  kas_tourism_region_monthly.json     [{ period, region, visitor_group, visitors, nights }]
  kas_tourism_country_monthly.json    [{ period, country, visitors, nights }]
  kas_imports_by_partner.json         [{ period: YYYY-MM, partner: str, imports_th_eur: number|null }]
  kas_sources.json                    manifest with endpoints/units/periods
"""

from __future__ import annotations
import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote

import json
import re
import time
import requests

API_BASES = [
    "https://askdata.rks-gov.net/PXWeb/api/v1",
    "https://askdata.rks-gov.net/api/v1",
]

PATHS = {
    "trade_monthly": ["ASKdata", "External trade", "Monthly indicators", "08_qarkullimi.px"],
    "energy_monthly": ["ASKdata", "Energy", "Monthly indicators", "tab01.px"],
    "imports_by_partner": ["ASKdata", "External trade", "Monthly indicators", "07_imp_country.px"],
    "fuel_gasoline": ["ASKdata", "Energy", "Monthly indicators", "tab03.px"],
    "fuel_diesel": ["ASKdata", "Energy", "Monthly indicators", "tab04.px"],
    "fuel_lng": ["ASKdata", "Energy", "Monthly indicators", "tab05.px"],
    "fuel_jet": ["ASKdata", "Energy", "Monthly indicators", "tab06.px"],
    "tourism_region": ["ASKdata", "Tourism and hotels", "Treguesit mujorë", "tab01.px"],
    "tourism_country": ["ASKdata", "Tourism and hotels", "Treguesit mujorë", "tab02.px"],
}

FUEL_SPECS = {
    "gasoline": {
        "path_key": "fuel_gasoline",
        "label": "Gasoline",
    },
    "diesel": {
        "path_key": "fuel_diesel",
        "label": "Diesel",
    },
    "lng": {
        "path_key": "fuel_lng",
        "label": "LNG",
    },
    "jet": {
        "path_key": "fuel_jet",
        "label": "Jet / kerosene",
    },
}

TOURISM_SPECS = {
    "region": {
        "path_key": "tourism_region",
    },
    "country": {
        "path_key": "tourism_country",
    },
}

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "kas-pxweb-fetch/1.1 (+https://example)"})

SCRIPT_DIR = Path(__file__).resolve().parent
IMPORTS_ROOT = SCRIPT_DIR.parent
MONOREPO_ROOT = IMPORTS_ROOT.parent / "kosovotools"

# ---- helpers ---------------------------------------------------------------

def j(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)

def coerce_number(value: Any) -> Optional[float]:
    """Return numeric value if possible, otherwise None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s or s in {".", "..", "...", "-"}:
        return None
    s = s.replace("\u00a0", "").replace(",", "")
    try:
        num = float(s)
    except ValueError:
        return None
    return num

def tidy_number(value: Optional[float]) -> Optional[float | int]:
    if value is None:
        return None
    if float(value).is_integer():
        return int(value)
    return float(value)

def table_lookup(
    cube: Dict[str, Any],
    dim_order: Optional[List[str]] = None,
) -> Optional[Tuple[List[str], Dict[Tuple[str, ...], Optional[float]]]]:
    columns = cube.get("columns")
    data_rows = cube.get("data")
    if not data_rows:
        return None
    if columns:
        dim_cols = [col for col in columns if col.get("type") != "c"]
        dim_codes = [str(col.get("code")) for col in dim_cols]
    elif dim_order:
        dim_codes = list(dim_order)
    else:
        return None
    lookup: Dict[Tuple[str, ...], Optional[float]] = {}
    for row in data_rows:
        key_vals = row.get("key", [])
        if len(key_vals) != len(dim_codes):
            continue
        val: Optional[Any] = None
        if "values" in row:
            val_list = row.get("values") or [None]
            val = val_list[0] if val_list else None
        elif "value" in row:
            val = row.get("value")
        lookup[tuple(key_vals)] = coerce_number(val)
    return dim_codes, lookup

def lookup_table_value(dim_codes: List[str], lookup: Dict[Tuple[str, ...], Optional[float]], assignments: Dict[str, str]) -> Optional[float]:
    key: List[Optional[str]] = [None] * len(dim_codes)
    for dim_code, dim_value in assignments.items():
        try:
            idx = dim_codes.index(dim_code)
        except ValueError:
            return None
        key[idx] = dim_value
    if any(v is None for v in key):
        return None
    return lookup.get(tuple(key))  # type: ignore[arg-type]


def slugify_label(text: str) -> str:
    slug = re.sub(r"[^0-9a-zA-Z]+", "_", text.strip().lower())
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug or "value"


def normalize_fuel_field(label: str) -> str:
    l = label.lower()
    if "ready" in l and "market" in l:
        return "ready_for_market"
    if "production" in l:
        return "production"
    if "import" in l:
        return "import"
    if "export" in l:
        return "export"
    if "stock" in l:
        return "stock"
    return slugify_label(label)


def normalize_tourism_metric(label: str) -> str:
    l = label.lower()
    if "night" in l:
        return "nights"
    return "visitors"


def normalize_group_label(label: str) -> str:
    l = label.lower()
    if l.startswith("tot"):
        return "total"
    if l.startswith("loc"):
        return "local"
    if l.startswith("ext"):
        return "external"
    return slugify_label(label)

def normalize_ym(code: str) -> str:
    # Turn '2025M8' or '202508' into '2025-08'
    if code.isdigit() and len(code) == 6:
        return f"{code[:4]}-{code[4:6]}"
    if "M" in code:
        y, m = code.split("M", 1)
        return f"{y}-{m.zfill(2)}"
    if len(code) == 7 and code[4] == "-":
        return code
    return code

def api_join(base: str, parts: List[str], lang: str = "en") -> str:
    segs = [base.rstrip("/"), lang] + [quote(p, safe="") for p in parts]
    return "/".join(segs)

class PxError(RuntimeError):
    pass

def px_get_meta(parts: List[str], lang: str = "en") -> Dict[str, Any]:
    """Return PxWeb *GET meta* (usually 'title' + 'variables' array)."""
    last_err: Optional[str] = None
    for base in API_BASES:
        url = api_join(base, parts, lang)
        r = SESSION.get(url, timeout=30)
        if r.ok:
            return r.json()
        last_err = f"GET {url} -> {r.status_code} {r.reason}"
    raise PxError(last_err or "Meta fetch failed")

def px_post_data(parts: List[str], body: Dict[str, Any], lang: str = "en") -> Dict[str, Any]:
    last_err: Optional[str] = None
    body2 = dict(body)
    body2.setdefault("response", {"format": "JSON"})
    for base in API_BASES:
        url = api_join(base, parts, lang)
        r = SESSION.post(url, json=body2, timeout=60)
        if r.ok:
            return r.json()
        last_err = f"POST {url} -> {r.status_code} {r.text[:200]}"
        # be gentle with possible rate limits
        if r.status_code == 429:
            time.sleep(1)
    raise PxError(last_err or "Data fetch failed")

# ----- meta utilities (handle both GET 'variables[]' and POST 'dimension') ---

def meta_has_dimension(meta: Dict[str, Any]) -> bool:
    return isinstance(meta.get("dimension"), dict)

def meta_variables(meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    return list(meta.get("variables", []))

def meta_find_var(meta: Dict[str, Any], predicate) -> Optional[Dict[str, Any]]:
    """Find a variable in GET-meta 'variables[]' by a predicate on (text, code, var)."""
    for v in meta_variables(meta):
        text = str(v.get("text", ""))
        code = str(v.get("code", ""))
        if predicate(text, code, v):
            return v
    return None

def meta_find_var_code(meta: Dict[str, Any], predicate) -> Optional[str]:
    v = meta_find_var(meta, predicate)
    return v.get("code") if v else None

def meta_value_map(meta: Dict[str, Any], var_code: str) -> List[Tuple[str, str]]:
    """Return list of (value_code, value_text) for the given variable code."""
    v = next((x for x in meta_variables(meta) if x.get("code") == var_code), None)
    if not v:
        return []
    values = list(v.get("values", []))
    texts = list(v.get("valueTexts", []))
    # Some PxWeb instances return missing valueTexts; fall back to the code
    if not texts or len(texts) != len(values):
        texts = [str(c) for c in values]
    return list(zip(values, texts))

def meta_time_codes(meta: Dict[str, Any], time_code: str) -> List[str]:
    """Return time codes in *chronological* order (old->new)."""
    v = next((x for x in meta_variables(meta) if x.get("code") == time_code), None)
    if not v:
        return []
    vals = list(v.get("values", []))
    # Many PxWeb tables list time in descending order; reverse to chronological
    if v.get("time") is True:
        vals = list(reversed(vals))
    return vals

# tidy writers ---------------------------------------------------------------

def write_json(out_dir: Path, name: str, data: Any):
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✔ wrote {out_dir / name}")

# fetchers -------------------------------------------------------------------

def fetch_trade_monthly(out_dir: Path, months: Optional[int]):
    parts = PATHS["trade_monthly"]
    meta = px_get_meta(parts)

    # Find dimension codes from GET-meta variables
    dim_time = meta_find_var_code(
        meta, lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower())
    ) or "Viti/muaji"
    dim_var = meta_find_var_code(
        meta, lambda text, code, v: "variable" in text.lower() or code.lower() in ("variabla", "variables")
    ) or "Variabla"

    if not dim_time or not dim_var:
        raise PxError("Trade table: missing Year/month or Variables dimension")

    # Find 'Imports (CIF)' code using valueTexts
    val_pairs = meta_value_map(meta, dim_var)
    imp_code = None
    for code, text in val_pairs:
        if "imports" in text.lower() and "cif" in text.lower():
            imp_code = code
            break
    if not imp_code:
        # fallback: any 'import'
        for code, text in val_pairs:
            if "import" in text.lower():
                imp_code = code
                break
    if not imp_code:
        # last resort guess typical code '3'
        imp_code = "3"

    # Build time selection
    all_months = meta_time_codes(meta, dim_time) or []
    pick = all_months[-months:] if months else all_months

    body = {
        "query": [
            {"code": dim_var, "selection": {"filter": "item", "values": [imp_code]}},
            {"code": dim_time, "selection": {"filter": "item", "values": pick}},
        ]
    }
    data = px_post_data(parts, body)
    values = data.get("value", [])
    coerced: List[Optional[float]] = []
    if values:
        coerced = [coerce_number(v) for v in values]
    else:
        table = table_lookup(data, dim_order=[dim_time, dim_var])
        if table:
            dim_codes, lookup = table
            for code in pick:
                coerced.append(
                    lookup_table_value(dim_codes, lookup, {dim_time: code, dim_var: imp_code})
                )
        else:
            coerced = []
    series = [
        {
            "period": normalize_ym(pick[i]),
            "imports_th_eur": tidy_number(coerced[i] if i < len(coerced) else None),
        }
        for i in range(len(pick))
    ]
    write_json(out_dir, "kas_imports_monthly.json", series)
    return {"periods": len(series)}


def fetch_energy_monthly(out_dir: Path, months: Optional[int]):
    parts = PATHS["energy_monthly"]
    meta = px_get_meta(parts)

    dim_time = meta_find_var_code(
        meta, lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower())
    ) or "Viti/muaji"
    dim_ind = meta_find_var_code(
        meta, lambda text, code, v: "mwh" in text.lower() or "indicator" in text.lower() or code.lower() == "mwh"
    ) or "MWH"

    if not dim_time or not dim_ind:
        raise PxError("Energy table: missing Year/month or indicator (MWH) dimension")

    # pick indicator codes by label text
    val_pairs = meta_value_map(meta, dim_ind)
    import_code = None
    prod_code = None
    for code, text in val_pairs:
        t = text.lower()
        if import_code is None and "import" in t:
            import_code = code
        if prod_code is None and ("gross production from power plants" in t or t.startswith("gross production")):
            prod_code = code
    if not prod_code:
        # looser fallback
        for code, text in val_pairs:
            if "gross" in text.lower() and "production" in text.lower():
                prod_code = code
                break
    if not import_code or not prod_code:
        raise PxError("Energy table: could not find 'Import' and 'Gross Production from Power Plants' in indicator list")

    all_months = meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months

    body = {
        "query": [
            {"code": dim_ind, "selection": {"filter": "item", "values": [import_code, prod_code]}},
            {"code": dim_time, "selection": {"filter": "item", "values": pick}},
        ]
    }
    cube = px_post_data(parts, body)

    series = []
    if "value" in cube and "dimension" in cube:
        order = cube["id"]
        sizes = cube["size"]
        strides = [1] * len(sizes)
        for i in range(len(sizes) - 2, -1, -1):
            strides[i] = strides[i + 1] * sizes[i + 1]
        idx_time = cube["dimension"][dim_time]["category"]["index"]
        idx_ind = cube["dimension"][dim_ind]["category"]["index"]
        imp_ord = idx_ind[import_code]
        prod_ord = idx_ind[prod_code]

        def pos(coords: List[int]) -> int:
            return sum(c * s for c, s in zip(coords, strides))

        for code in pick:
            t = idx_time[code]
            coords_imp = [imp_ord if k == dim_ind else t if k == dim_time else 0 for k in order]
            coords_prod = [prod_ord if k == dim_ind else t if k == dim_time else 0 for k in order]
            v_imp = coerce_number(cube["value"][pos(coords_imp)])
            v_prod = coerce_number(cube["value"][pos(coords_prod)])
            series.append({
                "period": normalize_ym(code),
                "import_gwh": tidy_number(v_imp),
                "production_gwh": tidy_number(v_prod),
            })
    else:
        table = table_lookup(cube, dim_order=[dim_ind, dim_time])
        if not table:
            raise PxError("Energy table: unexpected response format")
        dim_codes, lookup = table
        for code in pick:
            v_imp = lookup_table_value(dim_codes, lookup, {dim_time: code, dim_ind: import_code})
            v_prod = lookup_table_value(dim_codes, lookup, {dim_time: code, dim_ind: prod_code})
            series.append({
                "period": normalize_ym(code),
                "import_gwh": tidy_number(v_imp),
                "production_gwh": tidy_number(v_prod),
            })
    write_json(out_dir, "kas_energy_electricity_monthly.json", series)
    return {"periods": len(series)}


def fetch_imports_by_partner(out_dir: Path, months: Optional[int], partners: Optional[List[str]]):
    if partners is None:
        return {"skipped": True}
    parts = PATHS["imports_by_partner"]
    meta = px_get_meta(parts)

    dim_time = meta_find_var_code(
        meta, lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower())
    ) or "Viti/muaji"
    dim_partner = meta_find_var_code(
        meta, lambda text, code, v: "partner" in text.lower() or "partnerc" in code.lower()
    ) or "PartnerC"
    dim_unit = meta_find_var_code(meta, lambda text, code, v: "unit" in text.lower())

    if not dim_time or not dim_partner:
        raise PxError("Partner table: missing Year/month or Partner dimension")

    all_months = meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months

    # partner code selection
    partner_pairs = meta_value_map(meta, dim_partner)  # (code, label)
    if len(partners) == 1 and partners[0].upper() == "ALL":
        partner_codes = [code for code, _ in partner_pairs]
        label_lookup = dict(partner_pairs)
    else:
        wanted = {p.strip().upper() for p in partners}
        partner_codes = []
        label_lookup = {}
        for code, label in partner_pairs:
            if code.upper() in wanted or str(label).upper() in wanted:
                partner_codes.append(code)
                label_lookup[code] = label
        if not partner_codes:
            print("! No partner codes matched; skipping partner download")
            return {"skipped": True}

    query = [
        {"code": dim_partner, "selection": {"filter": "item", "values": partner_codes}},
        {"code": dim_time, "selection": {"filter": "item", "values": pick}},
    ]
    if dim_unit:
        unit_pairs = meta_value_map(meta, dim_unit)
        thou = next((k for k, v in unit_pairs if "000" in str(v) or "thousand" in str(v).lower()), None)
        if thou:
            query.append({"code": dim_unit, "selection": {"filter": "item", "values": [thou]}})

    cube = px_post_data(parts, {"query": query})

    rows = []
    if "value" in cube and "dimension" in cube:
        order = cube["id"]
        sizes = cube["size"]
        strides = [1] * len(sizes)
        for i in range(len(sizes) - 2, -1, -1):
            strides[i] = strides[i + 1] * sizes[i + 1]

        idx_time = cube["dimension"][dim_time]["category"]["index"]
        idx_partner = cube["dimension"][dim_partner]["category"]["index"]

        def pos(coords: List[int]) -> int:
            return sum(c * s for c, s in zip(coords, strides))

        for p_code in partner_codes:
            p_name = label_lookup.get(p_code, p_code)
            p_ord = idx_partner[p_code]
            for code in pick:
                t_ord = idx_time[code]
                coords = [p_ord if k == dim_partner else t_ord if k == dim_time else 0 for k in order]
                v = coerce_number(cube["value"][pos(coords)])
                rows.append({
                    "period": normalize_ym(code),
                    "partner": p_name,
                    "imports_th_eur": tidy_number(v),
                })
    else:
        table = table_lookup(cube, dim_order=[dim_partner, dim_time])
        if not table:
            raise PxError("Partner table: unexpected response format")
        dim_codes, lookup = table
        for p_code in partner_codes:
            p_name = label_lookup.get(p_code, p_code)
            for code in pick:
                v = lookup_table_value(dim_codes, lookup, {dim_time: code, dim_partner: p_code})
                rows.append({
                    "period": normalize_ym(code),
                    "partner": p_name,
                    "imports_th_eur": tidy_number(v),
                })
    write_json(out_dir, "kas_imports_by_partner.json", rows)
    return {"partners": len(partner_codes), "periods": len(pick)}


def fetch_fuel_table(out_dir: Path, months: Optional[int], name: str, spec: Dict[str, Any]):
    parts = PATHS[spec["path_key"]]
    label = spec.get("label", name)
    meta = px_get_meta(parts)

    dim_time = meta_find_var_code(
        meta,
        lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower()),
    ) or "Viti/muaji"
    measure_dim = None
    for var in meta_variables(meta):
        code = str(var.get("code") or "")
        if code != dim_time:
            measure_dim = code
            break
    if not measure_dim:
        raise PxError(f"{label}: missing measure dimension")

    measure_pairs = meta_value_map(meta, measure_dim)
    measure_codes = [code for code, _ in measure_pairs]
    field_map = {code: normalize_fuel_field(text) for code, text in measure_pairs}
    label_map = {field_map[code]: text for code, text in measure_pairs}

    all_months = meta_time_codes(meta, dim_time) or []
    pick = all_months[-months:] if months else all_months

    body = {
        "query": [
            {"code": measure_dim, "selection": {"filter": "item", "values": measure_codes}},
            {"code": dim_time, "selection": {"filter": "item", "values": pick}},
        ],
        "response": {"format": "JSON"},
    }
    cube = px_post_data(parts, body)

    table = table_lookup(cube, dim_order=[measure_dim, dim_time])
    if not table:
        raise PxError(f"{label}: unexpected response format")
    dim_codes, lookup = table

    series: List[Dict[str, Any]] = []
    for code in pick:
        row: Dict[str, Any] = {"period": normalize_ym(code)}
        for m_code in measure_codes:
            value = lookup_table_value(dim_codes, lookup, {measure_dim: m_code, dim_time: code})
            row[field_map[m_code]] = tidy_number(value)
        series.append(row)

    out_name = f"kas_energy_{name}_monthly.json"
    write_json(out_dir, out_name, series)
    return {
        "periods": len(series),
        "metrics": [
            {"field": field_map[m_code], "label": text}
            for m_code, text in measure_pairs
        ],
        "table": parts[-1],
        "path": "/".join(parts),
        "label": label,
    }


def fetch_tourism_region(out_dir: Path, months: Optional[int]):
    parts = PATHS["tourism_region"]
    meta = px_get_meta(parts)

    dim_time = meta_find_var_code(
        meta,
        lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower()),
    ) or "Viti/muaji"
    dim_region = meta_find_var_code(
        meta,
        lambda text, code, v: "region" in text.lower() or "rajon" in text.lower(),
    ) or "Rajonet"
    dim_origin = meta_find_var_code(
        meta,
        lambda text, code, v: "local" in text.lower() or "jasht" in text.lower(),
    ) or "Vendor/jashtem"
    dim_var = meta_find_var_code(
        meta,
        lambda text, code, v: "variable" in text.lower(),
    ) or "Variabla"

    region_pairs = meta_value_map(meta, dim_region)
    origin_pairs = meta_value_map(meta, dim_origin)
    var_pairs = meta_value_map(meta, dim_var)
    metric_codes: Dict[str, str] = {}
    for code, text in var_pairs:
        metric_codes[normalize_tourism_metric(text)] = code

    all_months = meta_time_codes(meta, dim_time) or []
    pick = all_months[-months:] if months else all_months

    query = [
        {"code": dim_region, "selection": {"filter": "item", "values": [code for code, _ in region_pairs]}},
        {"code": dim_origin, "selection": {"filter": "item", "values": [code for code, _ in origin_pairs]}},
        {"code": dim_var, "selection": {"filter": "item", "values": list(metric_codes.values())}},
        {"code": dim_time, "selection": {"filter": "item", "values": pick}},
    ]

    cube = px_post_data(parts, {"query": query, "response": {"format": "JSON"}})
    table = table_lookup(cube, dim_order=[dim_time, dim_region, dim_origin, dim_var])
    if not table:
        raise PxError("Tourism region: unexpected response format")
    dim_codes, lookup = table

    records: List[Dict[str, Any]] = []
    for time_code in pick:
        period = normalize_ym(time_code)
        for region_code, region_label in region_pairs:
            for origin_code, origin_label in origin_pairs:
                row: Dict[str, Any] = {
                    "period": period,
                    "region": region_label,
                    "visitor_group": normalize_group_label(origin_label),
                    "visitor_group_label": origin_label,
                }
                for metric_key, metric_code in metric_codes.items():
                    value = lookup_table_value(
                        dim_codes,
                        lookup,
                        {
                            dim_time: time_code,
                            dim_region: region_code,
                            dim_origin: origin_code,
                            dim_var: metric_code,
                        },
                    )
                    row[metric_key] = tidy_number(value)
                records.append(row)

    out_name = "kas_tourism_region_monthly.json"
    write_json(out_dir, out_name, records)
    return {
        "periods": len(pick),
        "regions": len(region_pairs),
        "visitor_groups": [normalize_group_label(label) for _, label in origin_pairs],
        "metrics": list(metric_codes.keys()),
        "table": parts[-1],
        "path": "/".join(parts),
    }


def fetch_tourism_country(out_dir: Path, months: Optional[int]):
    parts = PATHS["tourism_country"]
    meta = px_get_meta(parts)

    dim_time = meta_find_var_code(
        meta,
        lambda text, code, v: v.get("time") is True or ("year" in text.lower() and "month" in text.lower()),
    ) or "Viti/muaji"
    dim_var = meta_find_var_code(
        meta,
        lambda text, code, v: "variable" in text.lower(),
    ) or "Variabla"
    dim_country = meta_find_var_code(
        meta,
        lambda text, code, v: "country" in text.lower() or "shtetet" in text.lower(),
    ) or "Shtetet"

    var_pairs = meta_value_map(meta, dim_var)
    metric_codes: Dict[str, str] = {}
    for code, text in var_pairs:
        metric_codes[normalize_tourism_metric(text)] = code
    country_pairs = meta_value_map(meta, dim_country)

    all_months = meta_time_codes(meta, dim_time) or []
    pick = all_months[-months:] if months else all_months

    query = [
        {"code": dim_var, "selection": {"filter": "item", "values": list(metric_codes.values())}},
        {"code": dim_country, "selection": {"filter": "item", "values": [code for code, _ in country_pairs]}},
        {"code": dim_time, "selection": {"filter": "item", "values": pick}},
    ]

    cube = px_post_data(parts, {"query": query, "response": {"format": "JSON"}})
    table = table_lookup(cube, dim_order=[dim_time, dim_var, dim_country])
    if not table:
        raise PxError("Tourism country: unexpected response format")
    dim_codes, lookup = table

    records: List[Dict[str, Any]] = []
    for time_code in pick:
        period = normalize_ym(time_code)
        for country_code, country_label in country_pairs:
            row: Dict[str, Any] = {
                "period": period,
                "country": country_label,
            }
            for metric_key, metric_code in metric_codes.items():
                value = lookup_table_value(
                    dim_codes,
                    lookup,
                    {
                        dim_time: time_code,
                        dim_var: metric_code,
                        dim_country: country_code,
                    },
                )
                row[metric_key] = tidy_number(value)
            records.append(row)

    out_name = "kas_tourism_country_monthly.json"
    write_json(out_dir, out_name, records)
    return {
        "periods": len(pick),
        "countries": len(country_pairs),
        "metrics": list(metric_codes.keys()),
        "table": parts[-1],
        "path": "/".join(parts),
    }

# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="Fetch Kosovo ASKdata PxWeb series and save JSON")
    ap.add_argument("--out", help="Override output directory")
    ap.add_argument("--months", type=int, help="Fetch only the last N months (default: 24)")
    ap.add_argument("--all", action="store_true", help="Fetch all available months")
    ap.add_argument("--partners", help="Comma-separated partner list (e.g. AL,RS,DE) or ALL for all partners")
    ap.add_argument("--no-partners", action="store_true", help="Skip imports-by-partner download")
    args = ap.parse_args()

    if args.out:
        out_dir = Path(args.out)
    else:
        out_dir = Path("data")
    months = None if args.all else (args.months or 24)
    partners: Optional[List[str]] = None
    if args.no_partners:
        partners = None
    else:
        if args.partners:
            partners = [p for p in args.partners.split(",") if p.strip()]
        else:
            partners = ["ALL"]

    print("ASKdata PxWeb consolidator")
    print("  out     :", out_dir)
    print("  months  :", months if months is not None else "ALL")
    print("  partners:", ",".join(partners) if partners else "(none)")

    out_dir.mkdir(parents=True, exist_ok=True)

    started = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    trade_info = fetch_trade_monthly(out_dir, months)
    energy_info = fetch_energy_monthly(out_dir, months)

    fuel_infos: Dict[str, Any] = {}
    for fuel_name, spec in FUEL_SPECS.items():
        try:
            fuel_infos[fuel_name] = fetch_fuel_table(out_dir, months, fuel_name, spec)
        except Exception as e:
            print(f"! Fuel {fuel_name} download failed:", e)

    tourism_region_info = None
    tourism_country_info = None
    try:
        tourism_region_info = fetch_tourism_region(out_dir, months)
    except Exception as e:
        print("! Tourism region download failed:", e)
    try:
        tourism_country_info = fetch_tourism_country(out_dir, months)
    except Exception as e:
        print("! Tourism country download failed:", e)

    partner_info = None
    if partners is not None:
        try:
            partner_info = fetch_imports_by_partner(out_dir, months, partners)
        except Exception as e:
            print("! Partner download failed:", e)

    fuel_manifest = {name: info for name, info in fuel_infos.items()} if fuel_infos else None
    tourism_manifest: Dict[str, Any] = {}
    if tourism_region_info:
        tourism_manifest["region"] = tourism_region_info
    if tourism_country_info:
        tourism_manifest["country"] = tourism_country_info

    manifest = {
        "generated_at": started,
        "api_bases_tried": API_BASES,
        "sources": {
            "trade_monthly": {
                "table": "08_qarkullimi.px",
                "path": "/".join(PATHS["trade_monthly"]),
                "unit": "thousand euro (CIF)",
                "periods": trade_info.get("periods"),
            },
            "energy_monthly": {
                "table": "tab01.px",
                "path": "/".join(PATHS["energy_monthly"]),
                "unit": "GWh",
                "periods": energy_info.get("periods"),
            },
            "fuel_monthly": fuel_manifest,
            "tourism_monthly": tourism_manifest or None,
            "imports_by_partner": (
                {
                    "table": "07_imp_country.px",
                    "path": "/".join(PATHS["imports_by_partner"]),
                    "unit": "thousand euro",
                    **(partner_info or {}),
                }
                if partners is not None
                else None
            ),
        },
        "notes": [
            "Uses PxWeb API; handles GET-meta variables[] (e.g., 'Viti/muaji', 'Variabla')",
            "Trade values are in thousand euro; imports are CIF",
            "Energy quantities are electricity volumes; indicators include Import and Gross Production from Power Plants",
            "Fuel balances include production, import, export, stock, and ready-for-market categories",
            "Tourism figures include visitors and nights by region (split by local/external) and by country of origin",
        ],
    }
    write_json(out_dir, "kas_sources.json", manifest)

    print("Done.")

if __name__ == "__main__":
    try:
        main()
    except PxError as e:
        print("FAILED:", e, file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print("FAILED:", e, file=sys.stderr)
        sys.exit(1)
