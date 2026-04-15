import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { PhoneFrame } from '../../components/PhoneFrame';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK } from '../../constants';
import { heebo } from '../../components/fonts';

const BRANCH_BLUE = '#2D5A8B';

const OrderScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const products = [
    { name: 'עגבניות שרי', price: '₪9.00', qty: 2 },
    { name: 'מלפפון', price: '₪6.00', qty: 5 },
    { name: 'גמבה אדומה', price: '₪13.50', qty: 0 },
    { name: 'תפוח אדמה', price: '₪3.20', qty: 3 },
  ];

  return (
    <div style={{ padding: '8px 10px', fontFamily: heebo, direction: 'rtl' }}>
      {/* Supplier header */}
      <div style={{
        background: PRIMARY, borderRadius: 10, padding: '6px 10px',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 14 }}>🌾</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: WHITE }}>יבולי שדה תמרה</span>
      </div>

      {products.map((p, i) => {
        const spr = spring({ frame: Math.max(0, frame - 15 - i * 10), fps, config: { damping: 14 } });
        const op  = interpolate(spr, [0, 1], [0, 1]);
        return (
          <div key={i} style={{
            background: WHITE, borderRadius: 10, padding: '8px 10px',
            marginBottom: 6, opacity: op,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: DARK }}>{p.name}</div>
              <div style={{ fontSize: 10, color: PRIMARY, fontWeight: 700 }}>{p.price}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: SECONDARY, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: PRIMARY,
              }}>−</div>
              <span style={{ fontSize: 14, fontWeight: 900, color: DARK, minWidth: 14, textAlign: 'center' }}>
                {p.qty}
              </span>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: PRIMARY, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900, color: WHITE,
              }}>+</div>
            </div>
          </div>
        );
      })}

      {/* Cart button */}
      <div style={{
        background: PRIMARY, borderRadius: 12, padding: '8px 0',
        marginTop: 6, textAlign: 'center',
        fontSize: 13, fontWeight: 900, color: WHITE,
      }}>
        🛒 לסיכום ההזמנה (10 פריטים)
      </div>
    </div>
  );
};

export const BranchOrder: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={2} title="בחירת מוצרים" color={BRANCH_BLUE} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 550,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} color={DARK}>
          הוספת מוצרים לסל
        </Heading>
        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={22}
            stagger={13}
            color={BRANCH_BLUE}
            items={[
              { icon: '🏭', text: 'בחר ספק מהרשימה — רק הזמינים היום' },
              { icon: '➕', text: 'לחץ + להוסיף מוצר לסל ההזמנה' },
              { icon: '⭐', text: 'מוצרים מועדפים — גישה מהירה' },
              { icon: '💾', text: 'שמור תבנית — הזמן שוב בקליק אחד' },
              { icon: '🔍', text: 'חיפוש מוצר מהיר לפי שם' },
            ]}
          />
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 70, top: 0, bottom: 52,
        display: 'flex', alignItems: 'center',
      }}>
        <PhoneFrame delay={6}>
          <OrderScreen />
        </PhoneFrame>
      </div>

      <BottomBar label="מדריך מנהל סניף" />
    </Scene>
  );
};
