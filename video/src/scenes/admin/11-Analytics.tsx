import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, ACCENT } from '../../constants';
import { heebo } from '../../components/fonts';

const BAR_DATA = [
  { label: 'ינו׳', value: 0.6, color: '#8B3A3A' },
  { label: 'פבר׳', value: 0.75, color: '#A08050' },
  { label: 'מרץ', value: 0.5, color: '#5b6bbf' },
  { label: 'אפר׳', value: 0.9, color: '#2D8B5A' },
  { label: 'מאי', value: 0.8, color: '#C47A1A' },
  { label: 'יונ׳', value: 1.0, color: '#8B3A3A' },
];

const BAR_MAX_H = 140;

const Bar: React.FC<{ item: typeof BAR_DATA[0]; delay: number }> = ({ item, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const h   = interpolate(spr, [0, 1], [0, item.value * BAR_MAX_H]);
  const op  = interpolate(spr, [0, 1], [0, 1]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      opacity: op, width: 52,
    }}>
      <div style={{
        width: 38, height: h, borderRadius: '8px 8px 0 0',
        background: item.color,
        transition: 'none',
      }} />
      <div style={{
        marginTop: 6, fontSize: 12, fontWeight: 700, color: DARK,
        fontFamily: heebo, direction: 'rtl',
      }}>{item.label}</div>
    </div>
  );
};

export const AdminAnalytics: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={10} title="דשבורד אנליטי" color='#5b6bbf' />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 480,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={50} sub="נתונים, גרפים ותובנות">
          ניתוח כלכלי מעמיק
        </Heading>

        <div style={{ marginTop: 26 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color='#5b6bbf'
            items={[
              { icon: '📊', text: 'גרפי הוצאות לפי ספק וסניף' },
              { icon: '📅', text: 'השוואה חודש מול חודש' },
              { icon: '📋', text: 'דוחות לייצוא — CSV / PDF' },
              { icon: '🏆', text: 'הסניף המוביל + הספק הגדול ביותר' },
            ]}
          />
        </div>
      </div>

      {/* Bar chart */}
      <div style={{
        position: 'absolute', left: 40, top: 120, bottom: 64, width: 500,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: WHITE, borderRadius: 24, padding: '24px 28px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.1)', width: 460,
        }}>
          <div style={{
            fontFamily: heebo, direction: 'rtl',
            fontWeight: 900, fontSize: 16, color: PRIMARY, marginBottom: 20,
          }}>
            📊 הוצאות חודשיות — כל הסניפים
          </div>

          {/* Bars */}
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 0,
            borderBottom: `2px solid rgba(0,0,0,0.1)`,
            paddingBottom: 0, justifyContent: 'space-around',
            height: BAR_MAX_H + 20,
          }}>
            {BAR_DATA.map((item, i) => (
              <Bar key={i} item={item} delay={28 + i * 8} />
            ))}
          </div>

          {/* Y-axis labels */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', marginTop: 16,
            fontFamily: heebo, direction: 'rtl',
          }}>
            <div style={{ fontSize: 13, color: DARK, opacity: 0.55 }}>סה"כ: ₪284,500</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#2D8B5A' }}>▲ 12% מהשנה שעברה</div>
          </div>
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
