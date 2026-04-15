import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, ACCENT } from '../../constants';
import { heebo } from '../../components/fonts';

const Step: React.FC<{
  num: number; title: string; desc: string; delay: number; active?: boolean;
}> = ({ num, title, desc, delay, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14, mass: 0.5 } });
  const x   = interpolate(spr, [0, 1], [50, 0]);
  const op  = interpolate(spr, [0, 1], [0, 1]);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20,
      direction: 'rtl', fontFamily: heebo,
      transform: `translateX(${x}px)`, opacity: op,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: active ? PRIMARY : SECONDARY,
        border: `3px solid ${PRIMARY}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 18,
        color: active ? WHITE : PRIMARY,
      }}>{num}</div>
      <div>
        <div style={{ fontWeight: 900, fontSize: 22, color: DARK }}>{title}</div>
        <div style={{ fontWeight: 400, fontSize: 16, color: DARK, opacity: 0.65, marginTop: 3 }}>{desc}</div>
      </div>
    </div>
  );
};

export const AdminAddSupplier: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={3} title="הוספת ספק חדש" color='#2D8B5A' />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 600,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} sub="אשף בן 3 שלבים">
          הוספת ספק למערכת
        </Heading>

        <div style={{ marginTop: 30 }}>
          <Step num={1} title="פרטי הספק"
            desc="שם, טלפון, מייל, איש קשר, כתובת"
            delay={22} active />
          <Step num={2} title="מוצרים ומחירים"
            desc="הוספה ידנית או ייבוא CSV עם כל הקטלוג"
            delay={34} />
          <Step num={3} title="לוח הזמנות"
            desc="אילו סניפים מזמינים ממנו ובאילו ימים"
            delay={46} />
        </div>

        <div style={{ marginTop: 24 }}>
          <BulletList
            startDelay={60}
            stagger={12}
            color={ACCENT}
            items={[
              { icon: '📥', text: 'ייבוא קטלוג מ-CSV תוך שניות' },
              { icon: '📆', text: 'הגדרת ימי הזמנה לכל סניף בנפרד' },
              { icon: '✅', text: 'הספק מופיע מיד בכל הסניפים הרלוונטיים' },
            ]}
          />
        </div>
      </div>

      {/* Visual: CSV import illustration */}
      <div style={{
        position: 'absolute', left: 60, top: 130, bottom: 60,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12,
      }}>
        {[
          ['שם מוצר', 'מחיר', 'יחידה'],
          ['עגבניות', '₪4.50', 'ק״ג'],
          ['מלפפון', '₪3.80', 'ק״ג'],
          ['גמבה', '₪6.20', 'ק״ג'],
          ['תפוח אדמה', '₪2.90', 'ק״ג'],
        ].map((row, ri) => {
          const frame = useCurrentFrame();
          const { fps } = useVideoConfig();
          const spr = spring({ frame: Math.max(0, frame - 55 - ri * 10), fps, config: { damping: 14 } });
          const op  = interpolate(spr, [0, 1], [0, 1]);
          const x   = interpolate(spr, [0, 1], [-30, 0]);
          return (
            <div key={ri} style={{
              display: 'flex', gap: 0, opacity: op, transform: `translateX(${x}px)`,
              fontFamily: heebo, direction: 'rtl',
            }}>
              {row.map((cell, ci) => (
                <div key={ci} style={{
                  width: ri === 0 ? [140, 80, 70][ci] : [140, 80, 70][ci],
                  padding: '8px 12px',
                  background: ri === 0 ? PRIMARY : (ri % 2 === 0 ? 'rgba(139,58,58,0.06)' : WHITE),
                  color: ri === 0 ? WHITE : DARK,
                  fontSize: ri === 0 ? 14 : 15,
                  fontWeight: ri === 0 ? 700 : 400,
                  borderBottom: '1px solid rgba(0,0,0,0.08)',
                  borderRight: ci < 2 ? '1px solid rgba(0,0,0,0.08)' : 'none',
                }}>{cell}</div>
              ))}
            </div>
          );
        })}
        <div style={{
          marginTop: 8, fontFamily: heebo, direction: 'rtl',
          fontSize: 14, color: PRIMARY, fontWeight: 700,
        }}>📂 קובץ CSV — ייבוא אוטומטי</div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
