import { CoverageReport } from 'monocart-coverage-reports'
import { coverageEnabled, coverageOptions } from './coverage'

export default async function globalTeardown() {
  if (!coverageEnabled) return
  await new CoverageReport(coverageOptions).generate()
}
