import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { WHITE, APP_NAME } from '../../constants';
import { heebo } from '../../components/fonts';

const BRANCH_BLUE = '#2D5A8B';
const DARK_BLUE   = '#1a3a5a';

const CHECK_ITEMS = [
  'כניסה עם PIN הסניף',
  'בחירת ספק ומוצרים',
  'הוספה לסל והתאמת כמויות',
  'שליחת הזמנה בוואטסאפ',
  'אישור קבלת סחורה',
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
      marginBottom: 10,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%',
        background: 'rgba(255,255,255,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: WHITE, fontWeight: 900, flexShrink: 0,
      }}>✓</div>
      <span style={{ fontSize: 20, color: WHITE, fontWeight: 700 }}>{text}</span>
    </div>
  );
};

export const BranchOutro: React.FC = () => {
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
      background: `linear-gradient(145deg, ${BRANCH_BLUE} 0%, ${DARK_BLUE} 100%)`,
      fontFamily: heebo, direction: 'rtl',
      opacity: globalOp, overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: -80, left: -80,
        width: 400, height: 400, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />

      {/* Left — closing message */}
      <div style={{
        position: 'absolute', left: 80, top: 0, bottom: 80, width: 420,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 56, marginBottom: 16 }}>🏪</span>
        <div style={{
          fontSize: 68, fontWeight: 900, color: WHITE,
          transform: `translateY(${titleY}px)`, opacity: titleOp,
          lineHeight: 1.1,
        }}>
          {APP_NAME}
        </div>
        <div style={{
          marginTop: 16, fontSize: 22, color: 'rgba(255,255,255,0.8)',
          transform: `translateY(${titleY}px)`, opacity: titleOp,
          lineHeight: 1.5,
        }}>
          ניהול הזמנות חכם{'\n'}לסניף שלך 💪
        </div>
        <div style={{
          marginTop: 36,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 40,
          padding: '12px 28px',
          fontSize: 17, fontWeight: 700, color: WHITE,
          transform: `translateY(${titleY}px)`, opacity: titleOp,
          width: 'fit-content',
        }}>
          לשאלות — פנה למנהל המערכת
        </div>
      </div>

      {/* Right — checklist */}
      <div style={{
        position: 'absolute', right: 80, top: 80, bottom: 80,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
          marginBottom: 20,
        }}>
          מה למדנו היום 👇
        </div>
        {CHECK_ITEMS.map((item, i) => (
          <CheckItem key={i} text={item} delay={10 + i * 10} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
