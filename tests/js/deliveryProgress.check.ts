/**
 * A dependency-free self-check for live delivery progress
 * (resources/js/lib/deliveryProgress.ts): the line customers read, which
 * messages count, what a message means for the page, the subscription on a
 * stand-in for Laravel Echo (resyncing on every subscription, the live
 * state), the shared connection, a page's listening as it switches
 * channels, props that must not put back older numbers, and the Reverb
 * settings. It also makes sure nothing in the live updates asks the server
 * on a timer. Run it with:
 * node --experimental-strip-types --no-warnings tests/js/deliveryProgress.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    PROGRESS_EVENT,
    ReloadGuard,
    createProgressListener,
    isProgressMessage,
    readProgressMessage,
    reverbOptions,
    sharedConnection,
    stopCountText,
    subscribeToProgress,
} from '../../resources/js/lib/deliveryProgress.ts';
import type {
    ConnectionStatus,
    EchoLike,
    LiveState,
    ProgressMessage,
} from '../../resources/js/lib/deliveryProgress.ts';

type Callbacks = {
    message: ((message: unknown) => void)[];
    subscribed: (() => void)[];
    error: ((error: unknown) => void)[];
};

/**
 * A stand-in for Laravel Echo that records what the page does with it.
 * Like pusher-js, it keeps the callbacks of a channel name until the name
 * is subscribed again, even after leaving it.
 */
class FakeEcho implements EchoLike {
    status: ConnectionStatus = 'connecting';
    subscribed: { name: string; private: boolean; event: string }[] = [];
    left: string[] = [];
    disconnected = 0;
    private callbacks = new Map<string, Callbacks>();
    private watchers = new Set<(status: ConnectionStatus) => void>();

    channel(name: string) {
        return this.listenable(name, false);
    }

    private(name: string) {
        return this.listenable(name, true);
    }

    leave(name: string): void {
        this.left.push(name);
    }

    disconnect(): void {
        this.disconnected++;
    }

    connectionStatus(): ConnectionStatus {
        return this.status;
    }

    connector = {
        onConnectionChange: (callback: (status: ConnectionStatus) => void) => {
            this.watchers.add(callback);

            return () => {
                this.watchers.delete(callback);
            };
        },
    };

    /** Reverb sends a message on a channel. */
    send(name: string, message: unknown): void {
        this.on(name).message.forEach((callback) => callback(message));
    }

    /** The server confirms the subscription (the first time, or again after a reconnect). */
    confirm(name: string): void {
        this.on(name).subscribed.forEach((callback) => callback());
    }

    /** The server refuses the subscription (a private channel's sign-in). */
    refuse(name: string): void {
        this.on(name).error.forEach((callback) => callback({ status: 403 }));
    }

    /** The connection changes state; Echo reports "connected" twice (state_change and connected). */
    become(status: ConnectionStatus): void {
        this.status = status;
        const times = status === 'connected' ? 2 : 1;

        for (let i = 0; i < times; i++) {
            this.watchers.forEach((watcher) => watcher(status));
        }
    }

    get watching(): number {
        return this.watchers.size;
    }

    private on(name: string): Callbacks {
        let callbacks = this.callbacks.get(name);

        if (!callbacks) {
            callbacks = { message: [], subscribed: [], error: [] };
            this.callbacks.set(name, callbacks);
        }

        return callbacks;
    }

    private listenable(name: string, isPrivate: boolean) {
        const channel = {
            listen: (event: string, callback: (message: unknown) => void) => {
                this.subscribed.push({ name, private: isPrivate, event });
                this.on(name).message.push(callback);

                return channel;
            },
            subscribed: (callback: () => void) => {
                this.on(name).subscribed.push(callback);

                return channel;
            },
            error: (callback: (error: unknown) => void) => {
                this.on(name).error.push(callback);

                return channel;
            },
        };

        return channel;
    }
}

/** A promise with its resolve function, to settle it when the check says. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((settle) => {
        resolve = settle;
    });

    return { promise, resolve };
}

/** Let pending promise callbacks run. */
const settle = () => new Promise<void>((done) => setImmediate(done));

const onTheVan = (position: number): ProgressMessage => ({
    position,
    stops_before: position - 1,
    status: 'picked_up',
});

/** Handlers that record what a subscription tells the page. */
function recorder() {
    const seen = {
        messages: [] as ProgressMessage[],
        resyncs: 0,
        states: [] as LiveState[],
    };

    return {
        seen,
        handlers: {
            onMessage: (message: ProgressMessage) =>
                seen.messages.push(message),
            onResync: () => seen.resyncs++,
            onState: (state: LiveState) => seen.states.push(state),
        },
    };
}

const checks: [string, () => void | Promise<void>][] = [
    [
        'the line counts the stops before the parcel, and says when it is next',
        () => {
            assert.deepEqual(stopCountText({ position: 3, stops_before: 2 }), {
                title: 'Your parcel is stop 3',
                detail: '2 stops before yours',
            });
            assert.deepEqual(stopCountText({ position: 2, stops_before: 1 }), {
                title: 'Your parcel is stop 2',
                detail: '1 stop before yours',
            });
            assert.deepEqual(stopCountText({ position: 1, stops_before: 0 }), {
                title: "You're next",
                detail: 'no stops before yours',
            });
        },
    ],
    [
        'only well-formed messages count',
        () => {
            assert.ok(isProgressMessage(onTheVan(4)));
            assert.ok(
                isProgressMessage({
                    position: null,
                    stops_before: null,
                    status: 'delivered',
                }),
            );

            for (const message of [
                null,
                'picked_up',
                { position: 0, stops_before: -1, status: 'picked_up' },
                { position: 3, stops_before: 1, status: 'picked_up' },
                { position: 2.5, stops_before: 1.5, status: 'picked_up' },
                { position: '2', stops_before: '1', status: 'picked_up' },
                { position: 2, stops_before: null, status: 'picked_up' },
                { position: 2, stops_before: 1, status: 'lost' },
                { position: 2, stops_before: 1 },
            ]) {
                assert.equal(
                    isProgressMessage(message),
                    false,
                    JSON.stringify(message),
                );
            }
        },
    ],
    [
        'a new stop updates the line; a new status also fetches the page again',
        () => {
            assert.deepEqual(readProgressMessage('picked_up', onTheVan(2)), {
                progress: { position: 2, stops_before: 1 },
                reload: false,
            });
            // Picked up while the page showed it scheduled.
            assert.deepEqual(readProgressMessage('assigned', onTheVan(1)), {
                progress: { position: 1, stops_before: 0 },
                reload: true,
            });
            // Delivered: the line goes and the page moves on.
            assert.deepEqual(
                readProgressMessage('picked_up', {
                    position: null,
                    stops_before: null,
                    status: 'delivered',
                }),
                { progress: null, reload: true },
            );
        },
    ],
    [
        'the track page listens on the public channel and the order page on the private one',
        () => {
            const echo = new FakeEcho();

            subscribeToProgress(
                echo,
                { name: 'tracking.abc', private: false },
                recorder().handlers,
            );
            subscribeToProgress(
                echo,
                { name: 'orders.12', private: true },
                recorder().handlers,
            );

            assert.deepEqual(echo.subscribed, [
                { name: 'tracking.abc', private: false, event: PROGRESS_EVENT },
                { name: 'orders.12', private: true, event: PROGRESS_EVENT },
            ]);
            assert.equal(PROGRESS_EVENT, '.delivery.progress');
        },
    ],
    [
        'every subscription fetches the numbers once, the first one too, as a message may have gone by before it',
        () => {
            const echo = new FakeEcho();
            const { seen, handlers } = recorder();

            const stop = subscribeToProgress(
                echo,
                { name: 'tracking.abc', private: false },
                handlers,
            );

            // Connected, but not subscribed yet: nothing to fetch so far.
            echo.become('connected');
            assert.equal(seen.resyncs, 0);

            echo.confirm('tracking.abc');
            assert.equal(seen.resyncs, 1, 'the first subscription');

            echo.send('tracking.abc', onTheVan(3));
            echo.send('tracking.abc', { position: 3, stops_before: 9 });
            assert.deepEqual(seen.messages, [onTheVan(3)]);

            // Wi-Fi drops; Echo reconnects and pusher-js subscribes again.
            echo.become('connecting');
            echo.become('connected');
            assert.equal(seen.resyncs, 1, 'not before the subscription');
            echo.confirm('tracking.abc');
            assert.equal(seen.resyncs, 2);

            stop();
            assert.deepEqual(echo.left, ['tracking.abc']);
            assert.equal(echo.watching, 0);

            // pusher-js may still hold the channel's callbacks: they do nothing now.
            echo.confirm('tracking.abc');
            echo.send('tracking.abc', onTheVan(1));
            assert.equal(seen.resyncs, 2);
            assert.equal(seen.messages.length, 1);
        },
    ],
    [
        'the page knows when its numbers are live, and when the connection is lost or refused',
        () => {
            const echo = new FakeEcho();
            const { seen, handlers } = recorder();

            subscribeToProgress(
                echo,
                { name: 'orders.12', private: true },
                handlers,
            );
            echo.become('connected');
            echo.confirm('orders.12');
            assert.deepEqual(seen.states, ['live']);

            // A short drop that reconnects at once is not offline.
            echo.become('connecting');
            assert.deepEqual(seen.states, ['live']);
            // pusher-js gives up for now ("unavailable", which Echo calls failed).
            echo.become('failed');
            assert.deepEqual(seen.states, ['live', 'offline']);
            echo.become('connected');
            echo.confirm('orders.12');
            assert.deepEqual(seen.states, ['live', 'offline', 'live']);

            // The private channel's sign-in is refused.
            echo.refuse('orders.12');
            assert.equal(seen.states.at(-1), 'offline');

            // Joining a connection that has already failed.
            const failed = new FakeEcho();
            failed.status = 'failed';
            const late = recorder();
            subscribeToProgress(
                failed,
                { name: 'tracking.abc', private: false },
                late.handlers,
            );
            assert.deepEqual(late.seen.states, ['offline']);
        },
    ],
    [
        'the pages share one connection, closed when the last one lets go',
        async () => {
            const opened: FakeEcho[] = [];
            const shared = sharedConnection(async () => {
                const echo = new FakeEcho();
                opened.push(echo);

                return echo;
            });

            const first = await shared.connect();
            const second = await shared.connect();
            assert.equal(opened.length, 1);
            assert.equal(first, second);

            shared.release();
            await settle();
            assert.equal(opened[0].disconnected, 0, 'one page still listens');

            shared.release();
            await settle();
            assert.equal(opened[0].disconnected, 1);

            // A later page opens a new one.
            await shared.connect();
            assert.equal(opened.length, 2);

            // Letting go more often than connecting closes nothing twice.
            shared.release();
            shared.release();
            await settle();
            assert.equal(opened[1].disconnected, 1);
        },
    ],
    [
        'a connection still opening when the last page lets go is closed once it opens',
        async () => {
            const opening = deferred<EchoLike | null>();
            const shared = sharedConnection(() => opening.promise);
            const echo = new FakeEcho();

            void shared.connect();
            shared.release();
            assert.equal(echo.disconnected, 0);

            opening.resolve(echo);
            await settle();
            assert.equal(echo.disconnected, 1);

            // Without a key there is nothing to close.
            const none = sharedConnection(async () => null);
            assert.equal(await none.connect(), null);
            none.release();
            await settle();
        },
    ],
    [
        "a page's listening switches channels, stops on null, and lets go of a connection that opens too late",
        async () => {
            const echo = new FakeEcho();
            let connects = 0;
            let releases = 0;
            let opening = deferred<EchoLike | null>();
            const { seen, handlers } = recorder();
            const listener = createProgressListener({
                connect: () => {
                    connects++;

                    return opening.promise;
                },
                release: () => releases++,
                ...handlers,
            });

            // The page moves on (null: delivered) before the connection opens.
            const first = listener.listen({
                name: 'tracking.abc',
                private: false,
            });
            void listener.listen(null);
            opening.resolve(echo);
            await first;
            assert.deepEqual([connects, releases], [1, 1]);
            assert.deepEqual(echo.subscribed, []);

            // On a channel, then off it: it leaves and lets go once.
            opening = deferred<EchoLike | null>();
            opening.resolve(echo);
            await listener.listen({ name: 'tracking.abc', private: false });
            assert.equal(echo.subscribed.length, 1);
            assert.equal(seen.states.at(-1), 'connecting');

            await listener.listen({ name: 'orders.12', private: true });
            assert.deepEqual(echo.left, ['tracking.abc']);
            assert.deepEqual([connects, releases], [3, 2]);

            await listener.listen(null);
            assert.deepEqual(echo.left, ['tracking.abc', 'orders.12']);
            assert.deepEqual([connects, releases], [3, 3]);

            // Unmounting while the connection opens.
            opening = deferred<EchoLike | null>();
            const pending = listener.listen({
                name: 'tracking.abc',
                private: false,
            });
            listener.stop();
            opening.resolve(echo);
            await pending;
            assert.deepEqual([connects, releases], [4, 4]);
            assert.equal(echo.subscribed.length, 2);

            // No connection (no key, or Echo could not load): offline.
            opening = deferred<EchoLike | null>();
            opening.resolve(null);
            await listener.listen({ name: 'tracking.abc', private: false });
            assert.deepEqual([connects, releases], [5, 5]);
            assert.equal(seen.states.at(-1), 'offline');
        },
    ],
    [
        'props fetched while a message arrived never put back older numbers, and are fetched once more',
        () => {
            const guard = new ReloadGuard();

            // Nothing in between: the props take over.
            const quiet = guard.start();
            assert.equal(guard.acceptsProps(), true);
            assert.equal(guard.finish(quiet, false), false);

            // A message arrives while the reload runs: its numbers stay, and
            // the reload runs once more.
            const raced = guard.start();
            guard.message();
            assert.equal(guard.acceptsProps(), false);
            assert.equal(guard.finish(raced, false), true);

            const again = guard.start();
            assert.equal(guard.acceptsProps(), true);
            assert.equal(guard.finish(again, false), false);

            // A reload begun after the message is still running: no extra one.
            const older = guard.start();
            guard.message();
            const newer = guard.start();
            assert.equal(guard.acceptsProps(), false);
            assert.equal(guard.finish(older, false), false);
            assert.equal(guard.acceptsProps(), true);
            assert.equal(guard.finish(newer, false), false);

            // A cancelled reload gives way to the visit that cancelled it.
            const cancelled = guard.start();
            guard.message();
            assert.equal(guard.finish(cancelled, true), false);
            assert.equal(guard.acceptsProps(), true);

            // Props from another visit while no reload runs take over.
            guard.message();
            assert.equal(guard.acceptsProps(), true);
        },
    ],
    [
        'the build settings give a WebSocket-only connection, or none without a key',
        () => {
            assert.equal(reverbOptions({}, 'kotak.example.com'), null);
            assert.equal(
                reverbOptions(
                    { VITE_REVERB_APP_KEY: '  ' },
                    'kotak.example.com',
                ),
                null,
            );

            assert.deepEqual(
                reverbOptions(
                    { VITE_REVERB_APP_KEY: 'live-key' },
                    'kotak.example.com',
                ),
                {
                    broadcaster: 'reverb',
                    key: 'live-key',
                    wsHost: 'kotak.example.com',
                    wsPort: 443,
                    wssPort: 443,
                    forceTLS: true,
                    enabledTransports: ['ws', 'wss'],
                    withoutInterceptors: true,
                },
            );

            const local = reverbOptions(
                {
                    VITE_REVERB_APP_KEY: 'kotak-local-key',
                    VITE_REVERB_HOST: 'localhost',
                    VITE_REVERB_PORT: '8080',
                    VITE_REVERB_SCHEME: 'http',
                },
                '127.0.0.1',
            );
            assert.equal(local?.wsHost, 'localhost');
            assert.equal(local?.wsPort, 8080);
            assert.equal(local?.forceTLS, false);
        },
    ],
    [
        'nothing in the live updates asks the server on a timer',
        () => {
            for (const file of [
                'lib/deliveryProgress.ts',
                'lib/echo.ts',
                'composables/useDeliveryProgress.ts',
                'components/StopCount.vue',
            ]) {
                const source = readFileSync(
                    new URL(`../../resources/js/${file}`, import.meta.url),
                    'utf8',
                );

                for (const timer of ['setInterval', 'setTimeout', 'usePoll']) {
                    assert.equal(
                        source.includes(timer),
                        false,
                        `${timer} in ${file}`,
                    );
                }
            }
        },
    ],
];

let failed = 0;

for (const [name, check] of checks) {
    try {
        await check();
        console.log(`  ok  ${name}`);
    } catch (error) {
        failed++;
        console.error(`  FAIL ${name}\n${String(error)}`);
    }
}

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log(`\nAll ${checks.length} delivery progress checks passed.`);
}
