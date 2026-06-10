const TIP_SEEN_KEY = 'text-reader-tip-seen-once';
export const TIP_PROMPT_PROBABILITY = 0.2;

export function shouldShowTipPrompt(randomValue = Math.random(), storage: Storage = window.localStorage): boolean {
  const hasSeenTip = storage.getItem(TIP_SEEN_KEY) === 'true';

  if (!hasSeenTip) {
    storage.setItem(TIP_SEEN_KEY, 'true');
    return true;
  }

  return randomValue < TIP_PROMPT_PROBABILITY;
}
