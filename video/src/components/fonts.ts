import { loadFont } from '@remotion/google-fonts/Heebo';

// Heebo — Hebrew RTL font with full Unicode support
export const { fontFamily: heebo } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['hebrew', 'latin'],
});
