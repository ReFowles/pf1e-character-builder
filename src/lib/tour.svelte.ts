// First-run walkthrough: two coach marks pointing at a section's Edit and Info
// buttons. Shown once per device (prefs.tourSeen); replayable from Settings.
import { prefs } from './prefs.svelte';

export interface TourStep {
  /** CSS selector of the element to point at. */
  target: string;
  title: string;
  text: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-section="info"] [data-tour="edit"]',
    title: 'Edit mode',
    text: 'Numbers and names are always editable. The pencil opens a section’s edit mode, which reveals the add, reorder, remove and database-search controls, such as adding languages here or finding a feat.',
  },
  {
    target: '[data-section="info"] [data-tour="info"]',
    title: 'Info',
    text: 'The ℹ button explains how a section’s numbers are worked out and collects every breakdown that is otherwise only shown on hover, so it works on phones too.',
  },
];

class Tour {
  /** Index of the current step, or -1 when closed. */
  step = $state(-1);

  get open() {
    return this.step >= 0;
  }
  start() {
    this.step = 0;
  }
  next() {
    if (this.step + 1 < TOUR_STEPS.length) this.step++;
    else this.finish();
  }
  finish() {
    this.step = -1;
    prefs.data.tourSeen = true;
  }
}

export const tour = new Tour();
