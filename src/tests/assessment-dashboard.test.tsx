// @vitest-environment jsdom
import './setup';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AssessmentDashboard } from '../ui/AssessmentDashboard';
import { SimulationEngine } from '../core/sim/engine';
import { buildSessionExport } from '../core/sim/sessionSummary';
import { SCENARIO_SINGLE_RECOGNITION } from '../core/scenario/bundled/scenariosA';

function session() {
  const engine = new SimulationEngine({ scenario: SCENARIO_SINGLE_RECOGNITION, sessionId: 'ui', traineeId: 't' });
  engine.load(); engine.start(); engine.abort(); return buildSessionExport(engine);
}

describe('assessment dashboard', () => {
  it('shows scores and replay and rejects invalid policies without replacing results', async () => {
    await act(async () => { render(<AssessmentDashboard session={session()} />); });
    expect(screen.getByTestId('assessment-overall')).toHaveTextContent('0.0 / 100');
    expect(screen.getByTestId('replay-frame')).toHaveTextContent('sessionStarted');
    fireEvent.change(screen.getByLabelText('Scoring policy JSON'), { target: { value: '{}' } });
    fireEvent.click(screen.getByText('Apply policy preview'));
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.getByTestId('assessment-overall')).toHaveTextContent('0.0 / 100');
    fireEvent.change(screen.getByLabelText('Replay event'), { target: { value: '1' } });
    expect(screen.getByTestId('replay-frame')).toHaveTextContent('sessionAborted');
  });
});


