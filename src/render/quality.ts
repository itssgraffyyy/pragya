/** Presentation budgets only; persisted medium remains backwards compatible. */
export const GRAPHICS = {
 low: { label: 'Low', maxDpr: .6, detail: 0, terrainSegments: 16, shadowSize: 0, rain: 220 },
 medium: { label: 'Balanced', maxDpr: 1.25, detail: 1, terrainSegments: 32, shadowSize: 1024, rain: 450 },
 high: { label: 'High', maxDpr: 1.75, detail: 2, terrainSegments: 48, shadowSize: 2048, rain: 600 },
} as const;
export function boundedDpr(preset: keyof typeof GRAPHICS, scale: number, deviceDpr: number) {
 return Math.max(.5, Math.min(deviceDpr * scale, GRAPHICS[preset].maxDpr));
}
