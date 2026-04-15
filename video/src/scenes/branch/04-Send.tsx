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
const WA_GREEN = '#25D366';

const SummaryScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const waSpring = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 12, mass: 0.5 } });
  const waScale  = interpolate(waSpring, [0, 1], [0.7, 1]);
  const waOp     = interpolate(waSpring, [0, 1], [0, 1]);

  const items = [
    { name: 'עגבניות שרי', qty: '×2 ק״ג', price: '₪18.00' },
    { name: 'מלפפון', qty: '×5 ק״ג', price: '₪30.00' },
    { name: 'תפוח אדמה', qty: '×3 ק״ג', price: '₪9.60' },
  ];

  return (
    <div style={{ padding: '8px 10px', fontFamily: heebo, direction: 'rtl' }}>
      <div style={{ fontSize: 11, fontWeight: 900, color: PRIMARY, marginBottom: 6 }}>
        סיכום הזמנה — יבולי שדה תמרה
      </div>

      {items.map((item, i) => {
        const spr = spring({ frame: Math.max(0, frame - 10 - i * 8), fps, config: { damping: 14 } });
        const op  = interpolate(spr, [0, 1], [0, 1]);
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '5px 0', borderBottom: '1px solid rgba(0,0,0,0.07)',
            fontSize: 11, color: DARK, opacity: op,
          }}>
            <span style={{ fontWeight: 700 }}>{item.name}</span>
            <span style={{ color: DARK, opacity: 0.6 }}>{item.qty}</span>
            <span style={{ fontWeight: 900, color: PRIMARY }}>{item.price}</span>
          </div>
        );
      })}

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '8px 0', marginTop: 4,
        fontSize: 13, fontWeight: 900, color: PRIMARY,
      }}>
        <span>סה"כ</span>
        <span>₪57.60</span>
      </div>

      {/* WhatsApp button */}
      <div style={{
        background: WA_GREEN, borderRadius: 12, padding: '10px 0',
        textAlign: 'center', marginTop: 6,
        fontSize: 13, fontWeight: 900, color: WHITE,
        transform: `scale(${waScale})`, opacity: waOp,
        boxShadow: '0 4px 12px rgba(37,211,102,0.4)',
      }}>
        📤 שלח הזמנה בוואטסאפ
      </div>
    </div>
  );
};

export const BranchSend: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={3} title="שליחת ההזמנה" color={WA_GREEN} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 550,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} color={DARK}>
          שליחה בוואטסאפ
        </Heading>
        <div style={{ marginTop: 28 }}>
          <BulletList
            startDelay={22}
            stagger={13}
            color={WA_GREEN}
            items={[
              { icon: '📋', text: 'סיכום מסודר — שם, כמות, מחיר לכל פריט' },
              { icon: '📤', text: 'לחץ "שלח בוואטסאפ" — הודעה נפתחת מוכנה' },
              { icon: '✅', text: 'ההזמנה נשמרת במערכת אוטומטית' },
              { icon: '📱', text: 'הספק מקבל הודעת טקסט ברורה' },
              { icon: '🕐', text: 'חותמת זמן מדויקת על כל הזמנה' },
            ]}
          />
        </div>

        {/* WhatsApp message preview */}
        <div style={{
          marginTop: 20, background: '#e8f5e9', borderRadius: 16,
          padding: '12px 16px', direction: 'rtl', fontFamily: heebo,
          borderRight: `3px solid ${WA_GREEN}`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: WA_GREEN, marginBottom: 4 }}>
            💬 תצוגה מקדימה של ההודעה
          </div>
          <div style={{ fontSize: 12, color: DARK, lineHeight: 1.6 }}>
            שלום, הזמנה מסניף עין המפרץ:{'\n'}
            • עגבניות שרי ×2 ק״ג{'\n'}
            • מלפפון ×5 ק״ג{'\n'}
            • תפוח אדמה ×3 ק״ג{'\n'}
            סה"כ: ₪57.60 | {new Date().toLocaleDateString('he-IL')}
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 70, top: 0, bottom: 52,
        display: 'flex', alignItems: 'center',
      }}>
        <PhoneFrame delay={6}>
          <SummaryScreen />
        </PhoneFrame>
      </div>

      <BottomBar label="מדריך מנהל סניף" />
    </Scene>
  );
};
