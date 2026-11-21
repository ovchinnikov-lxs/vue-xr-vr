import { CoverageReport } from 'monocart-coverage-reports'
import { coverageEnabled, coverageOptions } from './coverage'

export default async function globalSetup() {
  // Drop coverage left over from an earlier run.
  if (coverageEnabled) new CoverageReport(coverageOptions).cleanCache()
}
