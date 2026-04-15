import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { DARK, PRIMARY, SECONDARY } from '../constants';

type Props = {
  children?: React.ReactNode;
  delay?: number;
  screenBg?: string;
};

/**
 * Renders a simplified phone outline with a screen area.
 * Children are rendered inside the screen.
 */
export const PhoneFrame: React.FC<Props> = ({
  children,
  delay = 0,
  screenBg,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: { damping: 16, mass: 0.7 },
  });

  const scale     = interpolate(spr, [0, 1], [0.85, 1]);
  const opacity   = interpolate(spr, [0, 1], [0, 1]);
  const translateY = interpolate(spr, [0, 1], [40, 0]);

  const PHONE_W = 280;
  const PHONE_H = 560;
  const BORDER  = 12;

  return (
    <div
      style={{
        width: PHONE_W,
        height: PHONE_H,
        borderRadius: 44,
        background: DARK,
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        transform: `scale(${scale}) translateY(${translateY}px)`,
        opacity,
        flexShrink: 0,
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 14,
          background: DARK,
          borderRadius: 10,
          zIndex: 10,
        }}
      />
      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          top: BORDER,
          left: BORDER,
          right: BORDER,
          bottom: BORDER,
          borderRadius: 34,
          background: screenBg ?? SECONDARY,
          overflow: 'hidden',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            height: 36,
            background: PRIMARY,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 14,
            paddingLeft: 14,
            gap: 6,
          }}
        >
          <div style={{ width: 30, height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
          <div style={{ width: 12, height: 8, background: 'rgba(255,255,255,0.6)', borderRadius: 4 }} />
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {children}
        </div>
      </div>
      {/* Home button bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 4,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 4,
        }}
      />
    </div>
  );
};
