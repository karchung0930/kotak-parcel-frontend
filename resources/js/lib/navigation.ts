import {
    Building2,
    ClipboardList,
    Package,
    PackagePlus,
    Route,
    Settings,
    SlidersHorizontal,
    Store,
    Tags,
    Truck,
    Users,
} from '@lucide/vue';
import { index as adminBranches } from '@/routes/admin/branches';
import { index as adminOrders } from '@/routes/admin/orders';
import { index as adminRates } from '@/routes/admin/rates';
import { edit as adminSettings } from '@/routes/admin/settings';
import { index as adminUsers } from '@/routes/admin/users';
import { dispatch } from '@/routes/admin';
import { index as branchesIndex } from '@/routes/branches';
import { jobs } from '@/routes/driver';
import { create as createOrder, index as myOrders } from '@/routes/orders';
import { edit as editProfile } from '@/routes/profile';
import { pricing, track } from '@/routes';
import { counter } from '@/routes/staff';
import { toUrl } from '@/lib/utils';
import type { NavItem, RoleValue, User } from '@/types';

/**
 * Whether "Send a parcel" makes sense for this visitor. The order form is
 * for customers only; guests are asked to log in or sign up first. Staff,
 * drivers and admins would get a 403, so their links are hidden.
 */
export function canSendParcels(user: User | null): boolean {
    return !user || user.role.value === 'customer';
}

/** The public site's main navigation. */
export function publicNav(user: User | null = null): NavItem[] {
    return [
        ...(canSendParcels(user)
            ? [{ title: 'Send a parcel', href: createOrder() }]
            : []),
        { title: 'Track', href: track() },
        { title: 'Branches', href: branchesIndex() },
        { title: 'Pricing', href: pricing() },
    ];
}

/** The customer account tabs (CustomerLayout). */
export function customerNav(): NavItem[] {
    return [
        { title: 'My parcels', href: myOrders(), icon: Package },
        { title: 'Send a parcel', href: createOrder(), icon: PackagePlus },
        { title: 'Settings', href: editProfile(), icon: Settings },
    ];
}

export type NavGroup = {
    label: string;
    items: NavItem[];
};

/** The console sidebar for staff, admins and drivers. */
export function consoleNav(role: RoleValue): NavGroup[] {
    const account: NavGroup = {
        label: 'Account',
        items: [{ title: 'Settings', href: editProfile(), icon: Settings }],
    };

    switch (role) {
        case 'admin':
            return [
                {
                    label: 'Operations',
                    items: [
                        { title: 'Dispatch', href: dispatch(), icon: Truck },
                        {
                            title: 'Drop-off counter',
                            href: counter(),
                            icon: Store,
                        },
                        {
                            title: 'Orders',
                            href: adminOrders(),
                            icon: ClipboardList,
                        },
                    ],
                },
                {
                    label: 'Manage',
                    items: [
                        { title: 'Users', href: adminUsers(), icon: Users },
                        {
                            title: 'Branches',
                            href: adminBranches(),
                            icon: Building2,
                        },
                        { title: 'Rates', href: adminRates(), icon: Tags },
                        {
                            title: 'Site settings',
                            href: adminSettings(),
                            icon: SlidersHorizontal,
                        },
                    ],
                },
                account,
            ];
        case 'staff':
            return [
                {
                    label: 'Operations',
                    items: [
                        {
                            title: 'Drop-off counter',
                            href: counter(),
                            icon: Store,
                        },
                    ],
                },
                account,
            ];
        case 'driver':
            return [
                {
                    label: 'Deliveries',
                    items: [{ title: 'My jobs', href: jobs(), icon: Route }],
                },
                account,
            ];
        default:
            return [{ label: 'Account', items: customerNav() }];
    }
}

/** Where each role starts: the first link of its menus. */
export function roleHome(role: RoleValue): NavItem {
    switch (role) {
        case 'admin':
            return { title: 'Dispatch', href: dispatch(), icon: Truck };
        case 'staff':
            return { title: 'Drop-off counter', href: counter(), icon: Store };
        case 'driver':
            return { title: 'My jobs', href: jobs(), icon: Route };
        default:
            return { title: 'My parcels', href: myOrders(), icon: Package };
    }
}

/**
 * Whether a menu link belongs to the page at `currentUrl` (a pathname).
 * A link covers its own page and the pages under it; the counter covers
 * every /staff page (parcel and receipt screens), Settings covers every
 * settings page, and "Send a parcel" only its own form.
 */
export function isNavActive(
    href: NavItem['href'],
    currentUrl: string,
): boolean {
    const url = toUrl(href);
    const parent = (path: string): string =>
        path.slice(0, path.lastIndexOf('/'));
    const within = (path: string): boolean =>
        currentUrl === path || currentUrl.startsWith(`${path}/`);
    const createUrl = toUrl(createOrder());

    if (url === createUrl) {
        return currentUrl === createUrl;
    }

    if (url === toUrl(counter()) || url === toUrl(editProfile())) {
        return within(parent(url));
    }

    return within(url) && currentUrl !== createUrl;
}
