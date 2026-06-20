"use client";

import { Float, Line, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function CubeRig() {
  const group = useRef<THREE.Group>(null);
  const small = useRef<THREE.Group>(null);
  const proofBlocks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        position: [
          Math.sin(index * 1.7) * 1.6,
          Math.cos(index * 0.8) * 1.1,
          -0.8 + index * 0.11,
        ] as [number, number, number],
        scale: 0.12 + (index % 3) * 0.04,
      })),
    [],
  );

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = time * 0.16;
      group.current.rotation.x = Math.sin(time * 0.3) * 0.12;
    }
    if (small.current) {
      const pulse = 0.82 + Math.sin(time * 1.6) * 0.22;
      small.current.scale.setScalar(pulse);
      small.current.rotation.x = time * 0.5;
      small.current.rotation.y = time * 0.7;
    }
  });

  return (
    <Float floatIntensity={0.8} rotationIntensity={0.25}>
      <group ref={group}>
        <WireCube size={3.4} />
        <group position={[0.15, -0.05, 0.1]} ref={small}>
          <WireCube size={1.25} />
        </group>
        {proofBlocks.map((block, index) => (
          <mesh key={index} position={block.position} scale={block.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color="#39ff5a" transparent opacity={0.12} wireframe />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

function WireCube({ size }: { size: number }) {
  const half = size / 2;
  const points: [number, number, number][][] = [
    [
      [-half, -half, -half],
      [half, -half, -half],
      [half, half, -half],
      [-half, half, -half],
      [-half, -half, -half],
    ],
    [
      [-half, -half, half],
      [half, -half, half],
      [half, half, half],
      [-half, half, half],
      [-half, -half, half],
    ],
    [
      [-half, -half, -half],
      [-half, -half, half],
    ],
    [
      [half, -half, -half],
      [half, -half, half],
    ],
    [
      [half, half, -half],
      [half, half, half],
    ],
    [
      [-half, half, -half],
      [-half, half, half],
    ],
  ];

  return (
    <group>
      {points.map((line, index) => (
        <Line color="#39ff5a" key={index} lineWidth={1.6} points={line} transparent opacity={0.92} />
      ))}
    </group>
  );
}

export function MorphCubeScene() {
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-[2rem] border border-neon/20 bg-black shadow-neon-soft">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5.8]} />
        <color args={["#000000"]} attach="background" />
        <ambientLight intensity={0.4} />
        <pointLight color="#39ff5a" intensity={18} position={[3, 4, 4]} />
        <CubeRig />
      </Canvas>
    </div>
  );
}
