import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, WHITE, SECONDARY, ACCENT } from '../constants';
import { heebo } from './fonts';

type Props = {
  number: number;
  title: string;
  color?: string;
};

/**
 * Animated chapter badge that slides in from the right (RTL).
 * Used at the top of every scene.
 */
export const ChapterBadge: React.FC<Props> = ({ number, title, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });

  const translateX = interpolate(spr, [0, 1], [120, 0]);
  const opacity    = interpolate(spr, [0, 1], [0, 1]);

  const bg = color ?? PRIMARY;

  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        right: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: heebo,
        direction: 'rtl',
        transform: `translateX(${translateX}px)`,
        opacity,
      }}
    >
      {/* Number circle */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: WHITE,
          fontWeight: 900,
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      {/* Title pill */}
      <div
        style={{
          background: bg,
          color: WHITE,
          borderRadius: 30,
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 8,
          paddingBottom: 8,
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: 0.5,
        }}
      >
        {title}
      </div>
    </div>
  );
};
