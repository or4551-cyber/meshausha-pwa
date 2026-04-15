import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { PhoneFrame } from '../../components/PhoneFrame';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, SUCCESS, WARNING } from '../../constants';
import { heebo } from '../../components/fonts';

const BRANCH_BLUE = '#2D5A8B';

const DeliveryScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { name: 'עגבניות שרי', status: 'received', label: '✓ התקבל' },
    { name: 'מלפפון', status: 'partial', label: '⚡ חלקי (3/5)' },
    { name: 'תפוח אדמה', status: 'missing', label: '✗ לא הגיע' },
  ];

  const statusColors: Record<string, string> = {
    received: SUCCESS,
    partial: WARNING,
    missing: '#e53935',
  };

  return (
    <div style={{ padding: '8px 10px', fontFamily: heebo, direction: 'rtl' }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: PRIMARY, marginBottom: 8 }}>
        אישור קבלת סחורה
      </div>

      {items.map((item, i) => {
        const spr = spring({ frame: Math.max(0, frame - 12 - i * 10), fps, config: { damping: 14 } });
        const op  = interpolate(spr, [0, 1], [0, 1]);
        const color = statusColors[item.status];
        return (
          <div key={i} style={{
            background: WHITE, borderRadius: 10, padding: '8px 10px',
            marginBottom: 6, opacity: op,
            borderRight: `4px solid ${color}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DARK, marginBottom: 4 }}>
              {item.name}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['התקבל', 'חלקי', 'חסר'].map((btn, bi) => {
                const statuses = ['received', 'partial', 'missing'];
                const active = item.status === statuses[bi];
                return (
                  <div key={bi} style={{
                    flex: 1, borderRadius: 6, padding: '4px 0',
                    textAlign: 'center', fontSize: 10, fontWeight: 700,
                    background: active ? color : SECONDARY,
                    color: active ? WHITE : DARK,
                    opacity: active ? 1 : 0.6,
                  }}>{btn}</div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{
        background: PRIMARY, borderRadius: 10, padding: '8px 0',
        textAlign: 'center', marginTop: 6,
        fontSize: 12, fontWeight: 900, color: WHITE,
      }}>
        שמור ✓ — שלח לאדמין
      </div>
    </div>
  );
};

export const BranchDelivery: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={4} title="אישור אספקה" color={SUCCESS} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 550,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} color={DARK}>
          אישור קבלת סחורה
        </Heading>
        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={22}
            stagger={13}
            color={SUCCESS}
            items={[
              { icon: '📦', text: 'כשמגיעה הסחורה — פתח "אישור אספקה"' },
              { icon: '✅', text: 'סמן כל פריט: התקבל / חלקי / חסר' },
              { icon: '⚡', text: 'פריטים חסרים — מחושב זיכוי אוטומטי' },
              { icon: '📲', text: 'האדמין מקבל עדכון ומטפל בזיכוי' },
            ]}
          />
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 70, top: 0, bottom: 52,
        display: 'flex', alignItems: 'center',
      }}>
        <PhoneFrame delay={6}>
          <DeliveryScreen />
        </PhoneFrame>
      </div>

      <BottomBar label="מדריך מנהל סניף" />
    </Scene>
  );
};
