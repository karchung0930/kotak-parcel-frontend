<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { store } from '@/routes/register';

defineProps<{
    passwordRules: string;
}>();

defineOptions({
    // The form starts right under the logo; the h1 is for screen readers.
    layout: {
        title: 'Create an account',
        hideTitle: true,
    },
});

/** aria-describedby for a field: its error message, when it has one. */
function describedBy(
    error: string | undefined,
    field: string,
): string | undefined {
    return error ? `${field}-error` : undefined;
}
</script>

<template>
    <Head title="Create an account" />

    <Form
        v-bind="store.form()"
        :reset-on-success="['password', 'password_confirmation']"
        v-slot="{ errors, processing, clearErrors }"
        class="flex flex-col gap-6"
    >
        <div class="grid gap-5">
            <div class="grid gap-2">
                <Label for="name" class="font-semibold text-ink">
                    Full name
                </Label>
                <Input
                    id="name"
                    class="h-11 text-base md:text-[15px]"
                    type="text"
                    name="name"
                    required
                    v-focus
                    autocomplete="name"
                    placeholder="e.g. Nur Aisyah binti Ahmad"
                    :aria-invalid="errors.name ? 'true' : undefined"
                    :aria-describedby="describedBy(errors.name, 'name')"
                />
                <InputError id="name-error" :message="errors.name" />
            </div>

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
                    placeholder="email@example.com"
                    :aria-invalid="errors.email ? 'true' : undefined"
                    :aria-describedby="describedBy(errors.email, 'email')"
                />
                <InputError id="email-error" :message="errors.email" />
            </div>

            <div class="grid gap-2">
                <Label for="phone" class="font-semibold text-ink">
                    Mobile number
                </Label>
                <PhoneInput
                    id="phone"
                    name="phone"
                    kind="mobile"
                    required
                    :error="errors.phone"
                    @update:model-value="clearErrors('phone')"
                />
            </div>

            <div class="grid gap-2">
                <Label for="password" class="font-semibold text-ink">
                    Password
                </Label>
                <PasswordInput
                    id="password"
                    class="h-11 text-base md:text-[15px]"
                    name="password"
                    required
                    autocomplete="new-password"
                    placeholder="Password"
                    :passwordrules="passwordRules"
                    :aria-invalid="errors.password ? 'true' : undefined"
                    :aria-describedby="describedBy(errors.password, 'password')"
                />
                <InputError id="password-error" :message="errors.password" />
            </div>

            <div class="grid gap-2">
                <Label
                    for="password_confirmation"
                    class="font-semibold text-ink"
                >
                    Confirm password
                </Label>
                <PasswordInput
                    id="password_confirmation"
                    class="h-11 text-base md:text-[15px]"
                    name="password_confirmation"
                    required
                    autocomplete="new-password"
                    placeholder="Type the password again"
                    :passwordrules="passwordRules"
                    :aria-invalid="
                        errors.password_confirmation ? 'true' : undefined
                    "
                    :aria-describedby="
                        describedBy(
                            errors.password_confirmation,
                            'password_confirmation',
                        )
                    "
                />
                <InputError
                    id="password_confirmation-error"
                    :message="errors.password_confirmation"
                />
            </div>

            <Button
                type="submit"
                class="mt-1 h-12 w-full text-[15px] font-bold"
                :disabled="processing"
                data-test="register-user-button"
            >
                <Spinner v-if="processing" />
                Create account
            </Button>
        </div>

        <p class="text-center text-sm text-muted-foreground">
            Already have an account?
            <TextLink :href="login()">Log in</TextLink>
        </p>
    </Form>
</template>
