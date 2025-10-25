#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SOURCE_URL =
  process.env.CUSTOMS_DATA_SOURCE_URL || process.env.DATA_SOURCE_URL || ""

if (!SOURCE_URL) {
  console.error(
    "CUSTOMS_DATA_SOURCE_URL (or DATA_SOURCE_URL) environment variable is required",
  )
  process.exit(1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const DATA_DIR = path.join(ROOT, "data")
const DATA_PATH = path.join(DATA_DIR, "tarrifs.json")

async function main() {
  console.log(`Fetching customs data from ${SOURCE_URL}`)
  const response = await fetch(SOURCE_URL)
  if (!response.ok) {
    throw new Error(`Failed to download dataset: ${response.status} ${response.statusText}`)
  }

  const payload = await response.text()
  let parsed
  try {
    parsed = JSON.parse(payload)
  } catch (error) {
    throw new Error(`Received invalid JSON payload: ${error.message}`)
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Expected JSON array but received ${typeof parsed}`)
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(DATA_PATH, JSON.stringify(parsed), "utf8")
  console.log(`Saved ${parsed.length} records to ${path.relative(ROOT, DATA_PATH)}`)
}

main().catch((error) => {
  console.error("Failed to fetch customs dataset:", error)
  process.exitCode = 1
})
