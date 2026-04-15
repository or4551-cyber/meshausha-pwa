import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, WHITE, APP_NAME } from '../../constants';
import { heebo } from '../../components/fonts';

const CHECK_ITEMS = [
  'כניסה עם PIN',
  'ניהול ספקים ומוצרים',
  'ניהול מחירים',
  'מבט-על סניפים',
  'לוח שבועי',
  'מעקב זיכויים',
  'Gmail + חשבוניות',
  'תזכורות Push',
  'דשבורד אנליטי',
];

const CheckItem: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 12, mass: 0.4 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const x   = interpolate(spr, [0, 1], [30, 0]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      direction: 'rtl', fontFamily: heebo,
      opacity: op, transform: `translateX(${x}px)`,
      marginBottom: 8,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, color: WHITE, fontWeight: 900, flexShrink: 0,
      }}>✓</div>
      <span style={{ fontSize: 18, color: WHITE, fontWeight: 700 }}>{text}</span>
    </div>
  );
};

export const AdminOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleSpr = spring({ frame, fps, config: { damping: 14 } });
  const titleY   = interpolate(titleSpr, [0, 1], [30, 0]);
  const titleOp  = interpolate(titleSpr, [0, 1], [0, 1]);

  const globalOp = interpolate(
    frame,
    [0, 6, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(145deg, ${PRIMARY} 0%, #5a1a1a 100%)`,
      fontFamily: heebo, direction: 'rtl',
      opacity: globalOp, overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: -100, left: -100,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />

      {/* Left — checklist */}
      <div style={{
        position: 'absolute', right: 80, top: 80, bottom: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          marginBottom: 20, direction: 'rtl', fontFamily: heebo,
        }}>
          מה כיסינו היום 👇
        </div>
        {CHECK_ITEMS.map((item, i) => (
          <CheckItem key={i} text={item} delay={10 + i * 8} />
        ))}
      </div>

      {/* Right — closing message */}
      <div style={{
        position: 'absolute', left: 80, top: 0, bottom: 80, width: 440,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'flex-start',
      }}>
        <div style={{
          fontSize: 72, fontWeight: 900, color: WHITE,
          transform: `translateY(${titleY}px)`, opacity: titleOp,
          lineHeight: 1.1, fontFamily: heebo, direction: 'rtl',
        }}>
          {APP_NAME}
        </div>
        <div style={{
          marginTop: 18, fontSize: 24, color: 'rgba(255,255,255,0.8)',
          fontFamily: heebo, direction: 'rtl',
          transform: `translateY(${titleY}px)`, opacity: titleOp,
          lineHeight: 1.5,
        }}>
          כל הכלים שצריך לניהול{'\n'}שרשרת הסניפים שלך 💪
        </div>
        <div style={{
          marginTop: 40,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 40,
          padding: '12px 28px',
          fontSize: 18, fontWeight: 700, color: WHITE,
          fontFamily: heebo, direction: 'rtl',
          transform: `translateY(${titleY}px)`, opacity: titleOp,
        }}>
          meshaushaapp.netlify.app 🌐
        </div>
      </div>
    </AbsoluteFill>
  );
};
