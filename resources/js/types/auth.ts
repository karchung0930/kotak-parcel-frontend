import type { Option, RoleValue } from '@/types/domain';

/** The signed-in user shared with every page by HandleInertiaRequests. */
export type User = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    avatar?: string;
    email_verified_at: string | null;
    role: Option<RoleValue>;
    branch_name: string | null;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorConfigContent = {
    title: string;
    description: string;
    buttonText: string;
};
