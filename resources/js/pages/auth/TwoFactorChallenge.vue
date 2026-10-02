<script setup lang="ts">
import { Form, Head, setLayoutProps } from '@inertiajs/vue3';
import { computed, ref, watchEffect } from 'vue';
import InputError from '@/components/InputError.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/two-factor/login';
import type { TwoFactorConfigContent } from '@/types';

const showRecoveryInput = ref<boolean>(false);
const code = ref<string>('');

const authConfigContent = computed<TwoFactorConfigContent>(() => {
    if (showRecoveryInput.value) {
        return {
            title: 'Use a recovery code',
            description: 'Enter one of the recovery codes you saved.',
            buttonText: 'use a code from your authenticator app',
        };
    }

    return {
        title: 'Enter your authentication code',
        description: 'Enter the 6-digit code from your authenticator app.',
        buttonText: 'use a recovery code',
    };
});

watchEffect(() => {
    setLayoutProps({
        title: authConfigContent.value.title,
        description: authConfigContent.value.description,
    });
});

const toggleRecoveryMode = (clearErrors: () => void): void => {
    showRecoveryInput.value = !showRecoveryInput.value;
    clearErrors();
    code.value = '';
};
</script>

<template>
    <Head title="Two-factor authentication" />

    <div class="space-y-6">
        <template v-if="!showRecoveryInput">
            <Form
                v-bind="store.form()"
                class="space-y-5"
                reset-on-error
                @error="code = ''"
                #default="{ errors, processing, clearErrors }"
            >
                <input type="hidden" name="code" :value="code" />
                <div class="flex flex-col items-center gap-3 text-center">
                    <Label for="otp" class="sr-only">Authentication code</Label>
                    <div class="flex w-full items-center justify-center">
                        <InputOTP
                            id="otp"
                            v-model="code"
                            :maxlength="6"
                            :disabled="processing"
                            autofocus
                        >
                            <InputOTPGroup>
                                <InputOTPSlot
                                    v-for="index in 6"
                                    :key="index"
                                    :index="index - 1"
                                    class="size-12 text-lg font-bold"
                                />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                    <InputError :message="errors.code" />
                </div>
                <Button
                    type="submit"
                    class="h-12 w-full text-[15px] font-bold"
                    :disabled="processing"
                >
                    <Spinner v-if="processing" />
                    Continue
                </Button>
                <p class="text-center text-sm text-muted-foreground">
                    <span>Lost your phone? You can </span>
                    <button
                        type="button"
                        class="font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 transition-colors hover:text-brand-deep hover:decoration-current"
                        @click="() => toggleRecoveryMode(clearErrors)"
                    >
                        {{ authConfigContent.buttonText }}
                    </button>
                </p>
            </Form>
        </template>

        <template v-else>
            <Form
                v-bind="store.form()"
                class="space-y-5"
                reset-on-error
                #default="{ errors, processing, clearErrors }"
            >
                <div class="grid gap-2">
                    <Label for="recovery_code" class="font-semibold text-ink">
                        Recovery code
                    </Label>
                    <Input
                        id="recovery_code"
                        class="h-11 font-mono text-base md:text-[15px]"
                        name="recovery_code"
                        type="text"
                        autocomplete="one-time-code"
                        spellcheck="false"
                        placeholder="xxxxxxxxxx-xxxxxxxxxx"
                        v-focus
                        required
                        :aria-invalid="
                            errors.recovery_code ? 'true' : undefined
                        "
                        :aria-describedby="
                            errors.recovery_code
                                ? 'recovery_code-error'
                                : undefined
                        "
                    />
                    <InputError
                        id="recovery_code-error"
                        :message="errors.recovery_code"
                    />
                </div>
                <Button
                    type="submit"
                    class="h-12 w-full text-[15px] font-bold"
                    :disabled="processing"
                >
                    <Spinner v-if="processing" />
                    Continue
                </Button>

                <p class="text-center text-sm text-muted-foreground">
                    <span>Found your phone? You can </span>
                    <button
                        type="button"
                        class="font-semibold text-brand-strong underline decoration-brand-edge underline-offset-4 transition-colors hover:text-brand-deep hover:decoration-current"
                        @click="() => toggleRecoveryMode(clearErrors)"
                    >
                        {{ authConfigContent.buttonText }}
                    </button>
                </p>
            </Form>
        </template>
    </div>
</template>
