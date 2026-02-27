// MODIFIED: Extended to handle button-styled <Link> anchor elements in addition to <button>.
// A single document-level listener covers all pages without per-component changes.
'use client';

import { useEffect } from 'react';

/**
 * CSS selector matching all premium-eligible interactive elements:
 * - <button> elements that are not disabled / .disabled / .no-premium
 * - <a href> elements styled as buttons (identified by rounded-* class token)
 *   This covers Next.js <Link> components used as navigation buttons throughout
 *   the app (+ Add, Orders, History, Restock, Cancel, Admin, etc.)
 */
const BUTTON_SELECTOR =
  'button:not(:disabled):not(.disabled):not(.no-premium)';

const ANCHOR_SELECTOR =
  "a[href]:not(.no-premium):is([class~='rounded-lg'],[class~='rounded-xl'],[class~='rounded-md'],[class~='rounded-full'])";

const PREMIUM_SELECTOR = `${BUTTON_SELECTOR}, ${ANCHOR_SELECTOR}`;

/**
 * Injects a ripple element at the exact pointer coordinates within an element.
 * The ripple is pre-sized to ~250% of the element's largest dimension so that
 * animating CSS scale from 0→1 produces the correct final spread radius,
 * covering the entire button surface from any click origin point.
 * The DOM element is auto-removed via animationend to prevent accumulation.
 */
function attachRipple(el: HTMLElement, clientX: number, clientY: number): void {
  const rect = el.getBoundingClientRect();

  // Size the ripple to 250% of the button's largest dimension (pre-scaled for 0→1 animation)
  const size = Math.max(rect.width, rect.height) * 2.5;

  const ripple = document.createElement('span');
  ripple.className = 'premium-ripple';

  // Center the ripple circle on the exact click point (within element bounds)
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${clientX - rect.left - size / 2}px`;
  ripple.style.top = `${clientY - rect.top - size / 2}px`;

  el.appendChild(ripple);

  // Auto-remove after animation ends to prevent DOM bloat on rapid clicking
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/**
 * Ensures a button-styled <a> element can properly contain the absolutely-
 * positioned ripple. CSS `overflow: hidden` does not clip reliably on
 * display:inline elements — setting display:inline-block fixes this.
 * Idempotent via data-premium-init flag.
 */
function ensureBlockDisplay(el: HTMLElement): void {
  if (el.dataset.premiumInit) return;
  el.dataset.premiumInit = 'true';
  if (window.getComputedStyle(el).display === 'inline') {
    el.style.display = 'inline-block';
  }
}

/**
 * Mounts a single document-level pointerdown handler that triggers ripple
 * effects on all premium-eligible buttons and button-styled links.
 *
 * On mount also scans existing anchor-buttons to pre-set display:inline-block,
 * ensuring the first ripple on any link is properly clipped. New elements added
 * after mount (SPA navigation, modals) are handled lazily on first interaction.
 */
export default function PremiumButtonProvider(): null {
  useEffect(() => {
    // Pre-initialize existing button-styled anchors for ripple containment
    document.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR).forEach(ensureBlockDisplay);

    const handlePointerDown = (event: PointerEvent): void => {
      // Respect prefers-reduced-motion — no ripple for users who opt out of motion
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const target = event.target as Element;

      // Walk up the DOM to find the nearest premium-eligible interactive element
      const el = target.closest<HTMLElement>(PREMIUM_SELECTOR);
      if (!el) return;

      // Guard against disabled state at interaction time (state may change after mount)
      if (el instanceof HTMLButtonElement && el.disabled) return;
      if (el.classList.contains('disabled')) return;

      // For anchor elements: ensure proper block display for overflow clipping
      if (el.tagName === 'A') {
        ensureBlockDisplay(el);
      }

      attachRipple(el, event.clientX, event.clientY);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return null;
}
