# Customs Data Helpers

Browser-friendly Dexie + MiniSearch utilities for Kosovo customs datasets. Export `CustomsDataService` to load, index, and query tariff records. JSON snapshots live in `data/`.

## Maintaining the dataset

- Set `CUSTOMS_DATA_SOURCE_URL` (or `DATA_SOURCE_URL`) before running the fetch script.
- Refresh the dataset with `pnpm --filter @workspace/customs-data fetch-data` (fetches and trims).
- Individual steps remain available via `pnpm --filter @workspace/customs-data fetch-tarrifs` and `trim-tarrifs`.
