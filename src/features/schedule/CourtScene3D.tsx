// Prototype: real WebGL court view (three.js via react-three-fiber).
// Loaded lazily so the 3D libraries never block the main schedule bundle.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { RoundSchedule } from "../../domain/models";
import { courtName } from "../../domain/models/courts";

export type ScenePlayer = { name: string; gender?: "M" | "F"; streak: number };

// Real badminton court dimensions in metres.
const WIDTH = 6.1,
  LENGTH = 13.4,
  HALF_W = WIDTH / 2,
  HALF_L = LENGTH / 2,
  GAP = 2.4;
const FLOOR = ["#93d0a7", "#eeaabb"],
  TEAM = ["#3d6497", "#d0663f"];

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function CourtLine({
  x,
  z,
  w,
  d,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
}) {
  return (
    <mesh position={[x, 0.012, z]} receiveShadow>
      <boxGeometry args={[w, 0.004, d]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}

function useNetTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "rgba(41,56,77,0.9)";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 8);
    return texture;
  }, []);
}

function Court({ x, index }: { x: number; index: number }) {
  const net = useNetTexture();
  const lines: Array<[number, number, number, number]> = [
    // Side lines (doubles + singles), base lines, service lines, centre lines.
    [-HALF_W, 0, 0.06, LENGTH],
    [HALF_W, 0, 0.06, LENGTH],
    [-2.59, 0, 0.05, LENGTH],
    [2.59, 0, 0.05, LENGTH],
    [0, -HALF_L, WIDTH, 0.06],
    [0, HALF_L, WIDTH, 0.06],
    [0, -5.94, WIDTH, 0.05],
    [0, 5.94, WIDTH, 0.05],
    [0, -1.98, WIDTH, 0.05],
    [0, 1.98, WIDTH, 0.05],
    [0, -(1.98 + HALF_L) / 2, 0.05, HALF_L - 1.98],
    [0, (1.98 + HALF_L) / 2, 0.05, HALF_L - 1.98],
  ];
  return (
    <group position={[x, 0, 0]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.005} receiveShadow>
        <planeGeometry args={[WIDTH + 0.8, LENGTH + 0.8]} />
        <meshStandardMaterial color={FLOOR[index]} roughness={0.85} />
      </mesh>
      {lines.map(([lx, lz, w, d], i) => (
        <CourtLine key={i} x={lx} z={lz} w={w} d={d} />
      ))}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (HALF_W + 0.08), 0.775, 0]}
          castShadow
        >
          <cylinderGeometry args={[0.035, 0.05, 1.55, 12]} />
          <meshStandardMaterial color="#52616e" metalness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.17, 0]}>
        <planeGeometry args={[WIDTH, 0.76]} />
        <meshStandardMaterial
          map={net}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[WIDTH, 0.07, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

type Vec3 = [number, number, number];
function Player({
  id,
  position,
  facing,
  color,
  picked,
  animate,
  objects,
  onPick,
}: {
  id: string;
  position: Vec3;
  facing: number;
  color: string;
  picked: boolean;
  animate: boolean;
  objects: React.RefObject<Map<string, THREE.Object3D>>;
  onPick?: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null),
    ring = useRef<THREE.Mesh>(null),
    target = useMemo(() => new THREE.Vector3(...position), [position]);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    objects.current.set(id, group);
    return () => {
      objects.current.delete(id);
    };
  }, [id, objects]);
  // Glide to the new spot after a swap instead of teleporting.
  useFrame(({ clock, invalidate }, delta) => {
    const group = ref.current;
    if (!group) return;
    if (!animate) group.position.copy(target);
    else if (group.position.distanceToSquared(target) > 1e-4) {
      group.position.lerp(target, 1 - Math.exp(-delta * 6));
      invalidate();
    }
    group.rotation.y = facing;
    if (ring.current)
      ring.current.scale.setScalar(
        animate ? 1 + Math.sin(clock.elapsedTime * 5) * 0.08 : 1,
      );
  });
  return (
    <group
      ref={ref}
      position={position}
      rotation-y={facing}
      onClick={
        onPick &&
        ((event) => {
          // Ignore the click that ends an orbit drag.
          if (event.delta > 6) return;
          event.stopPropagation();
          onPick(id);
        })
      }
      onPointerOver={onPick && (() => (document.body.style.cursor = "pointer"))}
      onPointerOut={onPick && (() => (document.body.style.cursor = ""))}
    >
      {picked && (
        <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.03}>
          <ringGeometry args={[0.42, 0.56, 40]} />
          <meshBasicMaterial color="#ffb020" />
        </mesh>
      )}
      <mesh position-y={0.68} castShadow>
        <capsuleGeometry args={[0.24, 0.72, 6, 16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position-y={1.42} castShadow>
        <sphereGeometry args={[0.19, 24, 16]} />
        <meshStandardMaterial color="#f1c7a3" roughness={0.7} />
      </mesh>
      {/* Racket held out in front, slightly raised. */}
      <mesh position={[0.32, 1.25, 0.18]} rotation={[0.4, 0, -0.5]} castShadow>
        <torusGeometry args={[0.13, 0.015, 8, 24]} />
        <meshStandardMaterial color="#29384d" />
      </mesh>
    </group>
  );
}

// A shuttle rallying in an arc between one far-side and one near-side player.
function Shuttle({ x, offset }: { x: number; offset: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.55 + offset,
      leg = Math.floor(t),
      p = t - leg,
      forward = leg % 2 === 0,
      fromX = x + (leg % 4 < 2 ? -1.4 : 1.4),
      toX = x + (leg % 4 < 2 ? 1.4 : -1.4),
      fromZ = forward ? -3.3 : 3.3;
    ref.current.position.set(
      fromX + (toX - fromX) * p,
      2.1 + Math.sin(p * Math.PI) * 2.6,
      fromZ + (-fromZ - fromZ) * p,
    );
    ref.current.rotation.x = forward ? -Math.PI / 2 : Math.PI / 2;
  });
  return (
    <group ref={ref} position={[x, 2.4, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.05, 12, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position-y={-0.09} rotation-x={Math.PI}>
        <coneGeometry args={[0.08, 0.14, 12, 1, true]} />
        <meshStandardMaterial color="#f5f9ff" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

type Label = {
  key: string;
  at: Vec3;
  className: string;
  content: ReactNode;
  // Player labels track the (animated) player object instead of a fixed point.
  follow?: string;
};
// Projects 3D anchor points to screen space and moves plain DOM labels there.
// Plain DOM keeps Thai text crisp and avoids per-label React roots.
function LabelProjector({
  labels,
  elements,
  objects,
}: {
  labels: Label[];
  elements: React.RefObject<Map<string, HTMLElement>>;
  objects: React.RefObject<Map<string, THREE.Object3D>>;
}) {
  const point = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    for (const label of labels) {
      const el = elements.current.get(label.key);
      if (!el) continue;
      const object = label.follow && objects.current.get(label.follow);
      if (object) point.set(object.position.x, label.at[1], object.position.z);
      else point.set(...label.at);
      point.project(camera);
      const x = ((point.x + 1) / 2) * size.width,
        y = ((1 - point.y) / 2) * size.height;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.visibility = point.z > 1 ? "hidden" : "visible";
      el.style.zIndex = String(Math.round((1 - point.z) * 10000));
    }
  });
  return null;
}

function playerLabel(p: ScenePlayer) {
  return (
    <>
      <strong>{p.name}</strong>
      <small>
        {p.gender === "F" ? "หญิง" : "ชาย"}
        {p.streak >= 2 ? ` · ติด ${p.streak}` : ""}
      </small>
    </>
  );
}

// Frames every court plus the rest area, pulling back on portrait screens.
function CameraRig({ span, centerX }: { span: number; centerX: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height,
      distance = Math.max(LENGTH * 2, (span * 1.7) / Math.min(aspect, 1.6));
    camera.position.set(centerX, distance * 0.82, distance * 0.62);
    camera.lookAt(centerX, 0, 0);
  }, [camera, size, span, centerX]);
  return null;
}

export default function CourtScene3D({
  round,
  courtCount,
  courtNames,
  player,
  picked,
  onPick,
  disabled,
}: {
  round: RoundSchedule;
  courtCount: number;
  courtNames?: string[];
  player: (id: string) => ScenePlayer;
  // When onPick is set the scene is editable: tap two players to swap them.
  picked?: string;
  onPick?: (id: string) => void;
  disabled?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [supported] = useState(hasWebGL);
  const elements = useRef(new Map<string, HTMLElement>()),
    objects = useRef(new Map<string, THREE.Object3D>());
  const pick = onPick && !disabled ? onPick : undefined;
  if (!supported)
    return (
      <p className="scene-fallback" role="status">
        อุปกรณ์นี้ไม่รองรับมุมมอง 3D แบบ WebGL กรุณาใช้มุมมองปกติ
      </p>
    );
  const courtX = (court: number) =>
    courtCount === 1 ? 0 : (court === 1 ? -1 : 1) * (HALF_W + GAP / 2);
  const restX = courtX(courtCount) + HALF_W + 2.2,
    resting = round.restingPlayerIds.length > 0,
    left = courtX(1) - HALF_W,
    right = resting ? restX + 1.4 : courtX(courtCount) + HALF_W,
    span = right - left + 3,
    centerX = (left + right) / 2;
  const restPosition = (i: number): [number, number, number] => [
    restX,
    0,
    -3.6 + i * 2.2,
  ];
  const playerPosition = (
    x: number,
    side: number,
    i: number,
  ): [number, number, number] => [
    x + (i === 0 ? -1.45 : 1.45),
    0,
    side === 0 ? -3.3 - i * 0.4 : 3.3 + i * 0.4,
  ];
  const placements = [
    ...round.matches.flatMap((m) =>
      [m.teamA, m.teamB].flatMap((team, side) =>
        team.playerIds.map((id, i) => ({
          id,
          position: playerPosition(courtX(m.court), side, i),
          color: TEAM[side],
          facing: side === 0 ? 0 : Math.PI,
        })),
      ),
    ),
    ...round.restingPlayerIds.map((id, i) => ({
      id,
      position: restPosition(i),
      color: "#8aa0bf",
      facing: -Math.PI / 2,
    })),
  ];
  const playerLabelFor = (id: string, [px, , pz]: Vec3): Label => ({
    key: id,
    at: [px, 2.05, pz],
    follow: id,
    className: `scene-player-label${picked === id ? " picked" : ""}`,
    content: playerLabel(player(id)),
  });
  const labels: Label[] = [
    ...round.matches.flatMap((m) => {
      const x = courtX(m.court);
      return [
        {
          key: `court-${m.court}`,
          at: [x, 0.05, HALF_L + 1] as [number, number, number],
          className: `scene-court-label court-label-${m.court}`,
          content: courtName(courtNames, m.court),
        },
        ...[m.teamA, m.teamB].flatMap((team, side) =>
          team.playerIds.map((id, i) =>
            playerLabelFor(id, playerPosition(x, side, i)),
          ),
        ),
      ];
    }),
    ...(resting
      ? [
          {
            key: "rest",
            at: [restX, 0.05, -7] as [number, number, number],
            className: "scene-court-label court-label-rest",
            content: "พัก",
          },
        ]
      : []),
    ...round.restingPlayerIds.map((id, i) =>
      playerLabelFor(id, restPosition(i)),
    ),
  ];
  const summary = round.matches
    .map(
      (m) =>
        `${courtName(courtNames, m.court)}: ${m.teamA.playerIds.map((id) => player(id).name).join(" + ")} พบ ${m.teamB.playerIds.map((id) => player(id).name).join(" + ")}`,
    )
    .join(" · ");
  return (
    <div
      className={`court-scene${pick ? " interactive" : ""}`}
      role={onPick ? "group" : "img"}
      aria-label={`สนามจำลอง 3D รอบ ${round.roundNumber} · ${summary} · พัก: ${round.restingPlayerIds.map((id) => player(id).name).join(", ") || "ไม่มี"}`}
    >
      <Canvas
        shadows
        dpr={[1, 2]}
        frameloop={reducedMotion ? "demand" : "always"}
        camera={{ fov: 38, near: 0.5, far: 200 }}
      >
        <color attach="background" args={["#eef4fc"]} />
        <fog attach="fog" args={["#eef4fc", 45, 90]} />
        <hemisphereLight args={["#ffffff", "#c9d6ea", 0.9]} />
        <directionalLight
          position={[8, 16, 10]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <meshStandardMaterial color="#e8eef7" roughness={1} />
        </mesh>
        {round.matches.map((m) => {
          const x = courtX(m.court);
          return (
            <group key={m.court}>
              <Court x={x} index={m.court - 1} />
              {!reducedMotion && <Shuttle x={x} offset={m.court * 0.5} />}
            </group>
          );
        })}
        {round.restingPlayerIds.length > 0 && (
          <group>
            <mesh
              position={[
                restX + 0.9,
                0.22,
                -4.6 + round.restingPlayerIds.length * 1.1,
              ]}
              castShadow
              receiveShadow
            >
              <boxGeometry
                args={[0.5, 0.44, round.restingPlayerIds.length * 2.2 + 0.8]}
              />
              <meshStandardMaterial color="#b9c8de" />
            </mesh>
          </group>
        )}
        {/* One flat list keyed by player so a swap moves the same figure. */}
        {placements.map((p) => (
          <Player
            key={p.id}
            {...p}
            picked={picked === p.id}
            animate={!reducedMotion}
            objects={objects}
            onPick={pick}
          />
        ))}
        <CameraRig span={span} centerX={centerX} />
        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={60}
          minPolarAngle={0.15}
          maxPolarAngle={1.35}
          target={[centerX, 0, 0]}
        />
        <LabelProjector labels={labels} elements={elements} objects={objects} />
      </Canvas>
      <div className="scene-labels" aria-hidden={onPick ? undefined : true}>
        {labels.map((label) => {
          const register = (el: HTMLElement | null) => {
            if (el) elements.current.set(label.key, el);
            else elements.current.delete(label.key);
          };
          // In edit mode player names are real buttons (keyboard + screen reader).
          return onPick && label.follow ? (
            <button
              key={label.key}
              ref={register}
              type="button"
              className={label.className}
              aria-label={`เลือก ${player(label.follow).name} เพื่อสลับ`}
              aria-pressed={picked === label.follow}
              disabled={disabled}
              onClick={() => onPick(label.follow!)}
            >
              {label.content}
            </button>
          ) : (
            <div key={label.key} ref={register} className={label.className}>
              {label.content}
            </div>
          );
        })}
      </div>
      <p className="scene-hint">
        {onPick
          ? "แตะผู้เล่นหรือป้ายชื่อสองคนเพื่อสลับ · ลากเพื่อหมุน"
          : "ลากเพื่อหมุน · ถ่างนิ้วหรือเลื่อนล้อเมาส์เพื่อซูม"}
      </p>
    </div>
  );
}
