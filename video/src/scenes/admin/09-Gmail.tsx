import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK } from '../../constants';
import { heebo } from '../../components/fonts';

const GMAIL_RED = '#EA4335';
const FLOW_COLOR = '#4285F4';

const FlowStep: React.FC<{
  icon: string; text: string; delay: number; isLast?: boolean;
}> = ({ icon, text, delay, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const y   = interpolate(spr, [0, 1], [20, 0]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: op, transform: `translateY(${y}px)` }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: FLOW_COLOR, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 28,
        boxShadow: '0 4px 12px rgba(66,133,244,0.3)',
      }}>
        {icon}
      </div>
      <div style={{
        marginTop: 8, fontFamily: heebo, direction: 'rtl', textAlign: 'center',
        fontSize: 13, fontWeight: 700, color: DARK, maxWidth: 90,
      }}>
        {text}
      </div>
      {!isLast && (
        <div style={{ marginTop: 6, fontSize: 20, color: FLOW_COLOR, fontWeight: 900 }}>↓</div>
      )}
    </div>
  );
};

export const AdminGmail: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={8} title="Gmail + חשבוניות" color={GMAIL_RED} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 510,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={48} sub="חשבוניות מהמייל — אוטומטית">
          אינטגרציית Gmail
        </Heading>

        <div style={{ marginTop: 26 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color={GMAIL_RED}
            items={[
              { icon: '🔗', text: 'חיבור חשבון Google — פעם אחת בלבד' },
              { icon: '📩', text: 'המערכת מושכת חשבוניות מהמייל אוטומטית' },
              { icon: '🔍', text: 'ניתוח פריטים ומחירים — השוואה מיידית' },
              { icon: '⚠️', text: 'התראה על הפרשי מחיר מול המוסכם' },
              { icon: '📊', text: 'מגמות מחיר לכל מוצר לאורך זמן' },
            ]}
          />
        </div>
      </div>

      {/* Flow diagram */}
      <div style={{
        position: 'absolute', left: 60, top: 120, bottom: 64, width: 400,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0,
      }}>
        <div style={{
          background: WHITE, borderRadius: 24, padding: '24px 30px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        }}>
          <FlowStep icon="📧" text="ספק שולח חשבונית למייל" delay={24} />
          <FlowStep icon="🤖" text="Gmail API מזהה את המייל" delay={32} />
          <FlowStep icon="📋" text="פרסור אוטומטי של פריטים" delay={40} />
          <FlowStep icon="💡" text="השוואה למחירים במערכת" delay={48} />
          <FlowStep icon="✅" text="דוח הפרשים מוכן" delay={56} isLast />
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
