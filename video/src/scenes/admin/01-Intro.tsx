import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, SECONDARY, WHITE, DARK, APP_NAME, APP_SUB } from '../../constants';
import { heebo } from '../../components/fonts';

/**
 * Splash screen — admin tutorial intro
 */
export const AdminIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Logo spring
  const logoSpr = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const logoScale   = interpolate(logoSpr, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoSpr, [0, 1], [0, 1]);

  // Title appears a bit later
  const titleSpr = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 14, mass: 0.5 } });
  const titleY   = interpolate(titleSpr, [0, 1], [40, 0]);
  const titleOp  = interpolate(titleSpr, [0, 1], [0, 1]);

  // Sub badge
  const subSpr = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 14, mass: 0.5 } });
  const subY   = interpolate(subSpr, [0, 1], [30, 0]);
  const subOp  = interpolate(subSpr, [0, 1], [0, 1]);

  // Fade out
  const globalOp = interpolate(
    frame,
    [0, 6, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${PRIMARY} 0%, #5a1a1a 100%)`,
        fontFamily: heebo,
        direction: 'rtl',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0,
        opacity: globalOp,
      }}
    >
      {/* Background circles */}
      <div style={{
        position: 'absolute', top: -120, right: -120,
        width: 500, height: 500, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 350, height: 350, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />

      {/* Logo circle */}
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        background: 'rgba(255,255,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 32,
        transform: `scale(${logoScale})`,
        opacity: logoOpacity,
      }}>
        <span style={{ fontSize: 64 }}>🧾</span>
      </div>

      {/* App name */}
      <div style={{
        fontSize: 80, fontWeight: 900, color: WHITE,
        letterSpacing: 2,
        transform: `translateY(${titleY}px)`,
        opacity: titleOp,
        textAlign: 'center',
      }}>
        {APP_NAME}
      </div>

      {/* Sub */}
      <div style={{
        fontSize: 28, fontWeight: 400, color: 'rgba(255,255,255,0.8)',
        marginTop: 10,
        transform: `translateY(${subY}px)`,
        opacity: subOp,
        textAlign: 'center',
      }}>
        {APP_SUB}
      </div>

      {/* Label badge */}
      <div style={{
        marginTop: 48,
        background: 'rgba(255,255,255,0.18)',
        borderRadius: 40,
        paddingLeft: 32, paddingRight: 32,
        paddingTop: 12, paddingBottom: 12,
        fontSize: 22, fontWeight: 700, color: WHITE,
        transform: `translateY(${subY}px)`,
        opacity: subOp,
      }}>
        מדריך למנהל מערכת 👑
      </div>
    </AbsoluteFill>
  );
};
