'use client';

import { useEffect } from 'react';

/**
 * CSS selector matching all premium-eligible interactive elements:
 * - <button> elements (non-disabled, non-.disabled, non-.no-premium)
 * - <a href> elements styled as buttons (rounded-* class token present)
 *   Covers Next.js <Link> components used as navigation buttons.
 */
const BUTTON_SELECTOR =
  'button:not(:disabled):not(.disabled):not(.no-premium)';

const ANCHOR_SELECTOR =
  "a[href]:not(.no-premium):is([class~='rounded-lg'],[class~='rounded-xl'],[class~='rounded-md'],[class~='rounded-full'])";

const PREMIUM_SELECTOR = `${BUTTON_SELECTOR}, ${ANCHOR_SELECTOR}`;

/**
 * Injects a ripple element at the exact interaction coordinates within an element.
 * Pre-sized to ~250% of the element's largest dimension so that CSS scale 0→1
 * animation covers the entire button surface from any origin point.
 * Auto-removed via animationend to prevent DOM accumulation.
 */
function attachRipple(el: HTMLElement, clientX: number, clientY: number): void {
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2.5;

  const ripple = document.createElement('span');
  ripple.className = 'premium-ripple';
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${clientX - rect.left - size / 2}px`;
  ripple.style.top = `${clientY - rect.top - size / 2}px`;

  el.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/**
 * Ensures a button-styled <a> element can contain the absolutely-positioned
 * ripple. CSS overflow:hidden doesn't clip reliably on display:inline elements.
 * Idempotent via data-premium-init flag.
 */
function ensureBlockDisplay(el: HTMLElement): void {
  if (el.dataset.premiumInit) return;
  el.dataset.premiumInit = 'true';
  if (window.getComputedStyle(el).display === 'inline') {
    el.style.display = 'inline-block';
  }
}

function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia != null &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Mounts interaction handlers for ripple effects on all eligible buttons and
 * button-styled links across the entire app.
 *
 * Browser compatibility:
 * - Prefers pointerdown (unified mouse + touch, all modern browsers).
 * - Falls back to touchstart + mousedown on browsers without PointerEvent
 *   (iOS Safari < 13, some older Firefox Mobile versions).
 * - Both paths are passive where possible to not block scrolling.
 */
export default function PremiumButtonProvider(): null {
  useEffect(() => {
    // Pre-initialize existing button-styled anchors for ripple containment
    document.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR).forEach(ensureBlockDisplay);

    function handleInteraction(clientX: number, clientY: number, target: EventTarget | null): void {
      if (isReducedMotion()) return;
      if (!(target instanceof Element)) return;

      const el = target.closest<HTMLElement>(PREMIUM_SELECTOR);
      if (!el) return;
      if (el instanceof HTMLButtonElement && el.disabled) return;
      if (el.classList.contains('disabled')) return;

      if (el.tagName === 'A') ensureBlockDisplay(el);
      attachRipple(el, clientX, clientY);
    }

    // ── Primary path: PointerEvent (Chrome, Firefox, Safari 13+) ──────────
    if (window.PointerEvent) {
      const onPointerDown = (e: PointerEvent) =>
        handleInteraction(e.clientX, e.clientY, e.target);

      document.addEventListener('pointerdown', onPointerDown);
      return () => document.removeEventListener('pointerdown', onPointerDown);
    }

    // ── Fallback: touchstart + mousedown (older Safari, legacy browsers) ───
    // touchstart fires before mousedown; track the last touch to skip the
    // subsequent synthetic mousedown that mobile browsers fire after touch.
    let lastTouchEnd = 0;

    const onTouchStart = (e: TouchEvent) => {
      lastTouchEnd = Date.now();
      const touch = e.touches[0];
      if (touch) handleInteraction(touch.clientX, touch.clientY, e.target);
    };

    const onMouseDown = (e: MouseEvent) => {
      // Skip synthetic mouse events fired after touch (within 500ms)
      if (Date.now() - lastTouchEnd < 500) return;
      handleInteraction(e.clientX, e.clientY, e.target);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('mousedown', onMouseDown);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  return null;
}
