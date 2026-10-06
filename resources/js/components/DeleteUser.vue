<script setup lang="ts">
import { Form } from '@inertiajs/vue3';
import { useTemplateRef } from 'vue';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import FormSection from '@/components/admin/FormSection.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const passwordInput = useTemplateRef('passwordInput');
</script>

<template>
    <!-- A card like the others: the button that opens the dialog sits at
         the top right; the step that cannot be undone is the dialog's own
         button. -->
    <FormSection
        title="Delete account"
        description="Delete your account and all of its resources. This cannot be undone."
    >
        <template #actions>
            <Dialog>
                <!-- Only opens the dialog, so a plain outline button; the
                     step that cannot be undone is the dialog's own button. -->
                <DialogTrigger as-child>
                    <Button
                        variant="outline"
                        class="h-11 rounded-lg px-5 text-[15px] font-bold"
                        data-test="delete-user-button"
                        >Delete account</Button
                    >
                </DialogTrigger>
                <DialogContent>
                    <Form
                        v-bind="ProfileController.destroy.form()"
                        reset-on-success
                        @error="() => passwordInput?.focus()"
                        :options="{
                            preserveScroll: true,
                        }"
                        class="space-y-6"
                        v-slot="{ errors, processing, reset, clearErrors }"
                    >
                        <DialogHeader class="space-y-3">
                            <!-- Room for the close button on the right, and
                                 as much on the left on phones, where the
                                 title is centred. -->
                            <DialogTitle class="px-12 sm:pl-0"
                                >Are you sure you want to delete your
                                account?</DialogTitle
                            >
                            <DialogDescription>
                                Once your account is deleted, all of its
                                resources and data will also be permanently
                                deleted. Please enter your password to confirm
                                you would like to permanently delete your
                                account.
                            </DialogDescription>
                        </DialogHeader>

                        <div class="grid gap-2">
                            <Label for="password" class="sr-only"
                                >Password</Label
                            >
                            <PasswordInput
                                id="password"
                                name="password"
                                ref="passwordInput"
                                placeholder="Password"
                                class="h-11 text-base md:text-[15px]"
                            />
                            <InputError :message="errors.password" />
                        </div>

                        <!-- Cancel is a plain outline button; deleting
                             cannot be undone, so it is caution yellow. -->
                        <DialogFooter>
                            <DialogClose as-child>
                                <Button
                                    variant="outline"
                                    class="h-11 px-5 font-bold"
                                    @click="
                                        () => {
                                            clearErrors();
                                            reset();
                                        }
                                    "
                                >
                                    Cancel
                                </Button>
                            </DialogClose>

                            <Button
                                type="submit"
                                variant="warning"
                                class="h-11 px-5 font-bold"
                                :disabled="processing"
                                data-test="confirm-delete-user-button"
                            >
                                Delete account
                            </Button>
                        </DialogFooter>
                    </Form>
                </DialogContent>
            </Dialog>
        </template>
    </FormSection>
</template>
