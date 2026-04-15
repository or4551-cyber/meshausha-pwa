import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, SUCCESS } from '../../constants';
import { heebo } from '../../components/fonts';

const GCAL_BLUE = '#1a73e8';

const NotifCard: React.FC<{ text: string; time: string; delay: number }> = ({ text, time, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const y   = interpolate(spr, [0, 1], [-20, 0]);

  return (
    <div style={{
      background: WHITE, borderRadius: 18, padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 6px 20px rgba(0,0,0,0.18)', marginBottom: 10,
      opacity: op, transform: `translateY(${y}px)`,
      fontFamily: heebo, direction: 'rtl', width: 340,
    }}>
      {/* App icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: GCAL_BLUE, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 24, flexShrink: 0,
      }}>📅</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 900, color: DARK }}>יומן גוגל</div>
        <div style={{ fontSize: 12, color: DARK, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>
          {text}
        </div>
        <div style={{ fontSize: 11, color: DARK, opacity: 0.4, marginTop: 4 }}>{time}</div>
      </div>
    </div>
  );
};

export const AdminCalendar: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={9} title="תזכורות Push לסניפים" color={GCAL_BLUE} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 510,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={48} sub="Google Calendar — Push אמיתי לטלפון">
          תזכורות לסניפים
        </Heading>

        <div style={{ marginTop: 26 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color={GCAL_BLUE}
            items={[
              { icon: '📅', text: 'אדמין יוצר יומן גוגל ייעודי לכל סניף' },
              { icon: '🔗', text: 'מנהל הסניף מוסיף את היומן לטלפון — פעם אחת' },
              { icon: '⏰', text: 'הגדר תזכורות חוזרות: יום/שבוע/חודש' },
              { icon: '📲', text: 'Google שולח Push אמיתי בדיוק בשעה' },
              { icon: '✅', text: 'אין אפליקציה פתוחה — ה-Push מגיע בכל מקרה' },
            ]}
          />
        </div>
      </div>

      {/* Phone notification mockup */}
      <div style={{
        position: 'absolute', left: 50, top: 100, bottom: 64, width: 400,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Phone screen with lock screen notifications */}
        <div style={{
          width: 340, background: '#1a1a2e', borderRadius: 30,
          padding: '24px 16px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Lock screen time */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 42, fontWeight: 300, color: WHITE, fontFamily: heebo }}>08:00</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', fontFamily: heebo }}>יום שלישי, 15 באפריל</div>
          </div>

          <NotifCard
            text="הזכרה: הגיע הזמן להזמין מטרה פלסט! 📦"
            time="עכשיו"
            delay={28}
          />
          <NotifCard
            text="הגש הזמנה מיבולי שדה עד השעה 10:00"
            time="לפני 2 דקות"
            delay={40}
          />
        </div>

        <div style={{
          marginTop: 16, fontFamily: heebo, direction: 'rtl',
          fontSize: 14, color: SUCCESS, fontWeight: 700, textAlign: 'center',
        }}>
          ✓ הסניף מקבל התראה ישירות לנעילת המסך
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
