/**
 * Live delivery progress: how many stops the driver makes before a parcel
 * out for delivery, kept up to date over Laravel Reverb.
 *
 * A page gets the numbers with its props, then listens on the parcel's own
 * channel, where the backend sends App\Events\DeliveryProgressUpdated each
 * time the parcel's stop or status changes. There is no polling: the
 * connection reconnects by itself, and each time the channel is subscribed
 * (the first time, and again after a lost connection comes back) the page
 * asks the server for the current numbers once, as a message may have gone
 * by before the subscription was in place.
 *
 * Plain TypeScript without Vue or Echo, so tests/js checks it on Node; the
 * connection is opened in lib/echo.ts and the page side is
 * composables/useDeliveryProgress.ts.
 */
import type { OrderStatusValue, StopProgress } from '@/types';

/** The message on the channel: the stop (none off the van) and the status. */
export type ProgressMessage = {
    position: number | null;
    stops_before: number | null;
    status: OrderStatusValue;
};

/** Where a page listens: the public channel, or the customer's private one. */
export type ProgressChannel = {
    name: string;
    private: boolean;
};

/** Laravel Echo's connection states (pusher-js's "unavailable" is "failed"). */
export type ConnectionStatus =
    | 'connected'
    | 'disconnected'
    | 'connecting'
    | 'reconnecting'
    | 'failed';

/**
 * Whether the numbers on the page are live: "connecting" until the first
 * subscription, "live" once subscribed, and "offline" when the connection
 * has failed or closed (pusher-js gives up on a connection after about ten
 * seconds), the channel refused the page, or there is no connection at all.
 * A short drop that reconnects at once never shows as offline.
 */
export type LiveState = 'connecting' | 'live' | 'offline';

/** The event's name on the channel (broadcastAs), with Echo's dot for a name of its own. */
export const PROGRESS_EVENT = '.delivery.progress';

const STATUSES: readonly OrderStatusValue[] = [
    'created',
    'dropped_off',
    'paid',
    'assigned',
    'picked_up',
    'delivered',
    'delivery_failed',
    'returned_to_sender',
    'cancelled',
];

/** The line the customer reads: "Your parcel is stop 3 — 2 stops before yours". */
export function stopCountText(progress: StopProgress): {
    title: string;
    detail: string;
} {
    if (progress.stops_before === 0) {
        return {
            title: "You're next",
            detail: 'no stops before yours',
        };
    }

    return {
        title: `Your parcel is stop ${progress.position}`,
        // A no-break space keeps the number with its word.
        detail: `${progress.stops_before} ${progress.stops_before === 1 ? 'stop' : 'stops'} before yours`,
    };
}

function isCount(value: unknown, min: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= min;
}

/** Whether a message from the channel has the expected shape. */
export function isProgressMessage(value: unknown): value is ProgressMessage {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const message = value as Record<string, unknown>;
    const onTheVan =
        isCount(message.position, 1) &&
        isCount(message.stops_before, 0) &&
        message.stops_before === message.position - 1;
    const offTheVan =
        message.position === null && message.stops_before === null;

    return (
        STATUSES.includes(message.status as OrderStatusValue) &&
        (onTheVan || offTheVan)
    );
}

/**
 * What a message means for a page showing the parcel in a status: the stop
 * to show (only while it is on the van), and whether the page should ask
 * the server for the rest of the parcel again, as its status moved on.
 */
export function readProgressMessage(
    shownStatus: OrderStatusValue,
    message: ProgressMessage,
): { progress: StopProgress | null; reload: boolean } {
    const progress =
        message.status === 'picked_up' &&
        message.position !== null &&
        message.stops_before !== null
            ? { position: message.position, stops_before: message.stops_before }
            : null;

    return { progress, reload: message.status !== shownStatus };
}

/** A channel the page listens on (Echo's PusherChannel). */
export interface ListenableChannel {
    listen(event: string, callback: (message: unknown) => void): unknown;
    /** Runs each time the subscription succeeds: the first and every one after a reconnect. */
    subscribed(callback: () => void): unknown;
    /** Runs when the server refuses the subscription (a private channel's sign-in). */
    error(callback: (error: unknown) => void): unknown;
}

/** The part of Laravel Echo a subscription uses. */
export interface EchoLike {
    channel(name: string): ListenableChannel;
    private(name: string): ListenableChannel;
    leave(name: string): void;
    disconnect(): void;
    connectionStatus(): ConnectionStatus;
    connector: {
        onConnectionChange(
            callback: (status: ConnectionStatus) => void,
        ): () => void;
    };
}

/** What a subscription tells the page. */
export type ProgressHandlers = {
    /** A well-formed message arrived. */
    onMessage: (message: ProgressMessage) => void;
    /** The channel is subscribed (again): fetch the current numbers once. */
    onResync: () => void;
    /** Whether the numbers are live changed. */
    onState: (state: LiveState) => void;
};

/**
 * Listen to a parcel's channel. Each well-formed message goes to
 * onMessage. Each successful subscription, the first one and each one
 * after a reconnect, calls onResync once: pusher-js only confirms a
 * subscription after the server has it, and a message sent before then
 * never reaches the page. Returns the function that stops listening, after
 * which no handler runs again.
 */
export function subscribeToProgress(
    echo: EchoLike,
    channel: ProgressChannel,
    handlers: ProgressHandlers,
): () => void {
    let active = true;
    // pusher-js keeps a channel it is still subscribing to, with its
    // callbacks, for a page that subscribes to it again: callbacks of a
    // page that stopped listening must do nothing.
    const whileActive =
        <T extends unknown[]>(callback: (...args: T) => void) =>
        (...args: T): void => {
            if (active) {
                callback(...args);
            }
        };

    const source = channel.private
        ? echo.private(channel.name)
        : echo.channel(channel.name);

    source.listen(
        PROGRESS_EVENT,
        whileActive((message: unknown) => {
            if (isProgressMessage(message)) {
                handlers.onMessage(message);
            }
        }),
    );
    source.subscribed(
        whileActive(() => {
            handlers.onState('live');
            handlers.onResync();
        }),
    );
    source.error(whileActive(() => handlers.onState('offline')));

    const offline = (status: ConnectionStatus): boolean =>
        status === 'failed' || status === 'disconnected';

    if (offline(echo.connectionStatus())) {
        handlers.onState('offline');
    }

    const stopWatching = echo.connector.onConnectionChange(
        whileActive((status: ConnectionStatus) => {
            if (offline(status)) {
                handlers.onState('offline');
            }
        }),
    );

    return () => {
        active = false;
        stopWatching();
        echo.leave(channel.name);
    };
}

/**
 * One connection shared by every page that listens, opened by the first
 * and closed when the last one lets go. Each connect() must be matched by
 * a release(); a connection still opening when the last page lets go is
 * closed as soon as it opens.
 */
export function sharedConnection(open: () => Promise<EchoLike | null>): {
    connect: () => Promise<EchoLike | null>;
    release: () => void;
} {
    let connection: Promise<EchoLike | null> | null = null;
    let users = 0;

    return {
        connect() {
            users++;
            connection ??= open();

            return connection;
        },
        release() {
            users = Math.max(0, users - 1);

            if (users > 0 || !connection) {
                return;
            }

            const closing = connection;
            connection = null;

            void closing.then((echo) => echo?.disconnect());
        },
    };
}

/**
 * A page's listening: on one channel at a time, switched with listen()
 * (null to stop) and ended with stop(). Each channel takes the shared
 * connection and gives it back when the page moves on, and a connection
 * that opens after the page has moved on is given back unused.
 */
export function createProgressListener(
    options: {
        connect: () => Promise<EchoLike | null>;
        release: () => void;
    } & ProgressHandlers,
): {
    listen: (channel: ProgressChannel | null) => Promise<void>;
    stop: () => void;
} {
    let stopListening: (() => void) | null = null;
    // Each call gets a number, so an older one still waiting for the
    // connection knows it is no longer wanted.
    let attempt = 0;

    function leave(): void {
        if (stopListening) {
            stopListening();
            stopListening = null;
            options.release();
        }
    }

    async function listen(channel: ProgressChannel | null): Promise<void> {
        const current = ++attempt;
        leave();

        if (!channel) {
            return;
        }

        options.onState('connecting');
        const echo = await options.connect();

        if (current !== attempt) {
            options.release();

            return;
        }

        if (!echo) {
            options.release();
            options.onState('offline');

            return;
        }

        stopListening = subscribeToProgress(echo, channel, options);
    }

    function stop(): void {
        attempt++;
        leave();
    }

    return { listen, stop };
}

/**
 * Keeps a page's fetched props from putting back numbers older than a
 * message it already shows.
 *
 * A reload reads the database some time after it starts. A message that
 * arrives while it runs may be newer than what it read, or older: the order
 * cannot be told. The message's numbers are kept then, as they are at least
 * as new as the moment they were sent, and anything newer brings its own
 * message. The reload's other props may be older too, so it runs once more
 * when it finishes, unless a reload begun after the last message is still
 * running.
 */
export class ReloadGuard {
    private received = 0;

    private next = 0;

    /** The running reloads, with the number of messages received when each began. */
    private running = new Map<number, number>();

    /** A message arrived. */
    message(): void {
        this.received++;
    }

    /** A reload begins; returns its id for finish(). */
    start(): number {
        const id = ++this.next;
        this.running.set(id, this.received);

        return id;
    }

    /** Whether props that just arrived may replace the numbers shown. */
    acceptsProps(): boolean {
        return [...this.running.values()].every(
            (began) => began === this.received,
        );
    }

    /**
     * A reload finished, or was cancelled by another visit. Returns whether
     * to reload once more: a message arrived while it ran, and no reload
     * begun since the last message is still running.
     */
    finish(id: number, cancelled: boolean): boolean {
        const began = this.running.get(id);
        this.running.delete(id);

        if (began === undefined || cancelled || began === this.received) {
            return false;
        }

        return ![...this.running.values()].some(
            (other) => other === this.received,
        );
    }
}

/** The build's Reverb settings (VITE_REVERB_* in the frontend's .env). */
export type ReverbEnv = {
    VITE_REVERB_APP_KEY?: string;
    VITE_REVERB_HOST?: string;
    VITE_REVERB_PORT?: string;
    VITE_REVERB_SCHEME?: string;
};

/**
 * Echo's options for Reverb from the build's settings, or null when the
 * build has no key: the pages then show the numbers they came with.
 * Without a host the page's own is used, as nginx passes the WebSocket on
 * to Reverb behind the site's address.
 */
export function reverbOptions(env: ReverbEnv, pageHost: string) {
    const key = env.VITE_REVERB_APP_KEY?.trim();

    if (!key) {
        return null;
    }

    const tls = env.VITE_REVERB_SCHEME?.trim() !== 'http';
    const port = Number(env.VITE_REVERB_PORT) || (tls ? 443 : 80);

    return {
        broadcaster: 'reverb' as const,
        key,
        wsHost: env.VITE_REVERB_HOST?.trim() || pageHost,
        wsPort: port,
        wssPort: port,
        forceTLS: tls,
        // WebSockets only: never a fallback to asking over HTTP.
        enabledTransports: ['ws' as const, 'wss' as const],
        // Inertia's requests need no socket id header.
        withoutInterceptors: true,
    };
}
