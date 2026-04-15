import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { PRIMARY, DARK } from '../constants';
import { heebo } from './fonts';

type BulletItem = {
  icon?: string;
  text: string;
};

type Props = {
  items: BulletItem[];
  startDelay?: number;    // frames before first bullet appears
  stagger?: number;       // frames between bullets
  color?: string;
};

const BulletRow: React.FC<{
  item: BulletItem;
  localFrame: number;
  fps: number;
  color: string;
}> = ({ item, localFrame, fps, color }) => {
  const spr = spring({
    frame: Math.max(0, localFrame),
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  const translateX = interpolate(spr, [0, 1], [60, 0]);
  const opacity    = interpolate(spr, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        direction: 'rtl',
        fontFamily: heebo,
        transform: `translateX(${translateX}px)`,
        opacity,
        marginBottom: 18,
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
      {item.icon && (
        <span style={{ fontSize: 26, lineHeight: 1 }}>{item.icon}</span>
      )}
      <span
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: DARK,
          lineHeight: 1.3,
        }}
      >
        {item.text}
      </span>
    </div>
  );
};

export const BulletList: React.FC<Props> = ({
  items,
  startDelay = 20,
  stagger = 12,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const c = color ?? PRIMARY;

  return (
    <div>
      {items.map((item, i) => (
        <BulletRow
          key={i}
          item={item}
          localFrame={frame - startDelay - i * stagger}
          fps={fps}
          color={c}
        />
      ))}
    </div>
  );
};
