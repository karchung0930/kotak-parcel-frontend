<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import { CircleCheck } from '@lucide/vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import PasskeyVerify from '@/components/PasskeyVerify.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

defineOptions({
    // The form starts right under the logo; the h1 is for screen readers.
    layout: {
        title: 'Log in',
        hideTitle: true,
    },
});

defineProps<{
    status?: string;
    canResetPassword: boolean;
}>();
</script>

<template>
    <Head title="Log in" />

    <Notice
        v-if="status"
        tone="success"
        :icon="CircleCheck"
        role="status"
        class="mb-6"
    >
        {{ status }}
    </Notice>

    <PasskeyVerify />

    <Form
        v-bind="store.form()"
        :reset-on-success="['password']"
        v-slot="{ errors, processing }"
        class="flex flex-col gap-6"
    >
        <div class="grid gap-5">
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
                    v-focus
                    autocomplete="email"
                    placeholder="email@example.com"
                    :aria-invalid="errors.email ? 'true' : undefined"
                    :aria-describedby="errors.email ? 'email-error' : undefined"
                />
                <InputError id="email-error" :message="errors.email" />
            </div>

            <div class="grid gap-2">
                <div class="flex items-center justify-between gap-3">
                    <Label for="password" class="font-semibold text-ink">
                        Password
                    </Label>
                    <TextLink
                        v-if="canResetPassword"
                        :href="request()"
                        class="text-sm"
                    >
                        Forgot your password?
                    </TextLink>
                </div>
                <PasswordInput
                    id="password"
                    class="h-11 text-base md:text-[15px]"
                    name="password"
                    required
                    autocomplete="current-password"
                    placeholder="Password"
                    :aria-invalid="errors.password ? 'true' : undefined"
                    :aria-describedby="
                        errors.password ? 'password-error' : undefined
                    "
                />
                <InputError id="password-error" :message="errors.password" />
            </div>

            <Label
                for="remember"
                class="flex min-h-11 items-center gap-3 font-medium text-ink-2"
            >
                <Checkbox id="remember" name="remember" class="size-5" />
                <span>Keep me logged in on this device</span>
            </Label>

            <Button
                type="submit"
                class="h-12 w-full text-[15px] font-bold"
                :disabled="processing"
                data-test="login-button"
            >
                <Spinner v-if="processing" />
                Log in
            </Button>
        </div>

        <p class="text-center text-sm text-muted-foreground">
            New to Kotak?
            <TextLink :href="register()">Create an account</TextLink>
        </p>
    </Form>
</template>
