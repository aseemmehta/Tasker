import { useSyncExternalStore } from 'react';
import { accept, analyticsConfigured, decline, getConsent, subscribe } from '../lib/analytics.js';

export const useConsent = () => useSyncExternalStore(subscribe, getConsent);

/* Shown until the visitor makes a choice. Both buttons look the same on purpose. */
export function ConsentBanner() {
  const consent = useConsent();
  if (!analyticsConfigured || consent) return null;
  return (
    <div className="consent" role="dialog" aria-labelledby="consent-t" aria-modal="false">
      <strong id="consent-t">Anonymous usage statistics?</strong>
      <p className="mute">
        Allow Google Analytics to count page views so I can see whether the app is used. It is not linked to your Google
        sign-in or your tasks, and no task names, times or notes are sent. You can change this any time in Settings.
      </p>
      <div className="row">
        <button onClick={decline}>No thanks</button>
        <button onClick={accept}>Allow</button>
      </div>
    </div>
  );
}

/* Settings section so the choice can be changed later. */
export function PrivacySettings() {
  const consent = useConsent();
  if (!analyticsConfigured) return null;
  return (
    <>
      <h2>Privacy</h2>
      <div className="card">
        <p className="mute" style={{ marginTop: 0 }}>
          Analytics: <strong>{consent === 'granted' ? 'allowed' : consent === 'denied' ? 'off' : 'not chosen yet'}</strong>.
          Google Analytics only counts page views. No user ID, no link to your Google sign-in, and no task data is sent. Google
          signals and ad personalisation are switched off.
        </p>
        <div className="row">
          {consent === 'granted' ? (
            <button onClick={decline}>Turn analytics off</button>
          ) : (
            <button className="p" onClick={accept}>Allow analytics</button>
          )}
        </div>
      </div>
    </>
  );
}
