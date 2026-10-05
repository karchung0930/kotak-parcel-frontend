import type { EchoLike } from '@/lib/deliveryProgress';
import { reverbOptions, sharedConnection } from '@/lib/deliveryProgress';

/**
 * The connection to Laravel Reverb, shared by the pages that show live
 * delivery progress (sharedConnection in lib/deliveryProgress.ts). It is
 * opened when a page first needs it, with Laravel Echo and pusher-js loaded
 * only then, and closed when the last page stops listening, so other pages
 * never open a WebSocket.
 *
 * The build sets where Reverb is (VITE_REVERB_* in .env). Without a key,
 * or when Echo cannot load, there is no connection and the pages keep the
 * numbers they came with.
 */
async function open(): Promise<EchoLike | null> {
    const options = reverbOptions(
        {
            VITE_REVERB_APP_KEY: import.meta.env.VITE_REVERB_APP_KEY,
            VITE_REVERB_HOST: import.meta.env.VITE_REVERB_HOST,
            VITE_REVERB_PORT: import.meta.env.VITE_REVERB_PORT,
            VITE_REVERB_SCHEME: import.meta.env.VITE_REVERB_SCHEME,
        },
        window.location.hostname,
    );

    if (!options) {
        return null;
    }

    try {
        const [{ default: Echo }, { default: Pusher }] = await Promise.all([
            import('laravel-echo'),
            import('pusher-js'),
        ]);

        return new Echo({ ...options, Pusher });
    } catch {
        return null;
    }
}

const shared = sharedConnection(open);

/**
 * Get the shared connection, opening it if no page has it yet. Each call
 * must be matched by releaseEcho().
 */
export const connectEcho = shared.connect;

/** Let go of the connection; the last page to let go closes it. */
export const releaseEcho = shared.release;
