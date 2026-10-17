/**
 * Synthetic sensor degradation engine.
 *
 * Produces two views:
 *  - `rawFeedState`   — actual internal condition (engine truth, used by
 *                       instructor tools and the event log).
 *  - `traineeStatus`  — what the trainee-facing status indicator is allowed
 *                       to display during the exercise.
 *
 * No real-world sensor characteristics are modeled. Conditions are purely
 * synthetic training effects.
 */

import type { SensorCondition, SensorConfiguration } from '../types';

export interface FeedState {
  channel: 'primary' | 'secondary';
  condition: SensorCondition;
  /** 0..1 scaling of the effect. */
  intensity: number;
  /** Whether the feed is currently delivering any image at all. */
  feedLive: boolean;
  /** Whether the image is currently frozen on a stale frame. */
  frozen: boolean;
  /** Display delay in simulation seconds (0 = none). */
  delaySeconds: number;
  /** Whether a false-positive contact marker should be injected. */
  falsePositive: boolean;
  /** Whether the secondary source disagrees with the primary. */
  sourceDisagreement: boolean;
  /** Conditions that hide a subset of contacts from the feed. */
  hideContacts: boolean;
}

export interface TraineeSensorStatus {
  channel: 'primary' | 'secondary';
  /** Coarse status shown to the trainee. */
  status: 'nominal' | 'degraded' | 'unknown';
  /** Free-text description safe to show trainees. */
  description: string;
}

/**
 * Compute the raw feed state for a channel at simulation time `t`.
 * Intermittent loss toggles based on a deterministic square wave derived
 * from the loss interval — reproducible for a given scenario + time.
 */
export function rawFeedState(
  config: SensorConfiguration,
  channel: 'primary' | 'secondary',
  t: number,
): FeedState {
  const ch = config.channels.find((c) => c.channel === channel);
  const base: FeedState = {
    channel,
    condition: ch?.actualCondition ?? 'normal',
    intensity: ch?.intensity ?? 0,
    feedLive: true,
    frozen: false,
    delaySeconds: 0,
    falsePositive: false,
    sourceDisagreement: false,
    hideContacts: false,
  };
  if (!ch || ch.actualCondition === 'normal') return base;

  switch (ch.actualCondition) {
    case 'intermittentLoss': {
      // Deterministic square wave: on for 70% of each interval, off for 30%.
      const interval = Math.max(config.lossIntervalSeconds, 1);
      const phase = (t % interval) / interval;
      base.feedLive = phase >= 0.3 * ch.intensity;
      break;
    }
    case 'frozen':
      base.frozen = true;
      break;
    case 'delayed':
      base.delaySeconds = config.delaySeconds * Math.max(ch.intensity, 0.2);
      break;
    case 'missingObservations':
      base.hideContacts = true;
      break;
    case 'falsePositives':
      base.falsePositive = true;
      break;
    case 'sourceDisagreement':
      base.sourceDisagreement = true;
      break;
    default:
      break; // noisy / blurred / reducedContrast are visual-only
  }
  return base;
}

/** Trainee-facing status text. Hides the specific condition on purpose. */
export function traineeStatus(
  config: SensorConfiguration,
  channel: 'primary' | 'secondary',
): TraineeSensorStatus {
  const ch = config.channels.find((c) => c.channel === channel);
  if (!ch) {
    return { channel, status: 'unknown', description: 'Channel unavailable' };
  }
  if (ch.displayedStatus === 'nominal') {
    // The exercise deliberately reports nominal even when degraded —
    // trainees must judge the feed by its content, not its label.
    return { channel, status: 'nominal', description: 'Feed nominal (per status panel)' };
  }
  if (ch.displayedStatus === 'degraded') {
    return { channel, status: 'degraded', description: 'Feed degraded — verify observations' };
  }
  return { channel, status: 'unknown', description: 'Feed status unknown — treat with caution' };
}

/** Snapshot of every channel's raw state, for the event log. */
export function rawSensorSnapshot(config: SensorConfiguration, t: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ch of config.channels) {
    const raw = rawFeedState(config, ch.channel, t);
    out[ch.channel] = [
      raw.condition,
      `intensity=${raw.intensity.toFixed(2)}`,
      raw.feedLive ? 'live' : 'lost',
      raw.frozen ? 'frozen' : '',
      raw.delaySeconds > 0 ? `delay=${raw.delaySeconds.toFixed(1)}s` : '',
    ]
      .filter(Boolean)
      .join('|');
  }
  return out;
}
