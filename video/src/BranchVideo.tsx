import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';

import { BranchIntro }    from './scenes/branch/01-Intro';
import { BranchLogin }    from './scenes/branch/02-Login';
import { BranchOrder }    from './scenes/branch/03-Order';
import { BranchSend }     from './scenes/branch/04-Send';
import { BranchDelivery } from './scenes/branch/05-Delivery';
import { BranchOutro }    from './scenes/branch/06-Outro';

const FADE  = linearTiming({ durationInFrames: 20 });
const SLIDE = linearTiming({ durationInFrames: 20 });

// Scene durations in frames (30fps)
// Intro:20s, Login:22s, Order:35s, Send:35s, Delivery:30s, Outro:18s
const D = {
  intro: 600,
  login: 660,
  order: 1050,
  send: 1050,
  delivery: 900,
  outro: 540,
};

export const BranchVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={D.intro}>
        <BranchIntro />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={D.login}>
        <BranchLogin />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.order}>
        <BranchOrder />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.send}>
        <BranchSend />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slide({ direction: 'from-left' })} timing={SLIDE} />

      <TransitionSeries.Sequence durationInFrames={D.delivery}>
        <BranchDelivery />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={FADE} />

      <TransitionSeries.Sequence durationInFrames={D.outro}>
        <BranchOutro />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);

// Total = sum(D) - 5 transitions × 20 = 4800 - 100 = 4700 frames ≈ 2m 37s
export const BRANCH_TOTAL_FRAMES =
  Object.values(D).reduce((a, b) => a + b, 0) - 5 * 20;
