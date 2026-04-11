import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { PhoneFrame } from '../../components/PhoneFrame';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, SECONDARY, DARK, WHITE } from '../../constants';
import { heebo } from '../../components/fonts';

const PinScreen: React.FC = () => (
  <div style={{ padding: '10px 12px', fontFamily: heebo, direction: 'rtl' }}>
    <div style={{ fontSize: 12, fontWeight: 900, color: PRIMARY, marginBottom: 8, textAlign: 'center' }}>
      כניסה למשאוושה
    </div>
    {/* PIN display */}
    <div style={{
      display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12
    }}>
      {['●', '●', '●', '●'].map((d, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: 8,
          background: PRIMARY, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: WHITE, fontSize: 16, fontWeight: 900,
        }}>{d}</div>
      ))}
    </div>
    {/* Keypad */}
    {[[1,2,3],[4,5,6],[7,8,9],['','0','⌫']].map((row, ri) => (
      <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
        {row.map((k, ki) => (
          <div key={ki} style={{
            width: 56, height: 40, borderRadius: 10,
            background: k === '' ? 'transparent' : SECONDARY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: DARK,
            boxShadow: k === '' ? 'none' : '0 2px 4px rgba(0,0,0,0.12)',
          }}>{k}</div>
        ))}
      </div>
    ))}
    <div style={{ textAlign: 'center', marginTop: 6 }}>
      <div style={{
        background: PRIMARY, color: WHITE, borderRadius: 10,
        padding: '8px 0', fontSize: 12, fontWeight: 900,
      }}>כניסה ✓</div>
    </div>
  </div>
);

export const AdminLogin: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={1} title="כניסה למערכת" />

      {/* Left side — text */}
      <div style={{
        position: 'absolute', top: 110, right: 60, width: 580,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={15} fontSize={56}>
          כניסה עם PIN אישי
        </Heading>
        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={25}
            stagger={14}
            items={[
              { icon: '🔢', text: 'כל מנהל מערכת נכנס עם PIN של 4 ספרות' },
              { icon: '🏪', text: 'PIN 9999 — כניסת אדמין מלאה' },
              { icon: '🔐', text: 'כל סניף מקבל PIN ייחודי משלו' },
              { icon: '⚡', text: 'כניסה מהירה — ללא שם משתמש או סיסמה' },
            ]}
          />
        </div>
      </div>

      {/* Right side — phone mockup */}
      <div style={{
        position: 'absolute', left: 80, top: 0, bottom: 52,
        display: 'flex', alignItems: 'center',
      }}>
        <PhoneFrame delay={8}>
          <PinScreen />
        </PhoneFrame>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
