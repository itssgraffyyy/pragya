/**
 * Environment rendering: urban/rural presets, time-of-day lighting,
 * fog from visibility, rain particles. Purely fictional low-poly scenery.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { EnvironmentPreset, TimeOfDay, VisibilityCondition, WeatherEffect } from '../core/types';

export interface EnvironmentProps {
  environment: EnvironmentPreset;
  timeOfDay: TimeOfDay;
  visibility: VisibilityCondition;
  weather: WeatherEffect;
}

const SKY_BY_TIME: Record<TimeOfDay, { sky: string; fog: string; hemi: number; dir: number; ambient: number }> = {
  day: { sky: '#93b6d1', fog: '#93b6d1', hemi: 0.9, dir: 1.1, ambient: 0.35 },
  dusk: { sky: '#5c5170', fog: '#5c5170', hemi: 0.55, dir: 0.6, ambient: 0.25 },
  night: { sky: '#10161f', fog: '#10161f', hemi: 0.22, dir: 0.12, ambient: 0.12 },
};

const FOG_DENSITY: Record<VisibilityCondition, number> = {
  clear: 0.0012,
  lightFog: 0.006,
  denseFog: 0.016,
};

/** Simple deterministic building layout for the urban preset. */
function useUrbanBuildings(seed: number) {
  return useMemo(() => {
    const buildings: { x: number; z: number; w: number; d: number; h: number }[] = [];
    let s = seed >>> 0 || 1;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < 26; i++) {
      buildings.push({
        x: -160 + rand() * 320,
        z: -220 + rand() * 170,
        w: 8 + rand() * 16,
        d: 8 + rand() * 16,
        h: 12 + rand() * 46,
      });
    }
    return buildings;
  }, [seed]);
}

export function Environment({ environment, timeOfDay, visibility, weather }: EnvironmentProps) {
  const palette = SKY_BY_TIME[timeOfDay];
  const fogDensity = FOG_DENSITY[visibility] * (weather === 'reducedContrast' ? 1.4 : 1);
  const buildings = useUrbanBuildings(1234);

  const fogColor = useMemo(() => new THREE.Color(palette.fog), [palette.fog]);
  const rainCount = weather === 'rain' ? 900 : 0;
  const rainPositions = useMemo(() => {
    if (rainCount === 0) return null;
    const arr = new Float32Array(rainCount * 3);
    let s = 424242;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < rainCount; i++) {
      arr[i * 3] = -200 + rand() * 400;
      arr[i * 3 + 1] = rand() * 120;
      arr[i * 3 + 2] = -250 + rand() * 320;
    }
    return arr;
  }, [rainCount]);

  return (
    <>
      <color attach="background" args={[palette.sky]} />
      <fogExp2 attach="fog" args={[fogColor, fogDensity]} />
      <hemisphereLight args={[palette.sky, '#2a2f28', palette.hemi]} />
      <directionalLight position={[60, 120, 40]} intensity={palette.dir} />
      <ambientLight intensity={palette.ambient} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -60]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial
          color={environment === 'urban' ? '#3a3f47' : '#3c4a33'}
          roughness={0.95}
        />
      </mesh>

      {/* Urban buildings (axis-aligned boxes; no real-world geography) */}
      {environment === 'urban' &&
        buildings.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={i % 3 === 0 ? '#4a525c' : '#3d444d'} roughness={0.9} />
          </mesh>
        ))}

      {/* Rural tree stand (cones) */}
      {environment === 'rural' &&
        Array.from({ length: 18 }).map((_, i) => {
          const x = -170 + ((i * 97) % 340);
          const z = -210 + ((i * 61) % 160);
          const h = 6 + (i % 5) * 2;
          return (
            <mesh key={i} position={[x, h / 2, z]} castShadow>
              <coneGeometry args={[3 + (i % 3), h, 6]} />
              <meshStandardMaterial color="#2f4030" roughness={1} />
            </mesh>
          );
        })}

      {/* Rain particles */}
      {rainPositions && (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[rainPositions, 3]} />
          </bufferGeometry>
          <pointsMaterial size={0.4} color="#9db8cf" transparent opacity={0.5} />
        </points>
      )}
    </>
  );
}
