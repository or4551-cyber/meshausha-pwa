import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { BulletList } from '../../components/BulletList';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, ACCENT } from '../../constants';
import { heebo } from '../../components/fonts';

const DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];
const DAY_COLORS = ['#8B3A3A','#A08050','#5b6bbf','#2D8B5A','#C47A1A','#7a3a8B'];

const SCHEDULE: (string | null)[][] = [
  ['טרה פלסט', null, 'יבולי שדה', null, 'תפוכן', null],
  [null, 'יבולי שדה', null, 'טרה פלסט', null, 'אלקיים'],
  ['תפוכן', null, 'אלקיים', null, 'יבולי שדה', null],
];

const Cell: React.FC<{ text: string | null; day: number; row: number }> = ({ text, day, row }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 30 + row * 14 + day * 6;
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const scale = interpolate(spr, [0, 1], [0.8, 1]);

  return (
    <div style={{
      flex: 1, height: 44, borderRadius: 10, margin: 3,
      background: text ? DAY_COLORS[day] : 'rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: op, transform: `scale(${scale})`,
      fontFamily: heebo, direction: 'rtl',
    }}>
      {text && (
        <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, textAlign: 'center', padding: '0 4px' }}>
          {text}
        </span>
      )}
    </div>
  );
};

export const AdminWeeklySchedule: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={6} title="לוח שבועי" color='#5b6bbf' />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 480,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={50} sub="מי מזמין מי בכל יום">
          לוח הזמנות שבועי
        </Heading>

        <div style={{ marginTop: 26 }}>
          <BulletList
            startDelay={22}
            stagger={12}
            color='#5b6bbf'
            items={[
              { icon: '📅', text: 'תצוגת גריד — כל יום בשבוע' },
              { icon: '🏪', text: 'כל ספק בצבע ייחודי שלו' },
              { icon: '🔄', text: 'הגדרה פעם אחת — חוזר כל שבוע' },
              { icon: '✏️', text: 'ניתן לשנות בכל עת מלוח הניהול' },
            ]}
          />
        </div>
      </div>

      {/* Grid illustration */}
      <div style={{
        position: 'absolute', left: 40, top: 130, bottom: 64, width: 520,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          background: WHITE, borderRadius: 20, padding: 18,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', marginBottom: 6 }}>
            <div style={{ width: 60 }} />
            {DAYS.map((d, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', fontFamily: heebo,
                fontSize: 14, fontWeight: 900, color: DAY_COLORS[i], margin: '0 3px',
              }}>{d}</div>
            ))}
          </div>

          {/* Rows */}
          {['סניף א׳', 'סניף ב׳', 'סניף ג׳'].map((branch, ri) => (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <div style={{
                width: 60, fontSize: 12, fontWeight: 700, color: DARK,
                fontFamily: heebo, direction: 'rtl', textAlign: 'right', paddingRight: 6,
              }}>{branch}</div>
              {SCHEDULE[ri].map((cell, di) => (
                <Cell key={di} text={cell} day={di} row={ri} />
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', direction: 'rtl', fontFamily: heebo }}>
            {['טרה פלסט','יבולי שדה','תפוכן','אלקיים'].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: DAY_COLORS[i] }} />
                <span style={{ fontSize: 11, color: DARK, fontWeight: 700 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
