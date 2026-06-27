'use client';

import { useEffect, useRef } from 'react';
import styles from './AnimatedNumber.module.css';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}

/**
 * AnimatedNumber — Direct DOM Manipulation Edition
 *
 * ⚡ Performance: bypasses React's render cycle entirely.
 *    Instead of setState (which triggers reconciliation + commit for every rAF frame),
 *    we write directly to `spanRef.current.textContent`.
 *
 * Old approach: useState + rAF → ~3 setState calls per animation (each causes re-render)
 * New approach: ref.current.textContent = value → ZERO re-renders during animation
 *
 * The initial `{value.toFixed(decimals)}` in JSX handles SSR hydration;
 * after mount, the rAF loop takes full ownership of the DOM text node.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 40,
  className = '',
}: AnimatedNumberProps) {
  const spanRef  = useRef<HTMLSpanElement>(null);
  // Store mutable animation state in a ref — avoids any useState overhead
  const animRef  = useRef({ prev: value, rafId: 0 });

  useEffect(() => {
    const anim      = animRef.current;
    const startVal  = anim.prev;
    const endVal    = value;
    const startTime = performance.now();

    cancelAnimationFrame(anim.rafId);

    const animate = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic — smooth deceleration
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = startVal + (endVal - startVal) * eased;

      // ⚡ Direct DOM write — zero React involvement
      if (spanRef.current) {
        spanRef.current.textContent = current.toFixed(decimals);
      }

      if (progress < 1) {
        anim.rafId = requestAnimationFrame(animate);
      } else {
        anim.prev  = endVal;
      }
    };

    anim.rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(anim.rafId);
  }, [value, duration, decimals]);

  // Initial value rendered in JSX ensures correct SSR hydration;
  // the rAF loop overwrites textContent immediately on mount.
  return (
    <span ref={spanRef} className={`${styles.number} ${className}`}>
      {value.toFixed(decimals)}
    </span>
  );
}
