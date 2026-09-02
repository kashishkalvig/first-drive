/**
 * Every word on screen, in one place, as live text.
 *
 * Wording follows the approved reference screens, with one deliberate
 * departure. Two of the four references ("Her first drive to work begins
 * today", "Her first drive to work — a little milestone worth remembering")
 * say she is driving to work, which the content rules explicitly forbid: she
 * drives to Craigieburn Railway Station and continues from there. The most
 * final reference, the arrival screen, already uses the correct framing —
 * "Your first drive to Craigieburn Station — a little milestone, now
 * officially yours" — so the station wording is carried across all scenes and
 * the references' voice, rhythm and typography are kept intact.
 */

const milestoneDate = import.meta.env.VITE_MILESTONE_DATE?.trim() || '2026-09-02';

function formatMilestoneDate(iso: string): string {
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export const COPY = {
  loading: 'Getting things ready…',

  opening: {
    title: 'Hello Madam',
    subtitle: '',
    cta: 'Tap to see what’s special today',
    ctaAria: 'Tap to see what is special today',
  },

  key: {
    title: 'Your first Drive begins today',
    hint: 'A new first deserves its own key.',
    cta: 'Tap the key to begin',
    ctaAria: 'Tap the key to begin the drive',
  },

  driving: {
    title: 'Off you go',
    destination: '',
    caption: '',
  },

  finale: {
    title: 'Made it, Madam.',
    body: 'Your first drive to Craigieburn Station — a little milestone, now officially yours.',
    date: formatMilestoneDate(milestoneDate),
    replay: 'Replay the memory',
  },

  portraitHint: 'Best viewed in portrait',
} as const;

export const MILESTONE_DATE_ISO = milestoneDate;
