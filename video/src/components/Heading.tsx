import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DARK, PRIMARY } from '../constants';
import { heebo } from './fonts';

type Props = {
  children: React.ReactNode;
  sub?: string;
  color?: string;
  delay?: number;       // delay in frames before animation starts
  fontSize?: number;
};

/**
 * Animated main heading — slides up + fades in.
 */
export const Heading: React.FC<Props> = ({
  children,
  sub,
  color,
  delay = 10,
  fontSize = 64,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjusted = Math.max(0, frame - delay);

  const spr = spring({
    frame: adjusted,
    fps,
    config: { damping: 16, mass: 0.5 },
  });

  const translateY = interpolate(spr, [0, 1], [40, 0]);
  const opacity    = interpolate(spr, [0, 1], [0, 1]);

  const subSpr = spring({
    frame: Math.max(0, frame - delay - 6),
    fps,
    config: { damping: 16, mass: 0.5 },
  });
  const subY   = interpolate(subSpr, [0, 1], [30, 0]);
  const subOp  = interpolate(subSpr, [0, 1], [0, 1]);

  return (
    <div style={{ fontFamily: heebo, direction: 'rtl' }}>
      <div
        style={{
          fontSize,
          fontWeight: 900,
          color: color ?? DARK,
          lineHeight: 1.15,
          transform: `translateY(${translateY}px)`,
          opacity,
        }}
      >
        {children}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 26,
            fontWeight: 400,
            color: PRIMARY,
            marginTop: 10,
            transform: `translateY(${subY}px)`,
            opacity: subOp,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
