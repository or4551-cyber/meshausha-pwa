import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, WARNING, SUCCESS } from '../../constants';
import { heebo } from '../../components/fonts';

const CreditRow: React.FC<{
  item: string; branch: string; supplier: string;
  amount: string; status: 'pending' | 'resolved'; delay: number;
}> = ({ item, branch, supplier, amount, status, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const x   = interpolate(spr, [0, 1], [40, 0]);

  const isPending = status === 'pending';

  return (
    <div style={{
      background: WHITE, borderRadius: 14, padding: '12px 16px', marginBottom: 8,
      fontFamily: heebo, direction: 'rtl',
      borderRight: `4px solid ${isPending ? WARNING : SUCCESS}`,
      opacity: op, transform: `translateX(${x}px)`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.07)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 15, color: DARK }}>{item}</div>
          <div style={{ fontSize: 12, color: DARK, opacity: 0.55, marginTop: 2 }}>
            {branch} • {supplier}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontWeight: 900, fontSize: 16, color: isPending ? WARNING : SUCCESS }}>
            {amount}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, borderRadius: 8, padding: '2px 8px',
            background: isPending ? '#fff8e6' : '#edfff5',
            color: isPending ? WARNING : SUCCESS,
          }}>
            {isPending ? '⏳ ממתין לזיכוי' : '✓ זוכה'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const AdminCredits: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={7} title="מעקב זיכויים" color={WARNING} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 490,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={50} sub="פריטים שלא סופקו — מעקב מלא">
          ניהול זיכויים
        </Heading>

        <div style={{ marginTop: 26 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color={WARNING}
            items={[
              { icon: '📦', text: 'סניף מאשר קבלת סחורה פריט פריט' },
              { icon: '❌', text: 'פריטים חסרים מסומנים אוטומטית' },
              { icon: '💰', text: 'ערך הזיכוי מחושב לפי מחיר מוסכם' },
              { icon: '✅', text: 'אדמין מסמן — זוכה / ממתין / נמסר' },
            ]}
          />
        </div>
      </div>

      {/* Credits list */}
      <div style={{
        position: 'absolute', left: 40, top: 130, bottom: 64, width: 490,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <CreditRow item="עגבניות שרי ×5 ק״ג" branch="עין המפרץ"
          supplier="יבולי שדה" amount="₪45.00" status="pending" delay={25} />
        <CreditRow item="מלפפון ×3 ק״ג" branch="גושן 60"
          supplier="יבולי שדה" amount="₪18.00" status="pending" delay={33} />
        <CreditRow item="כוסות 200מ״ל ×200" branch="ביאליק"
          supplier="טרה פלסט" amount="₪32.00" status="resolved" delay={41} />
        <CreditRow item="שמן זית 1L ×2" branch="צור שלום"
          supplier="יבולי שדה" amount="₪36.00" status="resolved" delay={49} />
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
