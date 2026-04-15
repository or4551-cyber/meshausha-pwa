import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, SECONDARY, WHITE, DARK, ACCENT } from '../constants';
import { heebo } from './fonts';

type Props = {
  title: string;
  lines?: string[];
  icon?: string;
  color?: string;
  delay?: number;
  width?: number;
  accent?: string;
};

/**
 * Animated "app card" that mimics the Meshausha UI style.
 * Used to illustrate specific features in tutorial scenes.
 */
export const UICard: React.FC<Props> = ({
  title,
  lines = [],
  icon = '📋',
  color,
  delay = 20,
  width = 340,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, mass: 0.6 },
  });

  const scale     = interpolate(spr, [0, 1], [0.85, 1]);
  const opacity   = interpolate(spr, [0, 1], [0, 1]);
  const translateY = interpolate(spr, [0, 1], [30, 0]);

  const cardBg = color ?? WHITE;
  const bar    = accent ?? PRIMARY;

  return (
    <div
      style={{
        width,
        background: cardBg,
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(139,58,58,0.18)',
        fontFamily: heebo,
        direction: 'rtl',
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity,
        flexShrink: 0,
      }}
    >
      {/* Colored top bar */}
      <div style={{ height: 5, background: bar }} />
      <div style={{ padding: '18px 22px' }}>
        {/* Header row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
          <span
            style={{
              fontWeight: 900,
              fontSize: 20,
              color: DARK,
              lineHeight: 1.2,
            }}
          >
            {title}
          </span>
        </div>
        {/* Content lines */}
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: 15,
              color: DARK,
              opacity: 0.75,
              fontWeight: 400,
              marginBottom: 6,
              borderBottom: i < lines.length - 1 ? '1px solid rgba(0,0,0,0.07)' : 'none',
              paddingBottom: 6,
              lineHeight: 1.4,
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

/** A small stat badge for overview screens */
export const StatBadge: React.FC<{
  label: string;
  value: string;
  color?: string;
  delay?: number;
}> = ({ label, value, color, delay = 20 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  const scale   = interpolate(spr, [0, 1], [0.7, 1]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);

  const bg = color ?? PRIMARY;

  return (
    <div
      style={{
        background: bg,
        borderRadius: 20,
        padding: '16px 28px',
        fontFamily: heebo,
        direction: 'rtl',
        transform: `scale(${scale})`,
        opacity,
        textAlign: 'center',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      <div style={{ fontSize: 42, fontWeight: 900, color: WHITE, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
};
