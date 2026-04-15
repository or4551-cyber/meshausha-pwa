import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { AdminIntro }          from './scenes/admin/01-Intro';
import { AdminLogin }          from './scenes/admin/02-Login';
import { AdminDashboard }      from './scenes/admin/03-Dashboard';
import { AdminAddSupplier }    from './scenes/admin/04-AddSupplier';
import { AdminPrices }         from './scenes/admin/05-Prices';
import { AdminBranchOverview } from './scenes/admin/06-BranchOverview';
import { AdminWeeklySchedule } from './scenes/admin/07-WeeklySchedule';
import { AdminCredits }        from './scenes/admin/08-Credits';
import { AdminGmail }          from './scenes/admin/09-Gmail';
import { AdminCalendar }       from './scenes/admin/10-Calendar';
import { AdminAnalytics }      from './scenes/admin/11-Analytics';
import { AdminOutro }          from './scenes/admin/12-Outro';

const FADE = linearTiming({ durationInFrames: 20 });
const SLIDE = linearTiming({ durationInFrames: 20 });

// Scene durations in frames (30fps)
// Intro:30s, Login:25s, Dashboard:30s, Supplier:38s, Prices:30s,
// Overview:30s, Weekly:28s, Credits:30s, Gmail:35s, Calendar:30s,
// Analytics:30s, Outro:22s
const D = {
  intro: 900,
  login: 750,
  dashboard: 900,
  supplier: 1140,
  prices: 900,
  overview: 900,
  weekly: 840,
  credits: 900,
  gmail: 1050,
  calendar: 900,
  analytics: 900,
  outro: 660,
};

export const AdminVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={D.intro}>
        <AdminIntro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={D.login}>
        <AdminLogin />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.dashboard}>
        <AdminDashboard />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.supplier}>
        <AdminAddSupplier />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.prices}>
        <AdminPrices />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.overview}>
        <AdminBranchOverview />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.weekly}>
        <AdminWeeklySchedule />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.credits}>
        <AdminCredits />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.gmail}>
        <AdminGmail />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.calendar}>
        <AdminCalendar />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.analytics}>
        <AdminAnalytics />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={D.outro}>
        <AdminOutro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

// Total = sum(D) - 11 transitions × 20 = 10740 - 220 = 10520 frames ≈ 5m 51s
export const ADMIN_TOTAL_FRAMES =
  Object.values(D).reduce((a, b) => a + b, 0) - 11 * 20;
