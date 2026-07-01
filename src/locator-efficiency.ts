export interface PatchCharEfficiency {
  patchChars: number;
  baselineChars: number;
}

export function formatLocatorCostWarning(efficiency: PatchCharEfficiency): string | undefined {
  const ratio = getLocatorCostRatioPercent(efficiency);
  if (ratio === undefined || ratio <= 50) {
    return undefined;
  }
  return `Warning: locator cost is ${ratio.toFixed(1)}% of baseline. Use shorter locators or ... ranges.`;
}

function getLocatorCostRatioPercent(efficiency: PatchCharEfficiency): number | undefined {
  if (efficiency.baselineChars === 0) {
    return undefined;
  }
  return (efficiency.patchChars / efficiency.baselineChars) * 100;
}
