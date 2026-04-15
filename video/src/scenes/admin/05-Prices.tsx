import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, ACCENT } from '../../constants';
import { heebo } from '../../components/fonts';

const PriceRow: React.FC<{
  name: string; old: string; newPrice: string; delay: number;
}> = ({ name, old, newPrice, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const y   = interpolate(spr, [0, 1], [20, 0]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', borderRadius: 12,
      background: WHITE, marginBottom: 8,
      fontFamily: heebo, direction: 'rtl',
      opacity: op, transform: `translateY(${y}px)`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: DARK }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 14, color: DARK, opacity: 0.4, textDecoration: 'line-through' }}>
          {old}
        </span>
        <span style={{ fontSize: 16, fontWeight: 900, color: PRIMARY }}>{newPrice}</span>
        <span style={{ fontSize: 11, background: '#edfff5', color: '#2D8B5A', borderRadius: 8, padding: '2px 8px', fontWeight: 700 }}>
          עודכן ✓
        </span>
      </div>
    </div>
  );
};

export const AdminPrices: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={4} title="ניהול מחירים" color={ACCENT} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 550,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} sub="עדכון מחירים בזמן אמת">
          ניהול מחירי מוצרים
        </Heading>

        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color={ACCENT}
            items={[
              { icon: '🔍', text: 'חיפוש מוצר לפי שם או ספק' },
              { icon: '✏️', text: 'עדכון מחיר — השינוי נשמר מיד' },
              { icon: '📊', text: 'השוואה מול מחיר חשבונית אחרונה' },
              { icon: '📈', text: 'מעקב מגמת מחיר לאורך זמן' },
            ]}
          />
        </div>
      </div>

      {/* Right side price list */}
      <div style={{
        position: 'absolute', left: 50, top: 130, bottom: 64, width: 460,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          background: SECONDARY, borderRadius: 20, padding: 20,
          boxShadow: '0 8px 24px rgba(139,58,58,0.12)',
        }}>
          <div style={{
            fontFamily: heebo, direction: 'rtl',
            fontWeight: 900, fontSize: 16, color: PRIMARY, marginBottom: 14,
          }}>
            📋 יבולי שדה תמרה — מחירון
          </div>
          <PriceRow name="עגבניות שרי ק״ג"  old="₪8.20"  newPrice="₪9.00"  delay={25} />
          <PriceRow name="מלפפון ק״ג"       old="₪5.50"  newPrice="₪6.00"  delay={33} />
          <PriceRow name="גמבה אדומה ק״ג"   old="₪12.00" newPrice="₪13.50" delay={41} />
          <PriceRow name="שמן זית 5L"       old="₪78.00" newPrice="₪82.00" delay={49} />
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
