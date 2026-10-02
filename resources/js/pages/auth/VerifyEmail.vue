<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import { Mail, MailCheck } from '@lucide/vue';
import Notice from '@/components/Notice.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

defineOptions({
    layout: {
        title: 'Check your email',
        description: 'Open the link we emailed you to finish signing up.',
    },
});

defineProps<{
    status?: string;
}>();
</script>

<template>
    <Head title="Email verification" />

    <Notice
        v-if="status === 'verification-link-sent'"
        tone="success"
        :icon="MailCheck"
        role="status"
        class="mb-6"
    >
        A new verification link is on its way to the email address you signed up
        with.
    </Notice>

    <div class="flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5">
        <span
            class="flex size-9 flex-none items-center justify-center rounded-lg bg-white text-brand"
        >
            <Mail aria-hidden="true" class="size-[18px]" />
        </span>
        <p class="text-[13px] leading-5 text-ink-2">
            Can't find it? Check your spam or promotions folder. Links expire
            after a while, so you can ask for a new one below.
        </p>
    </div>

    <Form
        v-bind="send.form()"
        class="mt-6 space-y-5 text-center"
        v-slot="{ processing }"
    >
        <Button
            :disabled="processing"
            variant="secondary"
            class="h-12 w-full text-[15px] font-bold"
        >
            <Spinner v-if="processing" />
            Send a new link
        </Button>

        <TextLink :href="logout()" as="button" class="mx-auto block text-sm">
            Log out
        </TextLink>
    </Form>
</template>
