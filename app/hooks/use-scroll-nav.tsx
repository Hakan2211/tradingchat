import { useState, useRef } from 'react';
import { useMotionValueEvent, useScroll } from 'framer-motion';

/**
 * A custom hook to track scroll position and determine navbar visibility.
 * @param threshold - The scroll distance (in pixels) after which the navbar becomes "visible" (shrunken). Defaults to 100.
 * @returns An object containing the ref for the target element and the visibility state.
 */
export function useScrollNav(threshold = 100) {
  // const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // const { scrollY } = useScroll({
  //   target: ref,
  //   offset: ['start start', 'end start'],

  // });
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    setVisible(latest > threshold);
  });

  // return { ref, visible };
  return { visible };
}
