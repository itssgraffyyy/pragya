import { useSettingsStore } from '../store/settingsStore';
import { ACESFilmicToneMapping,SRGBColorSpace } from 'three';
/**
 * Main 3D viewport: environment + contacts + orbit controls.
 * Renders from the trainee view only; no ground truth enters this tree.
 */

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { TraineeView } from '../core/sim/engine';
import { Environment } from './Environment';
import { Contacts } from './Contacts';

export interface SimSceneProps {
  view: TraineeView;
  selectedContactId: string | null;
  onSelectContact: (contactId: string) => void;
  interactive: boolean;
  renderScale: number;
  reducedMotion: boolean;
}

export function SimScene({
  view,
  selectedContactId,
  onSelectContact,
  interactive,
  renderScale,
  reducedMotion,
}: SimSceneProps) {
  const preset=useSettingsStore(s=>s.graphicsPreset);
  const dpr = Math.min(window.devicePixelRatio * renderScale, 2);
  return (
    <Canvas
      dpr={dpr}
      shadows={preset!=='low'}
      camera={{ position: [0, 55, 130], fov: 55, near: 0.5, far: 900 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: preset!=='low'&&!reducedMotion, powerPreference: 'high-performance',toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace }}
      data-testid="sim-canvas"
    >
      <Suspense fallback={null}>
        <Environment
          environment={view.environment}
          timeOfDay={view.timeOfDay}
          visibility={view.visibility}
          weather={view.weather}
        />
        <Contacts
          contacts={view.contacts}
          selectedId={selectedContactId}
          onSelect={onSelectContact}
          interactive={interactive}
        />
        <OrbitControls
          enableDamping={!reducedMotion}
          dampingFactor={0.08}
          target={[0, 30, -60]}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={20}
          maxDistance={320}
        />
      </Suspense>
    </Canvas>
  );
}
