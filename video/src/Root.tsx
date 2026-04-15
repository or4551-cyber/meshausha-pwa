import React from 'react';
import { Composition, Folder } from 'remotion';
import { AdminVideo, ADMIN_TOTAL_FRAMES } from './AdminVideo';
import { BranchVideo, BRANCH_TOTAL_FRAMES } from './BranchVideo';
import { FPS } from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Meshausha-Tutorials">
        <Composition
          id="AdminTutorial"
          component={AdminVideo}
          durationInFrames={ADMIN_TOTAL_FRAMES}
          fps={FPS}
          width={1280}
          height={720}
        />
        <Composition
          id="BranchTutorial"
          component={BranchVideo}
          durationInFrames={BRANCH_TOTAL_FRAMES}
          fps={FPS}
          width={1280}
          height={720}
        />
      </Folder>
    </>
  );
};
