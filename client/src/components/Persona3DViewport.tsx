import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";
import { usePersonaSceneBridge } from "@/hooks/usePersonaSceneBridge";
import { cn } from "@/lib/utils";

interface Persona3DViewportProps {
  className?: string;
}

const PERSONA_COLORS: Record<string, { base: string; accent: string; aura: string }> = {
  "universal-scholar": { base: "#2563eb", accent: "#38bdf8", aura: "#dbeafe" },
  "christian-priest": { base: "#3730a3", accent: "#818cf8", aura: "#e0e7ff" },
  "islamic-mufti": { base: "#047857", accent: "#34d399", aura: "#d1fae5" },
  "hadith-scholar": { base: "#b45309", accent: "#fbbf24", aura: "#fef3c7" },
  "jewish-rabbi": { base: "#4338ca", accent: "#a855f7", aura: "#ede9fe" },
  "hindu-guru": { base: "#c2410c", accent: "#f97316", aura: "#ffedd5" },
  "buddhist-monk": { base: "#7c3aed", accent: "#c084fc", aura: "#f3e8ff" },
};

function usePersonaPalette(personaId: string | undefined, mood: string) {
  return useMemo(() => {
    const basePalette = PERSONA_COLORS[personaId ?? "universal-scholar"] ?? PERSONA_COLORS["universal-scholar"];

    if (mood === "celebratory") {
      return {
        base: basePalette.accent,
        accent: "#facc15",
        aura: "#fef08a",
      };
    }

    if (mood === "reflective") {
      return {
        base: basePalette.base,
        accent: basePalette.accent,
        aura: basePalette.aura,
      };
    }

    if (mood === "curious") {
      return {
        base: basePalette.base,
        accent: basePalette.accent,
        aura: "#e0f2fe",
      };
    }

    return basePalette;
  }, [personaId, mood]);
}

function PersonaOrb() {
  const { persona, personaPose, energy, mood, transcript, activeVerse, voiceState } = usePersonaSceneBridge();
  const palette = usePersonaPalette(persona?.id, mood);

  const orbRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const sparkleRef = useRef<THREE.Points>(null);

  const sparkles = useMemo(() => {
    const count = 400;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (orbRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * (personaPose === "speaking" ? 5 : 2.5)) * 0.05;
      const energyScale = 0.85 + energy * 0.4;
      const scale = pulse * energyScale;
      orbRef.current.scale.setScalar(scale);
      orbRef.current.rotation.y += delta * 0.25;
    }

    if (haloRef.current) {
      const haloScale = 1.6 + energy * 0.6;
      haloRef.current.rotation.z += delta * 0.2;
      haloRef.current.scale.set(haloScale, haloScale, haloScale);
    }

    if (sparkleRef.current) {
      sparkleRef.current.rotation.y += delta * 0.1;
      sparkleRef.current.material.opacity = THREE.MathUtils.lerp(
        sparkleRef.current.material.opacity,
        voiceState === "speaking" ? 0.65 : 0.35,
        delta * 2
      );
    }
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh ref={orbRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshStandardMaterial
          color={palette.base}
          emissive={palette.accent}
          emissiveIntensity={0.45 + energy * 0.4}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.95, 64]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>

      <points ref={sparkleRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={sparkles.length / 3} array={sparkles} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={palette.accent} transparent opacity={0.35} depthWrite={false} />
      </points>

      <Html position={[0, -1.8, 0]} center className="pointer-events-none select-none text-xs text-slate-100">
        <div className="rounded-full bg-slate-900/60 px-3 py-1 backdrop-blur">
          {personaPose === "speaking" ? "Offering guidance" : voiceState === "listening" ? "Listening to you" : "In quiet reflection"}
        </div>
      </Html>

      {transcript && (
        <Html position={[0, 1.8, 0]} center className="pointer-events-auto select-text w-48">
          <div className="rounded-xl border border-white/30 bg-white/80 p-3 text-[11px] leading-snug text-slate-700 shadow-lg backdrop-blur">
            <p className="font-semibold text-slate-900">Live transcript</p>
            <p className="line-clamp-3">{transcript}</p>
          </div>
        </Html>
      )}

      {activeVerse && !transcript && (
        <Html position={[0, 1.8, 0]} center className="pointer-events-auto select-text w-48">
          <div className="rounded-xl border border-white/30 bg-white/80 p-3 text-[11px] leading-snug text-slate-700 shadow-lg backdrop-blur">
            <p className="font-semibold text-slate-900">Guiding Verse</p>
            <p className="text-slate-600">{activeVerse.book} {activeVerse.chapter}:{activeVerse.verse}</p>
            <p className="line-clamp-3">{activeVerse.text}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Persona3DViewport({ className }: Persona3DViewportProps) {
  const { persona, mood, activeVerse, transcript } = usePersonaSceneBridge();

  return (
    <motion.div
      className={cn(
        "relative h-56 w-full overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl",
        className
      )}
      initial={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        className="[&>canvas]:rounded-2xl"
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0f172a"]} />
        <ambientLight intensity={0.7} />
        <pointLight position={[3, 3, 2]} intensity={1.2} color="#f8fafc" />
        <pointLight position={[-3, -2, -2]} intensity={0.8} color="#38bdf8" />
        <Suspense fallback={null}>
          <PersonaOrb />
          <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3.5} maxPolarAngle={Math.PI / 1.9} />
        </Suspense>
      </Canvas>

      <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
        <motion.div
          className="rounded-xl border border-white/20 bg-white/75 p-3 text-xs text-slate-700 shadow-lg backdrop-blur"
          initial={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{persona?.name ?? "Universal Scholar"}</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Mood: {mood}</p>
            </div>
            {activeVerse && (
              <div className="hidden text-right text-[11px] text-slate-600 sm:block">
                <p className="font-semibold text-slate-700">{activeVerse.book}</p>
                <p>{activeVerse.chapter}:{activeVerse.verse}</p>
              </div>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-[11px] text-slate-600">
            {transcript
              ? transcript
              : activeVerse
                ? `Reflecting on ${activeVerse.book} ${activeVerse.chapter}:${activeVerse.verse}`
                : "Invite your guide to explore any sacred theme."}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

