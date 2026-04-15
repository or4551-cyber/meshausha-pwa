import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, SECONDARY, DARK } from '../constants';
import { heebo } from './fonts';

type SceneProps = {
  children: React.ReactNode;
  bg?: string;
  dark?: boolean;
};

/**
 * Base wrapper for every scene — fade-in on entry, fade-out on exit,
 * applies RTL + Heebo font to the entire scene.
 */
export const Scene: React.FC<SceneProps> = ({ children, bg, dark }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const background = bg ?? (dark ? DARK : SECONDARY);

  return (
    <AbsoluteFill
      style={{
        background,
        fontFamily: heebo,
        direction: 'rtl',
        opacity,
        overflow: 'hidden',
      }}
    >
      {/* Subtle top stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          background: PRIMARY,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};
