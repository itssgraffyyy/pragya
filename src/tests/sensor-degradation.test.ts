import { describe, expect, it } from 'vitest';
import { rawFeedState, rawSensorSnapshot, traineeStatus } from '../core/sensors/degradation';
import type { SensorConfiguration } from '../core/types';
import { falsePositiveActive } from '../core/sim/engine';

const config = (condition: SensorConfiguration['channels'][number]['actualCondition'], intensity = 0.6): SensorConfiguration => ({
  channels: [
    { channel: 'primary', actualCondition: condition, intensity, displayedStatus: 'nominal' },
  ],
  delaySeconds: 10,
  lossIntervalSeconds: 10,
});

describe('sensor degradation engine', () => {
  it('normal condition yields a live feed', () => {
    const feed = rawFeedState(config('normal'), 'primary', 5);
    expect(feed.feedLive).toBe(true);
    expect(feed.frozen).toBe(false);
    expect(feed.delaySeconds).toBe(0);
  });

  it('intermittent loss follows a deterministic square wave', () => {
    const c = config('intermittentLoss', 1);
    // intensity 1 => feed is DOWN during the first 30% of each 10s interval
    // (phase < 0.3), UP for the remaining 70%.
    expect(rawFeedState(c, 'primary', 2).feedLive).toBe(false); // phase 0.2
    expect(rawFeedState(c, 'primary', 5).feedLive).toBe(true); // phase 0.5
    expect(rawFeedState(c, 'primary', 8).feedLive).toBe(true); // phase 0.8
    expect(rawFeedState(c, 'primary', 12).feedLive).toBe(false); // phase 0.2
    expect(rawFeedState(c, 'primary', 18).feedLive).toBe(true); // phase 0.8
  });

  it('frozen sets frozen flag', () => {
    expect(rawFeedState(config('frozen'), 'primary', 3).frozen).toBe(true);
  });

  it('delayed scales delaySeconds by intensity', () => {
    const feed = rawFeedState(config('delayed', 0.5), 'primary', 3);
    expect(feed.delaySeconds).toBeCloseTo(5, 5);
  });

  it('missingObservations hides contacts', () => {
    expect(rawFeedState(config('missingObservations'), 'primary', 3).hideContacts).toBe(true);
  });

  it('falsePositives and sourceDisagreement set their flags', () => {
    expect(rawFeedState(config('falsePositives'), 'primary', 3).falsePositive).toBe(true);
    expect(rawFeedState(config('sourceDisagreement'), 'primary', 3).sourceDisagreement).toBe(true);
  });

  it('false positive marker pulses deterministically', () => {
    const feed = rawFeedState(config('falsePositives'), 'primary', 0);
    expect(falsePositiveActive(feed, 1)).toBe(true);
    expect(falsePositiveActive(feed, 6)).toBe(false);
  });

  it('trainee status hides the specific condition', () => {
    const status = traineeStatus(config('frozen'), 'primary');
    expect(status.status).toBe('nominal'); // displayedStatus is nominal in this config
    expect(JSON.stringify(status)).not.toContain('frozen');
  });

  it('trainee status can show degraded when configured', () => {
    const c = config('noisy');
    c.channels[0].displayedStatus = 'degraded';
    const status = traineeStatus(c, 'primary');
    expect(status.status).toBe('degraded');
    expect(status.description).toMatch(/verify/i);
  });

  it('raw snapshot serializes all channels', () => {
    const snap = rawSensorSnapshot(config('noisy', 0.8), 5);
    expect(snap.primary).toContain('noisy');
    expect(snap.primary).toContain('intensity=0.80');
  });
});
