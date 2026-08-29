import gsap from 'gsap';

export { gsap };

/** Staggered fade/slide-up entrance for a list of children. */
export function animateChildrenIn(
  container,
  { selector = '> *', stagger = 0.06, y = 24, duration = 0.55 } = {},
) {
  const items = container?.querySelectorAll(selector);
  if (!items?.length) return;
  return gsap.fromTo(
    items,
    { opacity: 0, y, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1, duration, stagger, ease: 'power3.out', clearProps: 'all' },
  );
}
