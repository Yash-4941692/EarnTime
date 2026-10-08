/** Service-worker entry point. Listeners are registered synchronously at top level, as MV3 requires. */

import { IDLE_DETECTION_S, TICK_ALARM, TICK_PERIOD_MIN } from '../core/constants';
import { createChromeApi } from './chromeApi';
import { createController } from './controller';
import { attachEvents, type ChromeEvents } from './events';

const api = createChromeApi(chrome);
const controller = createController({
  api,
  clock: () => Date.now(),
  mono: () => performance.now(),
});

attachEvents(chrome as unknown as ChromeEvents, controller);

// Re-established on every worker start: the interval is not guaranteed to survive a browser restart.
api.idle.setDetectionInterval(IDLE_DETECTION_S);
api
  .alarms.get(TICK_ALARM)
  .then((existing) => {
    if (!existing) return api.alarms.create(TICK_ALARM, TICK_PERIOD_MIN);
    return undefined;
  })
  .catch((err: unknown) => console.warn('[EarnTime] alarm setup failed', err));
