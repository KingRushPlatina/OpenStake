"use client";

import { useMemo, type CSSProperties } from "react";

const sparkColors = ["#fff8cf", "#ffd166", "#ffa62b", "#ff6b35", "#ff3d00"];

/** Deterministic 0..1 noise so particles are stable across re-renders. */
function noise(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

type Spark = {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
};

type Puff = {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
};

type Debris = {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  spin: number;
};

export function MineExplosion() {
  const sparks = useMemo<Spark[]>(
    () =>
      Array.from({ length: 22 }, (_, index) => {
        const angle = (index / 22) * Math.PI * 2 + (noise(index + 1) - 0.5) * 0.9;
        const distance = 26 + noise(index + 2) * 48;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 1.5 + noise(index + 3) * 3.5,
          delay: noise(index + 4) * 90,
          duration: 420 + noise(index + 5) * 380,
          color: sparkColors[index % sparkColors.length],
        };
      }),
    [],
  );

  const puffs = useMemo<Puff[]>(
    () =>
      Array.from({ length: 9 }, (_, index) => {
        const angle = (index / 9) * Math.PI * 2 + noise(index + 11) * 0.7;
        const distance = 12 + noise(index + 12) * 30;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance - 18 - noise(index + 13) * 22,
          size: 14 + noise(index + 14) * 22,
          delay: 40 + noise(index + 15) * 170,
          duration: 720 + noise(index + 16) * 420,
          opacity: 0.32 + noise(index + 17) * 0.34,
        };
      }),
    [],
  );

  const debris = useMemo<Debris[]>(
    () =>
      Array.from({ length: 11 }, (_, index) => {
        const angle = (index / 11) * Math.PI * 2 + (noise(index + 21) - 0.5) * 0.8;
        const distance = 22 + noise(index + 22) * 44;
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          size: 3.5 + noise(index + 23) * 5.5,
          delay: 10 + noise(index + 24) * 70,
          duration: 520 + noise(index + 25) * 380,
          spin: (noise(index + 26) - 0.5) * 900,
        };
      }),
    [],
  );

  return (
    <span className="mines-blast" aria-hidden="true">
      <span className="mines-blast-glow" />
      <span className="mines-blast-ring" />
      <span className="mines-blast-ring mines-blast-ring-late" />
      {puffs.map((puff, index) => (
        <span
          key={`puff-${index}`}
          className="mines-smoke-puff"
          style={
            {
              "--dx": `${puff.dx}px`,
              "--dy": `${puff.dy}px`,
              "--size": `${puff.size}px`,
              "--delay": `${puff.delay}ms`,
              "--duration": `${puff.duration}ms`,
              "--puff-opacity": puff.opacity,
            } as CSSProperties
          }
        />
      ))}
      {debris.map((piece, index) => (
        <span
          key={`debris-${index}`}
          className="mines-debris"
          style={
            {
              "--dx": `${piece.dx}px`,
              "--dy": `${piece.dy}px`,
              "--size": `${piece.size}px`,
              "--delay": `${piece.delay}ms`,
              "--duration": `${piece.duration}ms`,
              "--spin": `${piece.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
      {sparks.map((spark, index) => (
        <span
          key={`spark-${index}`}
          className="mines-spark"
          style={
            {
              "--dx": `${spark.dx}px`,
              "--dy": `${spark.dy}px`,
              "--size": `${spark.size}px`,
              "--delay": `${spark.delay}ms`,
              "--duration": `${spark.duration}ms`,
              "--spark-color": spark.color,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
