#!/usr/bin/env node

import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SOURCE =
  process.env.CUSTOMS_DATA_SOURCE_URL || process.env.DATA_SOURCE_URL || ""

if (!SOURCE) {
  console.log(
    "Skipping customs tariff fetch because CUSTOMS_DATA_SOURCE_URL/DATA_SOURCE_URL is not configured.",
  )
  process.exit(0)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, scriptName)], {
      stdio: "inherit",
    })

    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${scriptName} exited with code ${code}`))
      }
    })

    child.on("error", (error) => {
      reject(error)
    })
  })
}

try {
  await runScript("fetch-tarrifs.mjs")
  await runScript("trim-tarrifs.mjs")
} catch (error) {
  console.error("Failed to refresh customs data:", error)
  process.exit(1)
}
