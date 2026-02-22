// IDs used by the sample data loaded in store.ts > loadSampleData()
export const SAMPLE_INITIATIVE_IDS = ['1', '2', '3', '4'];
export const SAMPLE_MEETING_IDS = ['1', '2', '3'];
export const SAMPLE_RISK_IDS = ['1', '2'];
export const SAMPLE_PERSONA_IDS = ['p1', 'p2'];

const ALL_SAMPLE_IDS = new Set([
  ...SAMPLE_INITIATIVE_IDS,
  ...SAMPLE_MEETING_IDS,
  ...SAMPLE_RISK_IDS,
  ...SAMPLE_PERSONA_IDS,
]);

export function isSampleData(id: string): boolean {
  return ALL_SAMPLE_IDS.has(id);
}
