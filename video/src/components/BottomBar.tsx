import React from 'react';
import { APP_NAME, PRIMARY, WHITE } from '../constants';
import { heebo } from './fonts';

type Props = {
  label?: string;
};

/**
 * Fixed bottom branding bar used across all scenes.
 */
export const BottomBar: React.FC<Props> = ({ label }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 52,
      background: PRIMARY,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: heebo,
      direction: 'rtl',
    }}
  >
    <span style={{ fontSize: 20, fontWeight: 900, color: WHITE }}>
      {APP_NAME}
    </span>
    {label && (
      <>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }}>|</span>
        <span style={{ fontSize: 16, fontWeight: 400, color: 'rgba(255,255,255,0.8)' }}>
          {label}
        </span>
      </>
    )}
  </div>
);
