#!/usr/bin/env python3
"""
Utility script to capture raw PxWeb responses for KAS tables.
It writes the meta, request body, and raw data cube so we can inspect what the API returns.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import fetch_kas as kas  # noqa: E402

FUEL_TABLES = {
    "gasoline": ["ASKdata", "Energy", "Monthly indicators", "tab03.px"],
    "diesel": ["ASKdata", "Energy", "Monthly indicators", "tab04.px"],
    "lng": ["ASKdata", "Energy", "Monthly indicators", "tab05.px"],
    "jet": ["ASKdata", "Energy", "Monthly indicators", "tab06.px"],
}

TOURISM_TABLES = {
    "tourism_region": [
        "ASKdata",
        "Tourism and hotels",
        "Treguesit mujorë",
        "tab01.px",
    ],
    "tourism_country": [
        "ASKdata",
        "Tourism and hotels",
        "Treguesit mujorë",
        "tab02.px",
    ],
}


def dump_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {path}")


def _find_time(meta: Dict[str, Any]) -> str:
    return (
        kas.meta_find_var_code(
            meta,
            lambda text, code, v: v.get("time") is True
            or ("year" in text.lower() and "month" in text.lower()),
        )
        or "Viti/muaji"
    )


def inspect_trade(months: Optional[int], out_dir: Path, lang: str) -> None:
    tag = "trade_monthly"
    parts = kas.PATHS[tag]
    print(f"\n== {tag} ==")
    meta = kas.px_get_meta(parts, lang=lang)
    dump_json(out_dir / f"{tag}_meta.json", meta)

    dim_time = _find_time(meta)
    dim_var = kas.meta_find_var_code(
        meta,
        lambda text, code, v: "variable" in text.lower()
        or code.lower() in ("variabla", "variables"),
    ) or "Variabla"
    print(f"time dim: {dim_time}")
    print(f"var dim : {dim_var}")

    val_pairs = kas.meta_value_map(meta, dim_var)
    print("available import indicators:")
    for code, text in val_pairs:
        if "import" in text.lower():
            print(f"  {code}: {text}")

    imp_code = None
    for code, text in val_pairs:
        if "imports" in text.lower() and "cif" in text.lower():
            imp_code = code
            break
    if not imp_code:
        for code, text in val_pairs:
            if "import" in text.lower():
                imp_code = code
                break
    if not imp_code:
        imp_code = val_pairs[0][0] if val_pairs else "3"
    print(f"chosen import code: {imp_code}")

    all_months = kas.meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months
    print(f"total months in table: {len(all_months)}; picking {len(pick)}")
    if pick:
        print(f"sample months: {pick[:3]} ... {pick[-3:]}")

    body = {
        "query": [
            {"code": dim_var, "selection": {"filter": "item", "values": [imp_code]}},
            {"code": dim_time, "selection": {"filter": "item", "values": pick}},
        ],
        "response": {"format": "JSON"},
    }
    dump_json(out_dir / f"{tag}_body.json", body)
    cube = kas.px_post_data(parts, body, lang=lang)
    dump_json(out_dir / f"{tag}_raw.json", cube)

    values = cube.get("value", [])
    preview = list(zip(pick[:5], values[:5]))
    print("preview period/value pairs:", preview)


def inspect_energy(months: Optional[int], out_dir: Path, lang: str) -> None:
    tag = "energy_monthly"
    parts = kas.PATHS[tag]
    print(f"\n== {tag} ==")
    meta = kas.px_get_meta(parts, lang=lang)
    dump_json(out_dir / f"{tag}_meta.json", meta)

    dim_time = _find_time(meta)
    dim_ind = kas.meta_find_var_code(
        meta,
        lambda text, code, v: "mwh" in text.lower()
        or "indicator" in text.lower()
        or code.lower() == "mwh",
    ) or "MWH"
    print(f"time dim: {dim_time}")
    print(f"indicator dim: {dim_ind}")

    val_pairs = kas.meta_value_map(meta, dim_ind)
    print("available indicator labels containing import/gross:")
    for code, text in val_pairs:
        t = text.lower()
        if "import" in t or "gross" in t:
            print(f"  {code}: {text}")

    import_code = None
    prod_code = None
    for code, text in val_pairs:
        t = text.lower()
        if import_code is None and "import" in t:
            import_code = code
        if prod_code is None and ("gross production from power plants" in t or t.startswith("gross production")):
            prod_code = code
    if not prod_code:
        for code, text in val_pairs:
            if "gross" in text.lower() and "production" in text.lower():
                prod_code = code
                break
    if import_code is None or prod_code is None:
        print("warning: missing indicator codes; check meta output")
    print(f"chosen import code: {import_code}")
    print(f"chosen production code: {prod_code}")

    all_months = kas.meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months
    print(f"total months in table: {len(all_months)}; picking {len(pick)}")
    if pick:
        print(f"sample months: {pick[:3]} ... {pick[-3:]}")

    codes = [c for c in (import_code, prod_code) if c]
    body = {
        "query": [
            {"code": dim_ind, "selection": {"filter": "item", "values": codes}},
            {"code": dim_time, "selection": {"filter": "item", "values": pick}},
        ],
        "response": {"format": "JSON"},
    }
    dump_json(out_dir / f"{tag}_body.json", body)
    cube = kas.px_post_data(parts, body, lang=lang)
    dump_json(out_dir / f"{tag}_raw.json", cube)

    values = cube.get("value", [])
    print(f"total raw values: {len(values)}")
    if values:
        print("first values:", values[:10])


def inspect_partners(months: Optional[int], out_dir: Path, lang: str, partners: Optional[List[str]]) -> None:
    tag = "imports_by_partner"
    parts = kas.PATHS[tag]
    print(f"\n== {tag} ==")
    meta = kas.px_get_meta(parts, lang=lang)
    dump_json(out_dir / f"{tag}_meta.json", meta)

    dim_time = _find_time(meta)
    dim_partner = kas.meta_find_var_code(
        meta, lambda text, code, v: "partner" in text.lower() or "partnerc" in code.lower()
    ) or "PartnerC"
    dim_unit = kas.meta_find_var_code(meta, lambda text, code, v: "unit" in text.lower())
    print(f"time dim: {dim_time}")
    print(f"partner dim: {dim_partner}")
    if dim_unit:
        print(f"unit dim: {dim_unit}")

    partner_pairs = kas.meta_value_map(meta, dim_partner)
    if partners is None:
        partner_codes = [code for code, _ in partner_pairs[:5]]
        print("no partners supplied; using first 5 codes for preview")
    elif len(partners) == 1 and partners[0].upper() == "ALL":
        partner_codes = [code for code, _ in partner_pairs]
        print("partners=ALL; using every partner code")
    else:
        wanted = {p.strip().upper() for p in partners}
        partner_codes = [code for code, label in partner_pairs if code.upper() in wanted or str(label).upper() in wanted]
        if not partner_codes:
            first_codes = ", ".join(code for code, _ in partner_pairs[:5])
            raise RuntimeError(f"No partner matches found. Example codes: {first_codes}")
    print(f"total partner codes selected: {len(partner_codes)}")

    all_months = kas.meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months
    print(f"total months in table: {len(all_months)}; picking {len(pick)}")
    if pick:
        print(f"sample months: {pick[:3]} ... {pick[-3:]}")

    query = [
        {"code": dim_partner, "selection": {"filter": "item", "values": partner_codes}},
        {"code": dim_time, "selection": {"filter": "item", "values": pick}},
    ]
    if dim_unit:
        unit_pairs = kas.meta_value_map(meta, dim_unit)
        thousand = next(
            (code for code, text in unit_pairs if "000" in str(text) or "thousand" in str(text).lower()),
            None,
        )
        if thousand:
            query.append({"code": dim_unit, "selection": {"filter": "item", "values": [thousand]}})
            print(f"fixed unit code: {thousand}")

    body = {"query": query, "response": {"format": "JSON"}}
    dump_json(out_dir / f"{tag}_body.json", body)
    cube = kas.px_post_data(parts, body, lang=lang)
    dump_json(out_dir / f"{tag}_raw.json", cube)
    values = cube.get("value", [])
    print(f"total raw values: {len(values)}")
    if values:
        print("first values:", values[:10])


def inspect_generic(tag: str, parts: List[str], months: Optional[int], out_dir: Path, lang: str) -> None:
    print(f"\n== {tag} ==")
    meta = kas.px_get_meta(parts, lang=lang)
    dump_json(out_dir / f"{tag}_meta.json", meta)

    dim_time = _find_time(meta)
    other_dims = [str(v.get("code")) for v in kas.meta_variables(meta) if v.get("code") != dim_time]
    print(f"time dim: {dim_time}")
    print(f"other dims: {other_dims}")

    for dim in other_dims:
        pairs = kas.meta_value_map(meta, dim)
        print(f"  {dim}: {len(pairs)} values")
        sample = pairs[:5]
        for code, text in sample:
            print(f"    {code}: {text}")
        if len(pairs) > 5:
            print("    ...")

    all_months = kas.meta_time_codes(meta, dim_time)
    pick = all_months[-months:] if months else all_months
    print(f"total months in table: {len(all_months)}; picking {len(pick)}")
    if pick:
        print(f"sample months: {pick[:3]} ... {pick[-3:]}")

    query: List[Dict[str, Any]] = []
    for dim in other_dims:
        values = [code for code, _ in kas.meta_value_map(meta, dim)]
        query.append({"code": dim, "selection": {"filter": "item", "values": values}})
    query.append({"code": dim_time, "selection": {"filter": "item", "values": pick}})

    body = {"query": query, "response": {"format": "JSON"}}
    dump_json(out_dir / f"{tag}_body.json", body)
    cube = kas.px_post_data(parts, body, lang=lang)
    dump_json(out_dir / f"{tag}_raw.json", cube)

    records = cube.get("data") or []
    print(f"total records: {len(records)}")
    if records:
        first = records[0]
        print("sample record:", first)


def main() -> None:
    ap = argparse.ArgumentParser(description="Dump raw PxWeb responses for KAS tables.")
    table_choices = [
        "trade",
        "energy",
        "partner",
        "gasoline",
        "diesel",
        "lng",
        "jet",
        "tourism_region",
        "tourism_country",
        "all",
    ]
    ap.add_argument(
        "--table",
        choices=table_choices,
        default="trade",
        help="Which table to inspect (default: trade).",
    )
    ap.add_argument("--months", type=int, help="Limit to the last N months.")
    ap.add_argument("--partners", help="Comma separated partner list for partner table (e.g. AL,RS).")
    ap.add_argument("--lang", default="en", help="PxWeb language code (default: en).")
    ap.add_argument("--out", default="data/_kas_debug", help="Directory for debug JSON output.")
    args = ap.parse_args()

    out_dir = Path(args.out)
    partners = [p for p in args.partners.split(",") if p.strip()] if args.partners else None

    tables = [args.table]
    if args.table == "all":
        tables = [
            "trade",
            "energy",
            "partner",
            "gasoline",
            "diesel",
            "lng",
            "jet",
            "tourism_region",
            "tourism_country",
        ]

    for table in tables:
        if table == "trade":
            inspect_trade(args.months, out_dir, args.lang)
        elif table == "energy":
            inspect_energy(args.months, out_dir, args.lang)
        elif table == "partner":
            inspect_partners(args.months, out_dir, args.lang, partners)
        elif table in FUEL_TABLES:
            inspect_generic(table, FUEL_TABLES[table], args.months, out_dir, args.lang)
        elif table in TOURISM_TABLES:
            inspect_generic(table, TOURISM_TABLES[table], args.months, out_dir, args.lang)


if __name__ == "__main__":
    main()
