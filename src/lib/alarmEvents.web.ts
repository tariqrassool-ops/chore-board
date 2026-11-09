import { serviceWorker } from './webPush';

type OpenAlarm = (key: string, id: string) => void;

/** The service worker (public/sw.js) posts a message when an alert arrives or is tapped while the board is open. */
export function subscribeAlarmEvents(onOpen: OpenAlarm): () => void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {};
  serviceWorker();
  const listener = (e: MessageEvent) => {
    if (e.data?.type === 'chore-alert' && e.data.key) onOpen(e.data.key, '');
  };
  navigator.serviceWorker.addEventListener('message', listener);
  return () => navigator.serviceWorker.removeEventListener('message', listener);
}
