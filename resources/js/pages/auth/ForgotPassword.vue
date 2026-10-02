<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import { ArrowLeft, MailCheck } from '@lucide/vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

defineOptions({
    layout: {
        title: 'Forgot your password?',
        description: 'We will email you a link to choose a new password.',
    },
});

defineProps<{
    status?: string;
}>();
</script>

<template>
    <Head title="Forgot password" />

    <Notice
        v-if="status"
        tone="success"
        :icon="MailCheck"
        role="status"
        class="mb-6"
    >
        {{ status }}
    </Notice>

    <div class="space-y-6">
        <Form
            v-bind="email.form()"
            v-slot="{ errors, processing }"
            class="grid gap-6"
        >
            <div class="grid gap-2">
                <Label for="email" class="font-semibold text-ink">
                    Email address
                </Label>
                <Input
                    id="email"
                    class="h-11 text-base md:text-[15px]"
                    type="email"
                    name="email"
                    required
                    autocomplete="email"
                    v-focus
                    placeholder="email@example.com"
                    :aria-invalid="errors.email ? 'true' : undefined"
                    :aria-describedby="errors.email ? 'email-error' : undefined"
                />
                <InputError id="email-error" :message="errors.email" />
            </div>

            <Button
                class="h-12 w-full text-[15px] font-bold"
                :disabled="processing"
                data-test="email-password-reset-link-button"
            >
                <Spinner v-if="processing" />
                Email me a reset link
            </Button>
        </Form>

        <p
            class="flex items-center justify-center gap-1.5 text-sm text-muted-foreground"
        >
            <ArrowLeft aria-hidden="true" class="size-4" />
            <span>Remembered it?</span>
            <TextLink :href="login()">Back to log in</TextLink>
        </p>
    </div>
</template>
