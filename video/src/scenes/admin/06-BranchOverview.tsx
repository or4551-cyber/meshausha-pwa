import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Scene } from '../../components/Scene';
import { ChapterBadge } from '../../components/ChapterBadge';
import { Heading } from '../../components/Heading';
import { StatBadge } from '../../components/UICard';
import { BottomBar } from '../../components/BottomBar';
import { PRIMARY, WHITE, SECONDARY, DARK, SUCCESS, WARNING } from '../../constants';
import { heebo } from '../../components/fonts';

const BranchCard: React.FC<{
  name: string; ordered: boolean; spend: string; delay: number;
}> = ({ name, ordered, spend, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 14 } });
  const op  = interpolate(spr, [0, 1], [0, 1]);
  const y   = interpolate(spr, [0, 1], [20, 0]);

  return (
    <div style={{
      background: WHITE, borderRadius: 14, padding: '10px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: heebo, direction: 'rtl',
      opacity: op, transform: `translateY(${y}px)`,
      borderRight: `4px solid ${ordered ? SUCCESS : WARNING}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: DARK }}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, color: DARK, opacity: 0.6 }}>{spend}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '3px 8px',
          background: ordered ? '#edfff5' : '#fff8e6',
          color: ordered ? SUCCESS : WARNING,
        }}>
          {ordered ? '✓ הזמין היום' : '⏳ טרם הזמין'}
        </span>
      </div>
    </div>
  );
};

export const AdminBranchOverview: React.FC = () => {
  return (
    <Scene>
      <ChapterBadge number={5} title="מבט-על סניפים" color={PRIMARY} />

      <div style={{
        position: 'absolute', top: 110, right: 60, width: 500,
        fontFamily: heebo, direction: 'rtl',
      }}>
        <Heading delay={12} fontSize={50} sub="כל הסניפים — מבט אחד">
          ניטור פעילות יומית
        </Heading>

        {/* KPI badges */}
        <div style={{ display: 'flex', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
          <StatBadge label="הוצאה חודשית" value="₪48K" delay={22} />
          <StatBadge label="הזמינו היום" value="6/9" color='#2D8B5A' delay={30} />
          <StatBadge label="זיכויים פתוחים" value="3" color='#C47A1A' delay={38} />
        </div>
      </div>

      {/* Branch list */}
      <div style={{
        position: 'absolute', left: 50, top: 120, bottom: 64, width: 480,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8,
      }}>
        <BranchCard name="עין המפרץ"        ordered spend="₪5,240" delay={25} />
        <BranchCard name="ביאליק קרן היסוד" ordered spend="₪6,100" delay={32} />
        <BranchCard name="מוצקין הילדים"    ordered={false} spend="₪4,800" delay={39} />
        <BranchCard name="צור שלום"         ordered spend="₪3,900" delay={46} />
        <BranchCard name="גושן 60"          ordered={false} spend="₪5,500" delay={53} />
        <BranchCard name="נהריה הגעתון"     ordered spend="₪4,200" delay={60} />
      </div>

      <BottomBar label="מדריך אדמין" />
    </Scene>
  );
};
