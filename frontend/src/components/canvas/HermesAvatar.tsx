import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type HermesAvatarState = "idle" | "processing";

interface HermesAvatarProps {
  aiState: HermesAvatarState;
  accentColor: string;
}

interface LadderSpec {
  radius: number;
  width: number;
  inclination: [number, number, number];
  speed: number;
}

const ladders: LadderSpec[] = Array.from({ length: 9 }, (_, index) => ({
  radius: 1.2 + index * 0.125,
  width: 0.032 + (index % 3) * 0.009,
  inclination: [
    0.24 + (index % 3) * 0.41,
    0.18 + index * 0.47,
    0.12 + (index % 4) * 0.31,
  ],
  speed: 0.035 + (index % 4) * 0.012,
}));

const shellRadii = [1, 1.5, 2];
const arcRadii = [0.7, 1.2, 1.7, 2.15];
const particleCount = 4000;
const hologramWhite = new THREE.Color("#fff4ce");

function getArcSpec(index: number) {
  const radius = arcRadii[index % arcRadii.length];
  const width = 0.012 + (index % 4) * 0.004;
  const arcLength = 0.42 + ((index * 17) % 100) / 100 * 2.05;
  const start = ((index * 2.399963) % (Math.PI * 2)) - arcLength / 2;
  const rotation: [number, number, number] = [
    (index * 0.47) % Math.PI,
    (index * 0.83) % (Math.PI * 2),
    (index * 0.31) % (Math.PI * 2),
  ];
  return { radius, width, arcLength, start, rotation };
}

function addSegment(target: number[], start: THREE.Vector3, end: THREE.Vector3) {
  target.push(start.x, start.y, start.z, end.x, end.y, end.z);
}

function geometryFromPositions(positions: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}

function createLadderGeometry(spec: LadderSpec, ringIndex: number) {
  const positions: number[] = [];
  const steps = 288;
  const inner = spec.radius - spec.width / 2;
  const outer = spec.radius + spec.width / 2;

  for (let step = 0; step < steps; step += 1) {
    const angleStart = (step / steps) * Math.PI * 2;
    const angleEnd = ((step + 1) / steps) * Math.PI * 2;
    const gap = (step + ringIndex * 17) % (42 + ringIndex % 3 * 6);

    if (gap > 5 || step % 42 < 30) {
      addSegment(
        positions,
        new THREE.Vector3(Math.cos(angleStart) * inner, Math.sin(angleStart) * inner, 0),
        new THREE.Vector3(Math.cos(angleEnd) * inner, Math.sin(angleEnd) * inner, 0),
      );
      addSegment(
        positions,
        new THREE.Vector3(Math.cos(angleStart) * outer, Math.sin(angleStart) * outer, 0),
        new THREE.Vector3(Math.cos(angleEnd) * outer, Math.sin(angleEnd) * outer, 0),
      );
    }

    if (step % 2 === 0 && gap > 3) {
      const tickOuter = step % 12 === 0 ? outer + spec.width * 0.5 : outer;
      addSegment(
        positions,
        new THREE.Vector3(Math.cos(angleStart) * inner, Math.sin(angleStart) * inner, 0),
        new THREE.Vector3(Math.cos(angleStart) * tickOuter, Math.sin(angleStart) * tickOuter, 0),
      );
    }
  }

  return geometryFromPositions(positions);
}

function createSphericalCircuitGeometry() {
  const positions: number[] = [];
  const segmentsPerArc = 96;
  const latitudeSteps = 12;
  const longitudeSteps = 20;

  for (const [shellIndex, radius] of shellRadii.entries()) {
    for (let latitudeIndex = 1; latitudeIndex < latitudeSteps; latitudeIndex += 1) {
      const latitude = -Math.PI / 2 + (latitudeIndex / latitudeSteps) * Math.PI;
      const latitudeRadius = Math.cos(latitude) * radius;
      const y = Math.sin(latitude) * radius;
      const phase = (latitudeIndex * 0.73 + shellIndex * 0.51) % (Math.PI * 2);

      for (let segment = 0; segment < segmentsPerArc; segment += 1) {
        if ((segment + latitudeIndex * 5 + shellIndex * 7) % 47 < 9) continue;
        const startAngle = (segment / segmentsPerArc) * Math.PI * 2;
        const endAngle = ((segment + 1) / segmentsPerArc) * Math.PI * 2;
        if (Math.sin(startAngle * 2 + phase) < -0.82) continue;

        addSegment(
          positions,
          new THREE.Vector3(
            Math.cos(startAngle) * latitudeRadius,
            y,
            Math.sin(startAngle) * latitudeRadius,
          ),
          new THREE.Vector3(
            Math.cos(endAngle) * latitudeRadius,
            y,
            Math.sin(endAngle) * latitudeRadius,
          ),
        );
      }
    }

    for (let longitudeIndex = 0; longitudeIndex < longitudeSteps; longitudeIndex += 1) {
      const longitude = (longitudeIndex / longitudeSteps) * Math.PI * 2;

      for (let segment = 0; segment < segmentsPerArc; segment += 1) {
        if ((segment + longitudeIndex * 11 + shellIndex * 3) % 58 < 16) continue;
        const startLatitude = -Math.PI / 2 + (segment / segmentsPerArc) * Math.PI;
        const endLatitude = -Math.PI / 2 + ((segment + 1) / segmentsPerArc) * Math.PI;

        addSegment(
          positions,
          new THREE.Vector3(
            Math.cos(longitude) * Math.cos(startLatitude) * radius,
            Math.sin(startLatitude) * radius,
            Math.sin(longitude) * Math.cos(startLatitude) * radius,
          ),
          new THREE.Vector3(
            Math.cos(longitude) * Math.cos(endLatitude) * radius,
            Math.sin(endLatitude) * radius,
            Math.sin(longitude) * Math.cos(endLatitude) * radius,
          ),
        );
      }
    }
  }

  for (let bridge = 0; bridge < 72; bridge += 1) {
    const y = 1 - (bridge / 71) * 2;
    const planar = Math.sqrt(1 - y * y);
    const angle = bridge * Math.PI * (3 - Math.sqrt(5));
    const direction = new THREE.Vector3(Math.cos(angle) * planar, y, Math.sin(angle) * planar);

    addSegment(positions, direction.clone().multiplyScalar(1), direction.clone().multiplyScalar(1.5));
    addSegment(positions, direction.clone().multiplyScalar(1.5), direction.clone().multiplyScalar(2));
  }

  return geometryFromPositions(positions);
}

function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function createHologramParticles() {
  const random = randomGenerator(20261025);
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const brightness = new Float32Array(particleCount);

  for (let index = 0; index < particleCount; index += 1) {
    const positionIndex = index * 3;
    const choice = random();

    if (choice < 0.52) {
      const ladderIndex = Math.floor(random() * ladders.length);
      const spec = ladders[ladderIndex];
      const angle = random() * Math.PI * 2;
      const radius = spec.radius + (random() - 0.5) * spec.width;
      const point = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
        .applyEuler(new THREE.Euler(...spec.inclination));
      positions[positionIndex] = point.x;
      positions[positionIndex + 1] = point.y;
      positions[positionIndex + 2] = point.z;
    } else if (choice < 0.84) {
      const arc = getArcSpec(Math.floor(random() * 32));
      const angle = arc.start + random() * arc.arcLength;
      const radius = arc.radius + (random() - 0.5) * arc.width * 2;
      const point = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
        .applyEuler(new THREE.Euler(...arc.rotation));
      positions[positionIndex] = point.x;
      positions[positionIndex + 1] = point.y;
      positions[positionIndex + 2] = point.z;
    } else {
      const radius = shellRadii[Math.floor(random() * shellRadii.length)];
      if (random() < 0.5) {
        const latitude = (random() - 0.5) * Math.PI * 0.86;
        const angle = random() * Math.PI * 2;
        positions[positionIndex] = Math.cos(angle) * Math.cos(latitude) * radius;
        positions[positionIndex + 1] = Math.sin(latitude) * radius;
        positions[positionIndex + 2] = Math.sin(angle) * Math.cos(latitude) * radius;
      } else {
        const longitude = random() * Math.PI * 2;
        const latitude = (random() - 0.5) * Math.PI;
        positions[positionIndex] = Math.cos(longitude) * Math.cos(latitude) * radius;
        positions[positionIndex + 1] = Math.sin(latitude) * radius;
        positions[positionIndex + 2] = Math.sin(longitude) * Math.cos(latitude) * radius;
      }
    }

    sizes[index] = 0.8 + random() * 1.7;
    brightness[index] = 0.35 + random() * 0.65;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightness, 1));
  return geometry;
}

function createParticleMaterial(accentColor: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uAccent: { value: new THREE.Color(accentColor) },
      uHighlight: { value: new THREE.Color(accentColor).lerp(new THREE.Color("#fff4ce"), 0.62) },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aBrightness;
      varying float vBrightness;
      varying vec3 vAccent;
      varying vec3 vHighlight;
      uniform vec3 uAccent;
      uniform vec3 uHighlight;

      void main() {
        vBrightness = aBrightness;
        vAccent = uAccent;
        vHighlight = uHighlight;
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * viewPosition;
        gl_PointSize = aSize * (0.8 + aBrightness * 0.55);
      }
    `,
    fragmentShader: `
      varying float vBrightness;
      varying vec3 vAccent;
      varying vec3 vHighlight;

      void main() {
        float distanceFromCenter = length(gl_PointCoord - vec2(0.5));
        float glow = exp(-distanceFromCenter * 12.0);
        float core = 1.0 - smoothstep(0.03, 0.2, distanceFromCenter);
        vec3 color = mix(vAccent, vHighlight, core + vBrightness * 0.18);
        gl_FragColor = vec4(color, glow * (0.42 + vBrightness * 0.5));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

interface ColorMaterial extends THREE.Material {
  color: THREE.Color;
}

function isColorMaterial(material: THREE.Material): material is ColorMaterial {
  return "color" in material;
}

interface SegmentedArcProps {
  index: number;
  color: string;
  registerMaterial: (index: number, material: THREE.Material | null) => void;
}

interface LadderTrackProps {
  index: number;
  spec: LadderSpec;
  color: string;
  registerMaterial: (index: number, material: THREE.Material | null) => void;
  setGroup: (index: number, group: THREE.Group | null) => void;
}

function LadderTrack({ index, spec, color, registerMaterial, setGroup }: LadderTrackProps) {
  const geometry = useMemo(() => createLadderGeometry(spec, index), [index, spec]);
  const materialIndex = index < 3 ? index + 6 : index < 6 ? index + 3 : index;

  return (
    <group
      ref={(group) => {
        setGroup(index, group);
      }}
      rotation={spec.inclination}
    >
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={(material) => registerMaterial(materialIndex, material)}
          color={color}
          transparent
          opacity={0.78}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

function SegmentedArc({ index, color, registerMaterial }: SegmentedArcProps) {
  const { radius, width, arcLength, start, rotation } = getArcSpec(index);
  const geometry = useMemo(
    () => new THREE.RingGeometry(radius - width, radius + width, 96, 1, start, arcLength),
    [arcLength, radius, start, width],
  );
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry]);
  const materialIndex = 20 + index * 2;

  return (
    <group rotation={rotation}>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          ref={(material) => registerMaterial(materialIndex, material)}
          color={color}
          transparent
          opacity={0.52 + (index % 3) * 0.08}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={(material) => registerMaterial(materialIndex + 1, material)}
          color={color}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </group>
  );
}

export function HermesAvatar({ aiState, accentColor }: HermesAvatarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const middleRef = useRef<THREE.Group>(null);
  const outerRef = useRef<THREE.Group>(null);
  const ladderRefs = useRef<Array<THREE.Group | null>>([]);
  const gyroRef = useRef<THREE.Group>(null);
  const circuitRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const materialRefs = useRef<THREE.Material[]>([]);
  const pointer = useRef({ x: 0, y: 0, speed: 0 });
  const easedPointerSpeed = useRef(0);
  const previousPointer = useRef({ x: 0, y: 0, time: 0 });
  const accent = useRef(new THREE.Color(accentColor));
  const targetAccent = useRef(new THREE.Color(accentColor));
  const particleMaterial = useMemo(() => createParticleMaterial(accentColor), []);
  const circuitGeometry = useMemo(createSphericalCircuitGeometry, []);
  const particleGeometry = useMemo(createHologramParticles, []);
  const highlight = useMemo(() => new THREE.Color(hologramWhite), []);
  const processing = aiState === "processing";

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      const now = performance.now();
      const elapsed = Math.max((now - previousPointer.current.time) / 1000, 0.001);
      const distance = Math.hypot(x - previousPointer.current.x, y - previousPointer.current.y);

      pointer.current.x = x;
      pointer.current.y = y;
      pointer.current.speed = Math.min(distance / elapsed, 8);
      previousPointer.current = { x, y, time: now };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    targetAccent.current.set(accentColor);
  }, [accentColor]);

  const registerMaterial = (index: number, material: THREE.Material | null) => {
    if (material) materialRefs.current[index] = material;
  };

  useFrame((_, delta) => {
    const mouse = pointer.current;
    const blend = 1 - Math.exp(-delta * 2.4);
    accent.current.lerp(targetAccent.current, blend);
    easedPointerSpeed.current = THREE.MathUtils.damp(
      easedPointerSpeed.current,
      mouse.speed,
      5,
      delta,
    );

    if (rootRef.current) {
      rootRef.current.rotation.y = THREE.MathUtils.damp(
        rootRef.current.rotation.y,
        mouse.x * 0.55,
        8,
        delta,
      );
      rootRef.current.rotation.x = THREE.MathUtils.damp(
        rootRef.current.rotation.x,
        -mouse.y * 0.45,
        8,
        delta,
      );
    }

    const cursorBoost = THREE.MathUtils.clamp(easedPointerSpeed.current * 0.28, 0, 1.8);
    const processingBoost = processing ? 2.1 : 0;
    const rotationBoost = 1 + cursorBoost + processingBoost;
    const time = performance.now() / 1000;

    const layers = [
      { ref: innerRef.current, multiplier: 0.42, parallax: 0.055, speed: 0.28 },
      { ref: middleRef.current, multiplier: 0.82, parallax: 0.12, speed: 0.16 },
      { ref: outerRef.current, multiplier: 1.18, parallax: 0.2, speed: 0.1 },
    ];

    for (const layer of layers) {
      const group = layer.ref;
      if (!group) continue;
      group.rotation.x = THREE.MathUtils.damp(
        group.rotation.x,
        -mouse.y * 0.45 * layer.multiplier,
        8,
        delta,
      );
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        mouse.x * 0.55 * layer.multiplier + Math.sin(time * layer.speed) * 0.025,
        8,
        delta,
      );
      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        mouse.x * layer.parallax,
        8,
        delta,
      );
      group.position.y = THREE.MathUtils.damp(
        group.position.y,
        -mouse.y * layer.parallax,
        8,
        delta,
      );
    }

    ladderRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const speed = ladders[index].speed * rotationBoost;
      ring.rotation.z += delta * speed;
      ring.rotation.x += delta * speed * (index % 2 === 0 ? 0.22 : -0.18);
    });

    if (gyroRef.current) {
      gyroRef.current.rotation.x += delta * (0.9 + cursorBoost + processingBoost);
      gyroRef.current.rotation.y += delta * (0.58 + cursorBoost * 0.65 + processingBoost);
      gyroRef.current.rotation.z += delta * (0.34 + cursorBoost * 0.4);
    }

    if (circuitRef.current) {
      circuitRef.current.rotation.y += delta * (0.018 + cursorBoost * 0.04);
    }

    if (lightRef.current) {
      lightRef.current.color.lerp(accent.current, blend);
      lightRef.current.intensity = THREE.MathUtils.damp(
        lightRef.current.intensity,
        1.5 + cursorBoost * 0.9 + (processing ? 1.2 : 0),
        5,
        delta,
      );
    }

    highlight.copy(accent.current).lerp(hologramWhite, 0.58);
    materialRefs.current.forEach((material, index) => {
      if (!isColorMaterial(material)) return;
      const isHighlight = index % 2 === 1 && index >= 20;
      material.color.lerp(isHighlight ? highlight : accent.current, blend);
      const baseOpacity =
        index < 9 ? 0.78 : index === 9 ? 0.86 : index === 10 ? 0.68 : index < 14 ? 0.92 : isHighlight ? 0.9 : 0.62;
      material.opacity = THREE.MathUtils.damp(
        material.opacity,
        baseOpacity + cursorBoost * 0.08 + (processing ? 0.12 : 0),
        5,
        delta,
      );
    });

    const uniforms = particleMaterial.uniforms;
    uniforms.uAccent.value.lerp(accent.current, blend);
    uniforms.uHighlight.value.lerp(highlight, blend);
  });

  return (
    <group ref={rootRef} position={[0, 0.18, 0]}>
      <pointLight ref={lightRef} color={accentColor} intensity={1.5} distance={5.5} />

      <group ref={outerRef}>
        {ladders.map((spec, index) =>
          index >= 6 ? (
            <LadderTrack
              key={`outer-ladder-${index}`}
              index={index}
              spec={spec}
              color={accentColor}
              registerMaterial={registerMaterial}
              setGroup={(ringIndex, group) => {
                ladderRefs.current[ringIndex] = group;
              }}
            />
          ) : null,
        )}
        <mesh rotation={[0.32, 0.9, 0.52]}>
          <torusGeometry args={[2.22, 0.004, 5, 260, Math.PI * 1.48]} />
          <meshBasicMaterial
            ref={(material) => registerMaterial(9, material)}
            color={accentColor}
            transparent
            opacity={0.86}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <group ref={middleRef}>
        {ladders.map((spec, index) =>
          index >= 3 && index < 6 ? (
            <LadderTrack
              key={`middle-ladder-${index}`}
              index={index}
              spec={spec}
              color={accentColor}
              registerMaterial={registerMaterial}
              setGroup={(ringIndex, group) => {
                ladderRefs.current[ringIndex] = group;
              }}
            />
          ) : null,
        )}
        <lineSegments geometry={circuitGeometry}>
          <lineBasicMaterial
            ref={(material) => registerMaterial(10, material)}
            color={accentColor}
            transparent
            opacity={0.68}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>

      <group ref={innerRef}>
        {ladders.map((spec, index) =>
          index < 3 ? (
            <LadderTrack
              key={`inner-ladder-${index}`}
              index={index}
              spec={spec}
              color={accentColor}
              registerMaterial={registerMaterial}
              setGroup={(ringIndex, group) => {
                ladderRefs.current[ringIndex] = group;
              }}
            />
          ) : null,
        )}

        <group ref={gyroRef}>
          {[0.23, 0.35, 0.47].map((radius, index) => (
            <mesh
              key={`gyro-${index}`}
              rotation={[
                index * 0.86 + 0.3,
                index * 0.62 + 0.2,
                index * 0.38,
              ]}
            >
              <torusGeometry args={[radius, 0.012, 8, 160]} />
              <meshBasicMaterial
                ref={(material) => registerMaterial(11 + index, material)}
                color={accentColor}
                transparent
                opacity={0.92}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
          <pointLight color="#fff4ce" intensity={0.85} distance={2.5} />
        </group>
      </group>

      <group ref={circuitRef}>
        {Array.from({ length: 32 }, (_, index) => (
          <SegmentedArc
            key={`data-arc-${index}`}
            index={index}
            color={accentColor}
            registerMaterial={registerMaterial}
          />
        ))}
      </group>

      <points geometry={particleGeometry} material={particleMaterial} />
    </group>
  );
}
