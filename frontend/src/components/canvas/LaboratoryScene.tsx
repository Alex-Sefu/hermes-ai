import { useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { HermesAvatar, type HermesAvatarState } from "./HermesAvatar";

interface LaboratorySceneProps {
  aiState: HermesAvatarState;
  accentColor: string;
}

function ResponsiveAvatar({ aiState, accentColor }: LaboratorySceneProps) {
  const width = useThree((state) => state.size.width);
  const isMobile = width < 760;
  const scale = isMobile ? 0.34 : 0.72;
  const offsetX = isMobile ? 0 : -(width * 0.00135);
  const offsetY = isMobile ? 1.45 : 0.08;

  return (
    <group position={[offsetX, offsetY, 0]} scale={scale}>
      <HermesAvatar aiState={aiState} accentColor={accentColor} />
    </group>
  );
}

function ReflectiveFloor({ color }: { color: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={-1.55}>
      <planeGeometry args={[80, 80]} />
      <MeshReflectorMaterial
        color={color}
        metalness={0.58}
        roughness={0.45}
        mirror={0.16}
        mixStrength={0.28}
        mixBlur={0.9}
        resolution={256}
        blur={[240, 80]}
      />
    </mesh>
  );
}

function SceneContents({ aiState, accentColor }: LaboratorySceneProps) {
  const accent = useMemo(() => new THREE.Color(accentColor), [accentColor]);
  const complementary = useMemo(
    () => accent.clone().offsetHSL(0.43, -0.08, 0.12),
    [accent],
  );
  const sceneBackground = useMemo(
    () => new THREE.Color("#07070c").lerp(accent, 0.065),
    [accent],
  );
  const floorColor = useMemo(
    () => new THREE.Color("#111117").lerp(accent, 0.11),
    [accent],
  );

  return (
    <>
      <color attach="background" args={[sceneBackground]} />
      <fog attach="fog" args={[sceneBackground, 8, 19]} />
      <ambientLight intensity={0.42} color={complementary} />
      <hemisphereLight args={[complementary, "#17120e", 0.7]} />
      <pointLight position={[-4, 2.6, 2]} intensity={18} color={complementary} distance={11} />
      <pointLight position={[4, 1.8, -1]} intensity={24} color={accentColor} distance={10} />
      <Environment resolution={128}>
        <Lightformer
          form="circle"
          intensity={2.6}
          color={accentColor}
          position={[-3, 2.5, 2]}
          scale={[2.8, 2.8, 1]}
        />
        <Lightformer
          form="circle"
          intensity={2.2}
          color={complementary}
          position={[3, 1, 1]}
          scale={[2.5, 2.5, 1]}
        />
        <Lightformer
          form="ring"
          intensity={2}
          color={accentColor}
          position={[0, 0, -4]}
          scale={4}
        />
      </Environment>
      <spotLight
        position={[0, 7, 3]}
        intensity={48}
        angle={0.48}
        penumbra={0.8}
        distance={16}
        color={complementary}
        castShadow
      />
      <ResponsiveAvatar aiState={aiState} accentColor={accentColor} />
      <ReflectiveFloor color={floorColor.getStyle()} />
    </>
  );
}

export function LaboratoryScene({ aiState, accentColor }: LaboratorySceneProps) {
  return (
    <div className="laboratory-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.35, 7.2], fov: 38 }}
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <SceneContents aiState={aiState} accentColor={accentColor} />
      </Canvas>
    </div>
  );
}
