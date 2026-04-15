import React from 'react';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { PhoneFrame } from '../../components/PhoneFrame';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK } from '../../constants';
import { heebo } from '../../components/fonts';

const BRANCH_BLUE = '#2D5A8B';

const PinScreen: React.FC = () => (
  <div style={{ padding: '10px 12px', fontFamily: heebo, direction: 'rtl' }}>
    <div style={{ fontSize: 11, fontWeight: 900, color: BRANCH_BLUE, marginBottom: 4, textAlign: 'center' }}>
      כניסה — עין המפרץ
    </div>
    <div style={{ fontSize: 9, color: DARK, opacity: 0.5, textAlign: 'center', marginBottom: 8 }}>
      הכנס PIN של הסניף שלך
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
      {['1', '2', '3', '4'].map((d, i) => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: 8,
          background: BRANCH_BLUE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: WHITE, fontSize: 16, fontWeight: 900,
        }}>{d}</div>
      ))}
    </div>
    {[[1,2,3],[4,5,6],[7,8,9],['','0','⌫']].map((row, ri) => (
      <div key={ri} style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
        {row.map((k, ki) => (
          <div key={ki} style={{
            width: 56, height: 36, borderRadius: 8,
            background: k === '' ? 'transparent' : SECONDARY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700, color: DARK,
            boxShadow: k === '' ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
          }}>{k}</div>
        ))}
      </div>
    ))}
  </div>
);

export const BranchLogin: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={1} title="כניסה למערכת" color={BRANCH_BLUE} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 560,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={15} fontSize={54} color={DARK}>
          כניסה עם PIN הסניף
        </Heading>
        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={25}
            stagger={14}
            color={BRANCH_BLUE}
            items={[
              { icon: '🔢', text: 'הכנס את ה-PIN של הסניף שלך (4 ספרות)' },
              { icon: '✅', text: 'לאחר כניסה תגיע ישירות ללוח הבקרה' },
              { icon: '🔄', text: 'הפעלה חוזרת — PIN שמור אוטומטית' },
              { icon: '📱', text: 'עובד על כל טלפון — אין צורך בהתקנה' },
            ]}
          />
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 80, top: 0, bottom: 52,
        display: 'flex', alignItems: 'center',
      }}>
        <PhoneFrame delay={8} screenBg={SECONDARY}>
          <PinScreen />
        </PhoneFrame>
      </div>

      <BottomBar label="מדריך מנהל סניף" />
    </Scene>
  );
};
