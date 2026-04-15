import React from 'react';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { UICard } from '../../components/UICard';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, ACCENT, SECONDARY, DARK } from '../../constants';
import { heebo } from '../../components/fonts';

export const AdminDashboard: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={2} title="פאנל ניהול — סקירה כללית" color={ACCENT} />

      <div style={{
        position: 'absolute', top: 110, right: 60, left: 60,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={52} sub="כל כלי הניהול במקום אחד">
          פאנל האדמין
        </Heading>

        {/* Card grid */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 32,
          direction: 'rtl',
        }}>
          <UICard delay={20} icon="👁️" title="מבט-על סניפים"
            lines={['מי הזמין היום', 'הוצאות חודשיות', 'זיכויים פתוחים']}
            width={290} accent={PRIMARY} />

          <UICard delay={30} icon="📅" title="לוח שבועי"
            lines={['מי מזמין מי בכל יום', 'תצוגת גריד צבעונית']}
            width={290} accent={ACCENT} />

          <UICard delay={40} icon="📊" title="דשבורד אנליטי"
            lines={['גרפים אינטראקטיביים', 'סטטיסטיקות לפי ספק/סניף']}
            width={290} accent='#5b6bbf' />

          <UICard delay={50} icon="🔔" title="תזכורות Push"
            lines={['יומן גוגל לכל סניף', 'Push לטלפון בזמן אמת']}
            width={290} accent='#2D8B5A' />

          <UICard delay={60} icon="📧" title="Gmail + חשבוניות"
            lines={['משיכה אוטומטית מהמייל', 'ניתוח והשוואת מחירים']}
            width={290} accent='#d44' />

          <UICard delay={70} icon="💳" title="מעקב זיכויים"
            lines={['פריטים שלא סופקו', 'מצב הסדרת הזיכוי']}
            width={290} accent='#C47A1A' />
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
