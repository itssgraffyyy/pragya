/**
 * Canonical learning objectives shared by bundled scenarios, the procedural
 * generator and the adaptive difficulty service.
 */

export interface LearningObjectiveDef {
  id: string;
  label: string;
  /** Broad families used for constrained generation. */
  family: 'recognition' | 'uncertainty' | 'evidence' | 'procedure' | 'multiContact';
}

export const LEARNING_OBJECTIVES: LearningObjectiveDef[] = [
  { id: 'synthetic-group-awareness', label: 'Qualify synthetic group observations without unsupported claims', family: 'multiContact' },
  { id: 'basic-recognition', label: 'Recognize a single basic aerial contact', family: 'recognition' },
  { id: 'category-discrimination', label: 'Discriminate multirotor vs fixed-wing vs bird-like contacts', family: 'recognition' },
  { id: 'low-visibility-observation', label: 'Maintain observation under reduced visibility', family: 'uncertainty' },
  { id: 'unknown-classification', label: 'Select "Unknown" and low confidence when evidence is insufficient', family: 'uncertainty' },
  { id: 'multi-contact-tracking', label: 'Track multiple simultaneous contacts independently', family: 'multiContact' },
  { id: 'distractor-rejection', label: 'Reject harmless/distractor contacts without over-classifying', family: 'recognition' },
  { id: 'evidence-selection', label: 'Select supporting observations that justify a classification', family: 'evidence' },
  { id: 'conflicting-sources', label: 'Handle disagreement between simulated information sources', family: 'uncertainty' },
  { id: 'procedural-response', label: 'Choose an instructor-approved procedural response', family: 'procedure' },
  { id: 'escalation-discipline', label: 'Escalate only when criteria are met', family: 'procedure' },
];

export function objectiveById(id: string): LearningObjectiveDef | undefined {
  return LEARNING_OBJECTIVES.find((o) => o.id === id);
}
