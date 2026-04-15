import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, SECONDARY, WHITE, APP_NAME, APP_SUB } from '../../constants';
import { heebo } from '../../components/fonts';

export const BranchIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoSpr = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const logoScale = interpolate(logoSpr, [0, 1], [0.5, 1]);
  const logoOp    = interpolate(logoSpr, [0, 1], [0, 1]);

  const titleSpr = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, mass: 0.5 } });
  const titleY   = interpolate(titleSpr, [0, 1], [40, 0]);
  const titleOp  = interpolate(titleSpr, [0, 1], [0, 1]);

  const subSpr = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 14, mass: 0.5 } });
  const subY   = interpolate(subSpr, [0, 1], [30, 0]);
  const subOp  = interpolate(subSpr, [0, 1], [0, 1]);

  const globalOp = interpolate(
    frame,
    [0, 6, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(145deg, #2D5A8B 0%, #1a3a5a 100%)`,
      fontFamily: heebo, direction: 'rtl',
      alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      opacity: globalOp,
    }}>
      {/* Background circles */}
      <div style={{
        position: 'absolute', bottom: -100, right: -100,
        width: 450, height: 450, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      {/* Logo */}
      <div style={{
        width: 130, height: 130, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
        transform: `scale(${logoScale})`, opacity: logoOp,
      }}>
        <span style={{ fontSize: 60 }}>🏪</span>
      </div>

      <div style={{
        fontSize: 78, fontWeight: 900, color: WHITE,
        transform: `translateY(${titleY}px)`, opacity: titleOp,
        textAlign: 'center',
      }}>
        {APP_NAME}
      </div>

      <div style={{
        fontSize: 26, fontWeight: 400, color: 'rgba(255,255,255,0.8)',
        marginTop: 10,
        transform: `translateY(${subY}px)`, opacity: subOp,
        textAlign: 'center',
      }}>
        {APP_SUB}
      </div>

      <div style={{
        marginTop: 44,
        background: 'rgba(255,255,255,0.18)',
        borderRadius: 40,
        paddingLeft: 32, paddingRight: 32,
        paddingTop: 12, paddingBottom: 12,
        fontSize: 22, fontWeight: 700, color: WHITE,
        transform: `translateY(${subY}px)`, opacity: subOp,
      }}>
        מדריך למנהל סניף 🏪
      </div>
    </AbsoluteFill>
  );
};
