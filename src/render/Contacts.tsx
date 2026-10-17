/**
 * Contact rendering from the TRAINEE VIEW ONLY.
 *
 * This module must never import ground truth. Visual categories are
 * generalized silhouettes (fictional): quad-arm multirotor, tube
 * fixed-wing, bird-like flapper, plain civilian quad, and an indistinct
 * blob for unidentified/decoy.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TraineeContactView } from '../core/sim/engine';

export interface ContactsProps {
  contacts: TraineeContactView[];
  /** Selection callback with the contact id (trainee-facing id only). */
  onSelect: (contactId: string) => void;
  selectedId: string | null;
  /** When false, interactions are disabled (e.g. session not running). */
  interactive: boolean;
}

function ContactMesh({
  contact,
  selected,
  onSelect,
  interactive,
}: {
  contact: TraineeContactView;
  selected: boolean;
  onSelect: (id: string) => void;
  interactive: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const baseColor = new THREE.Color(contact.appearance.color);

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g || !contact.position) return;
    g.position.set(contact.position[0], contact.position[1], contact.position[2]);
    g.rotation.y = contact.heading;
    if (lightRef.current && contact.appearance.hasLights) {
      // Deterministic blink: 1Hz square wave from sim-independent clock is
      // fine for cosmetics only (not gameplay-relevant).
      lightRef.current.intensity = Math.floor(clock.elapsedTime * 2) % 2 === 0 ? 2.2 : 0;
    }
  });

  const scale = contact.appearance.scale;

  return (
    <group
      ref={groupRef}
      scale={[scale, scale, scale]}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) onSelect(contact.id);
      }}
      name={`contact-${contact.id}`}
    >
      {contact.category === 'smallMultirotor' || contact.category === 'civilianLike' ? (
        <group>
          <mesh>
            <boxGeometry args={[0.9, 0.35, 0.9]} />
            <meshStandardMaterial color={baseColor} roughness={0.6} />
          </mesh>
          {[
            [0.7, 0, 0.7],
            [-0.7, 0, 0.7],
            [0.7, 0, -0.7],
            [-0.7, 0, -0.7],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <cylinderGeometry args={[0.35, 0.35, 0.05, 8]} />
              <meshStandardMaterial color="#20262d" />
            </mesh>
          ))}
        </group>
      ) : contact.category === 'largeMultirotor' ? (
        <group>
          <mesh>
            <boxGeometry args={[1.6, 0.5, 1.6]} />
            <meshStandardMaterial color={baseColor} roughness={0.55} />
          </mesh>
          {[
            [1.2, 0, 1.2],
            [-1.2, 0, 1.2],
            [1.2, 0, -1.2],
            [-1.2, 0, -1.2],
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <cylinderGeometry args={[0.55, 0.55, 0.08, 10]} />
              <meshStandardMaterial color="#1b2027" />
            </mesh>
          ))}
        </group>
      ) : contact.category === 'fixedWing' ? (
        <group>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 2.4, 8]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[3.2, 0.08, 0.7]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
          <mesh position={[0, 0, -1.05]}>
            <boxGeometry args={[1.1, 0.06, 0.35]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
        </group>
      ) : contact.category === 'birdLike' ? (
        <group>
          <mesh>
            <sphereGeometry args={[0.28, 6, 6]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
          <mesh position={[0.5, 0.05, 0]} rotation={[0, 0, 0.4]}>
            <boxGeometry args={[0.9, 0.04, 0.25]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
          <mesh position={[-0.5, 0.05, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.9, 0.04, 0.25]} />
            <meshStandardMaterial color={baseColor} />
          </mesh>
        </group>
      ) : (
        /* unidentified / decoy: indistinct low-detail shape */
        <mesh>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color={baseColor} roughness={0.95} flatShading />
        </mesh>
      )}

      {contact.appearance.hasLights && (
        <pointLight ref={lightRef} color="#ff5a4d" distance={12} intensity={0} />
      )}

      {selected && (
        <mesh>
          <sphereGeometry args={[1.6, 12, 12]} />
          <meshBasicMaterial color="#4da3ff" wireframe transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  );
}

export function Contacts({ contacts, onSelect, selectedId, interactive }: ContactsProps) {
  return (
    <group>
      {contacts
        .filter((c) => c.visibility === 'visible' && c.position)
        .map((c) => (
          <ContactMesh
            key={c.id}
            contact={c}
            selected={c.id === selectedId}
            onSelect={onSelect}
            interactive={interactive}
          />
        ))}
    </group>
  );
}
