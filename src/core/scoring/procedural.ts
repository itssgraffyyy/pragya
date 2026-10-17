/** PRAGYA Module 2 — procedural decision-tree evaluation. */

import type { ContactDefinition, ProceduralResponse, TraineeClassification, EvidenceItem, ConfidenceLevel } from '../types';
import type { ScoringPolicy } from './policy';
import type { ContactScore } from './results';

export interface ProcContext {
  response: ProceduralResponse;
  classification: TraineeClassification | null;
  correct: ProceduralResponse;
  evidence: EvidenceItem[];
  confidence: ConfidenceLevel | null;
  acceptable: TraineeClassification[];
}

export function evaluateProcedural(
  def: ContactDefinition,
  response: ProceduralResponse | null,
  classification: TraineeClassification | null,
  policy: ScoringPolicy,
  evidence: EvidenceItem[] = [],
  confidence: ConfidenceLevel | null = null,
): { score: number; ruleIds: string[]; outcome: ContactScore['proceduralOutcome'] } {
  if (!response) return { score: 0, ruleIds: [], outcome: 'missing' };
  let best = 0;
  const applied: string[] = [];
  const ctx: ProcContext = { response, classification, correct: def.assessment.correctResponse, evidence, confidence, acceptable: def.assessment.acceptableClassifications };
  for (const node of policy.decisionTrees) {
    const r = evaluateNode(node, ctx);
    if (r.score > best) best = r.score;
    applied.push(...r.applied);
  }
  return { score: best, ruleIds: applied.length > 0 ? applied : ['procedural-no-match'], outcome: best === 1 && response === def.assessment.correctResponse ? 'correct' : best >= 0.5 ? 'acceptable' : 'incorrect' };
}

type Node = ScoringPolicy['decisionTrees'][number];

function evaluateNode(node: Node, ctx: ProcContext): { score: number; applied: string[] } {
  let pass = false;
  switch (node.kind) {
    case 'proceduralMatch':
      pass = node.expected?.includes(ctx.response) ?? ctx.response === ctx.correct;
      break;
    case 'classificationMatch':
      pass = ctx.classification !== null && (node.expected?.includes(ctx.classification) ?? false);
      break;
    case 'evidencePresent':
      pass = node.expected ? node.expected.every((e) => ctx.evidence.includes(e as EvidenceItem)) : ctx.evidence.length > 0;
      break;
    case 'confidenceReasonable':
      pass = ctx.confidence !== null && (node.expected ? node.expected.includes(ctx.confidence) : ctx.classification !== null && (ctx.acceptable.includes(ctx.classification) || ctx.confidence === 'low'));
      break;
  }
  const applied = [node.id];
  let score = pass ? node.passScore : node.failScore;
  if (pass && node.children) {
    for (const child of node.children as Node[]) {
      const r = evaluateNode(child, ctx);
      score = Math.min(score, r.score);
      applied.push(...r.applied);
    }
  }
  return { score, applied };
}


