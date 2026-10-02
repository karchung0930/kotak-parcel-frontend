import { onBeforeUnmount, onMounted, readonly, shallowRef } from 'vue';
import type { Ref } from 'vue';

/**
 * Whether an element is on screen, for pausing decorative animation while
 * it is scrolled away (animation-play-state: paused).
 *
 * It stays false until the page is mounted in the browser, so the server
 * render and the first browser render match. Browsers without
 * IntersectionObserver always report true.
 */
export function useInView(
    target: Readonly<Ref<Element | null | undefined>>,
): Readonly<Ref<boolean>> {
    const inView = shallowRef(false);
    let observer: IntersectionObserver | undefined;

    onMounted(() => {
        const element = target.value;

        if (!element) {
            return;
        }

        if (typeof IntersectionObserver === 'undefined') {
            inView.value = true;

            return;
        }

        // Entries come in time order; the last one is the current state.
        observer = new IntersectionObserver((entries) => {
            inView.value = entries.at(-1)?.isIntersecting ?? inView.value;
        });
        observer.observe(element);
    });

    onBeforeUnmount(() => observer?.disconnect());

    return readonly(inView);
}
