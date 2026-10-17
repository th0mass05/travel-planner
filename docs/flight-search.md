# Flight search setup

Flight search is in **Admin → Flights → Add Flight**. Search by full flight number and departure date, or by departure/arrival airport codes and date. Select a result, review the editable details, then save. Price, notes and booking status are preserved. Manual entry remains available.

## Connect FlightAware

1. Add this server-only setting to `.env.local` in the project root:

   ```dotenv
   FLIGHTAWARE_API_KEY=your_aeroapi_key
   ```

2. Restart the development server (`npm run dev`). Never use a `NEXT_PUBLIC_` prefix for this key or commit it to Git.
3. Sign in, open one of your trips and search for a known flight/date. No search is sent until you press Search. Each “Load more results” action requests another page.
4. For Vercel, add the same environment variable in the project's settings for the intended environments and redeploy. Your local setting is not automatically deployed.

Existing `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` settings must be available on the server. The route verifies the Firebase session and reads the trip with the user's permissions. If your Firebase API key has browser-referrer restrictions that block server verification, configure a suitable verification setup before enabling this route; do not remove restrictions blindly.

Optionally restrict the feature while testing:

```dotenv
FLIGHTAWARE_ALLOWED_UIDS=firebase_user_uid_1,firebase_user_uid_2
```

Without this setting, signed-in owners and members of a trip can search. UIDs are available in Firebase Authentication's user list.

## Behaviour and costs

- Uses AeroAPI schedules, not live flight tracking. Search dates are limited to roughly three months back through one year ahead, with a small margin for timezones. Provider coverage can vary.
- Times are converted to each airport's local timezone, including daylight saving and overnight arrival dates. Results with missing timezone data are omitted instead of guessed.
- Each provider schedule request is limited to one page (up to 15 records). Airport names and timezones require additional airport-info requests, usually two on a cold search, capped at six.
- Search results are cached in server memory for five minutes; airport metadata for 24 hours. Instances and restarts have separate caches. Raw provider responses are not saved to Firestore; selected flight details are saved only through the existing Save action.
- Five searches per user per minute and ten provider calls per server instance per minute reduce accidental usage. These are **not an account-wide spending cap**, particularly on Vercel with multiple instances. Use FlightAware's available account controls and monitor billing; use a shared rate limiter before wider rollout.
- Check your current FlightAware plan's endpoint prices: a search may incur both a schedules charge and airport-info charges. Additional pages can also be chargeable.

## Verification

Run `node --test tests/*.test.mjs` and `npx tsc --noEmit --incremental false`. Flight-search tests mock external services, covering timezone conversion, codeshares, autofill preservation, membership checks, caching, pagination and provider errors. They do not consume API credits. A real-account search is still needed after adding the key.

Provider documentation: [AeroAPI](https://www.flightaware.com/commercial/aeroapi/).
