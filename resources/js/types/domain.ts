/**
 * Types for the data the server sends to Vue pages. They mirror the Laravel
 * API Resources in app/Http/Resources exactly.
 *
 * Conventions:
 * - Money is an integer in sen (RM 1.00 = 100).
 * - Weight is an integer in grams; dimensions are whole centimetres.
 * - Timestamps are ISO 8601 UTC strings ("2026-09-29T02:15:00Z"); show them in Asia/Kuala_Lumpur.
 * - Dates without a time (scheduled_for, drop_off_deadline) are "YYYY-MM-DD".
 * - Enums arrive as { value, label } options.
 */

export type Option<T extends string = string> = {
    value: T;
    label: string;
};

export type RoleValue = 'customer' | 'staff' | 'admin' | 'driver';

export type OrderStatusValue =
    | 'created'
    | 'dropped_off'
    | 'paid'
    | 'assigned'
    | 'picked_up'
    | 'delivered'
    | 'delivery_failed'
    | 'returned_to_sender'
    | 'cancelled';

export type PaymentMethodValue = 'cash' | 'card';

export type DeliveryOutcomeValue = 'delivered' | 'failed';

export type DeliveryFailureReasonValue =
    | 'recipient_unavailable'
    | 'address_not_found'
    | 'recipient_refused'
    | 'no_access'
    | 'other';

/** Stored value of App\Enums\MalaysianState (labels add "W.P." to federal territories). */
export type MalaysianStateValue =
    | 'Johor'
    | 'Kedah'
    | 'Kelantan'
    | 'Melaka'
    | 'Negeri Sembilan'
    | 'Pahang'
    | 'Perak'
    | 'Perlis'
    | 'Pulau Pinang'
    | 'Sabah'
    | 'Sarawak'
    | 'Selangor'
    | 'Terengganu'
    | 'Kuala Lumpur'
    | 'Labuan'
    | 'Putrajaya';

/** A rate card's group of states priced alike, e.g. "Sabah & Labuan". */
export type PriceZone = {
    code: string;
    name: string;
    states: MalaysianStateValue[];
};

/** The price of a route's parcels up to a weight. */
export type PriceBand = {
    maxWeightG: number;
    priceSen: number;
};

/** The prices from one zone to another (by zone code). Directional. */
export type PriceRoute = {
    from: string;
    to: string;
    /** For each started kg above the highest band, in sen. */
    extraKgSen: number;
    /** Lightest first. */
    bands: PriceBand[];
};

/**
 * A published rate card as prices are worked out from it
 * (App\Support\PriceList::toArray()). On a published card every state is in
 * one zone and every ordered pair of zones has a route.
 */
export type PriceList = {
    /** Staff and admin pages only; public and customer pages leave both out. */
    id?: number;
    name?: string;
    /** When it took (or takes) effect, ISO 8601 UTC. */
    effectiveFrom: string | null;
    /** Volumetric kg = length x width x height (cm) / divisor. */
    divisor: number;
    zones: PriceZone[];
    routes: PriceRoute[];
};

/**
 * The current rate card with the parcel limits (PriceCalculator::rules(),
 * or publicRules() without the id and name).
 */
export type Pricing = PriceList & {
    maxWeightG: number;
    maxDimensionCm: number;
};

/** Where a rate card version stands (App\Enums\RateCardPhase). */
export type RateCardPhaseValue = 'draft' | 'scheduled' | 'current' | 'past';

/** A rate card zone as admins edit it (RateCardResource). */
export type RateCardZone = {
    id: number;
    code: string;
    name: string;
    states: MalaysianStateValue[];
};

/** A rate card route as admins edit it (RateCardResource). */
export type RateCardRoute = {
    id: number;
    origin_zone_id: number;
    destination_zone_id: number;
    /** Null while a draft leaves it empty. */
    extra_kg_sen: number | null;
    /** Lightest first. */
    bands: { max_weight_g: number; price_sen: number }[];
};

/** RateCardResource: one version of the prices, as admins see it. */
export type RateCard = {
    id: number;
    name: string;
    phase: Option<RateCardPhaseValue>;
    /** Null for drafts. */
    effective_from: string | null;
    volumetric_divisor: number;
    notes: string | null;
    published_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    /** Present when loaded; null for the first card, which a migration made. */
    created_by?: { id: number; name: string } | null;
    published_by?: { id: number; name: string } | null;
    zones?: RateCardZone[];
    routes?: RateCardRoute[];
};

/** Where a rate card import stands (App\Enums\RateImportStatus). */
export type RateImportStatusValue =
    | 'uploaded'
    | 'parsing'
    | 'needs_mapping'
    | 'validating'
    | 'ready'
    | 'failed'
    | 'applied';

/** How an imported sheet is laid out (App\Enums\RateImportLayout). */
export type RateImportLayoutValue = 'long' | 'matrix';

/**
 * How to read an imported sheet. Columns count from 0 (A) and rows from 1,
 * as in the sheet. A long layout names a column for each value; a matrix
 * names the weight column, the route of each other column (zones by the
 * base card's codes) and the row with the prices per extra kg.
 */
export type RateImportMapping = {
    header_row: number;
    weight_unit: 'kg' | 'g';
    price_unit: 'rm' | 'sen';
    columns?: {
        origin: number | null;
        destination: number | null;
        weight: number | null;
        price: number | null;
    };
    weight_column?: number;
    routes?: {
        column: number;
        origin: string | null;
        destination: string | null;
    }[];
    extra_row?: number | null;
};

/** A problem found in an imported file, at a row and column (A, B…) when it has one. */
export type RateImportProblem = {
    row: number | null;
    column: string | null;
    message: string;
};

/** RateImportResource: a spreadsheet of prices on its way to a draft rate card. */
export type RateImport = {
    id: number;
    original_name: string;
    format: 'xlsx' | 'csv';
    /** The sheet read; null for a CSV file. */
    sheet: string | null;
    status: Option<RateImportStatusValue>;
    /** A queued job is reading or checking the file: the page asks again. */
    is_running: boolean;
    layout: Option<RateImportLayoutValue> | null;
    /** Suggested when the file is read, then as the admin confirmed it. */
    mapping: RateImportMapping | null;
    /** The first 200 problems, with how many there were. */
    errors: { total: number; items: RateImportProblem[] } | null;
    /**
     * The sheet names (none for CSV), the first rows as text and the
     * sheet's size; cut_short when the sheet goes on beyond the rows read.
     * Only sent while the columns or the sheet can still be changed.
     */
    preview?: {
        sheets: string[];
        rows: { number: number; cells: string[] }[];
        columns: number;
        last_row: number;
        cut_short?: boolean;
    } | null;
    /** Once checked: every route in grams and sen, zones by the base card's codes. */
    summary: { rows: number; bands: number; routes: PriceRoute[] } | null;
    /** False once the daily clean-up has deleted the file (after 7 days). */
    file_kept: boolean;
    /** A draft was made from the file and then deleted: it can be made again. */
    draft_deleted: boolean;
    created_at: string | null;
    updated_at: string | null;
    user?: { id: number; name: string };
    base_rate_card?: { id: number; name: string } | null;
    /** The draft made from the file. */
    rate_card?: { id: number; name: string } | null;
};

/** RateImportSummaryResource (list rows). */
export type RateImportSummary = Pick<
    RateImport,
    | 'id'
    | 'original_name'
    | 'status'
    | 'created_at'
    | 'user'
    | 'base_rate_card'
    | 'rate_card'
>;

/** BranchResource */
export type Branch = {
    id: number;
    code: string;
    name: string;
    address: string;
    city: string;
    state: MalaysianStateValue;
    postcode: string;
    phone: string;
    latitude: number;
    longitude: number;
    opening_hours: string;
    is_active: boolean;
};

export type BranchSummary = Pick<Branch, 'id' | 'code' | 'name' | 'city'>;

/** UserResource (admin user management and driver lists). */
export type UserAccount = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: Option<RoleValue>;
    /** Present when the controller loads "branch". */
    branch?: Pick<Branch, 'id' | 'code' | 'name'> | null;
    vehicle_plate: string | null;
    is_active: boolean;
    email_verified_at: string | null;
    created_at: string | null;
    /** Present when loaded with User::withJobsCountOn($date). */
    jobs_count?: number;
};

/** A driver as listed on the dispatch board (UserResource with jobs_count). */
export type Driver = UserAccount & {
    jobs_count: number;
};

/** StatusEventResource */
export type StatusEvent = {
    id: number;
    from: Option<OrderStatusValue> | null;
    status: Option<OrderStatusValue>;
    description: string;
    note: string | null;
    created_at: string;
    /** Present when "statusEvents.branch" is loaded. */
    branch?: Pick<Branch, 'id' | 'name' | 'city'> | null;
    /** Present for staff and admin views only. */
    actor?: { id: number; name: string; role: Option<RoleValue> } | null;
};

/** DeliveryAttemptResource */
export type DeliveryAttempt = {
    id: number;
    outcome: Option<DeliveryOutcomeValue>;
    recipient_name: string | null;
    failure_reason: Option<DeliveryFailureReasonValue> | null;
    /** The driver's free-text note: staff, admin and driver views only, never customers. */
    note?: string | null;
    attempted_at: string;
    has_photo: boolean;
    /** Authorised URL for the private proof of delivery photo. */
    photo_url: string | null;
    driver?: { id: number; name: string };
};

/** PaymentResource */
export type Payment = {
    id: number;
    receipt_number: string;
    amount_sen: number;
    method: Option<PaymentMethodValue>;
    /** Card terminal approval code (card payments only). */
    reference: string | null;
    paid_at: string;
    received_by?: { id: number; name: string };
    branch?: Branch;
    /** For the receipt: only what it prints about the parcel, no contact details. */
    order?: Pick<
        Order,
        | 'id'
        | 'tracking_number'
        | 'item_name'
        | 'receiver_name'
        | 'city'
        | 'postcode'
        | 'measured_weight_g'
        | 'length_cm'
        | 'width_cm'
        | 'height_cm'
        | 'chargeable_weight_g'
    >;
};

/** OrderSummaryResource (list rows). */
export type OrderSummary = {
    id: number;
    /** Display form, e.g. "KT-7Q4M92XD". */
    tracking_number: string;
    status: Option<OrderStatusValue>;
    receiver_name: string;
    address_line1: string;
    city: string;
    state: MalaysianStateValue;
    postcode: string;
    item_name: string;
    chargeable_weight_g: number;
    estimated_price_sen: number;
    final_price_sen: number | null;
    scheduled_for: string | null;
    /**
     * The day the customer can expect it: the scheduled day, or today while
     * a delivery carried over from an earlier day is still on the run.
     */
    expected_delivery: string | null;
    /**
     * While waiting for drop-off: the last day to drop it off (Malaysia),
     * after which the order is cancelled automatically. Null otherwise.
     */
    drop_off_deadline: string | null;
    created_at: string | null;
    updated_at: string | null;
    branch?: BranchSummary;
    driver?: { id: number; name: string; vehicle_plate: string | null } | null;
    /** Staff and admin views only. */
    customer?: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    };
    /** Present when loaded with withCount('failedAttempts'). */
    failed_attempts?: number;
    /** Present when "latestAttempt" is loaded. */
    latest_attempt?: DeliveryAttempt | null;
};

/** OrderResource (full order, for its customer, staff and admins; drivers get DriverJob). */
export type Order = Omit<OrderSummary, 'branch'> & {
    status_description: string;
    is_final: boolean;
    sender_name: string;
    sender_phone: string;
    receiver_phone: string;
    /** Where the receiver's delivery updates go, if the customer gave one (never on tracking or for drivers). */
    receiver_email: string | null;
    address_line2: string | null;
    declared_weight_g: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    measured_weight_g: number | null;
    dropped_off_at: string | null;
    paid_at: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
    /** The rate cards that priced the estimate and the final price: staff and admin views only. */
    estimated_rate_card?: { id: number; name: string } | null;
    final_rate_card?: { id: number; name: string } | null;
    branch?: Branch;
    payment?: Payment | null;
    delivery_attempts?: DeliveryAttempt[];
    status_events?: StatusEvent[];
};

/**
 * DriverJobResource: a delivery as its driver sees it. Only what the delivery
 * needs; never the sender's details, prices or payment.
 */
export type DriverJob = {
    id: number;
    /** Display form, e.g. "KT-7Q4M92XD". */
    tracking_number: string;
    status: Option<OrderStatusValue>;
    scheduled_for: string | null;
    /** Still open after its scheduled day (carried over to today's list). */
    is_overdue: boolean;
    receiver_name: string;
    receiver_phone: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: MalaysianStateValue;
    postcode: string;
    item_name: string;
    measured_weight_g: number | null;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    /** The pick-up branch, with address and opening hours. */
    branch?: Branch;
    /** Present on the job page, oldest first. */
    delivery_attempts?: DeliveryAttempt[];
    failed_attempts?: number;
};

/**
 * A parcel's stop on its driver's run while it is out for delivery
 * (App\Support\DeliveryProgress): a count only, never where the driver is.
 */
export type StopProgress = {
    /** Its stop among the parcels on the van, from 1. */
    position: number;
    /** The stops the driver makes before it. */
    stops_before: number;
};

/** TrackingResource: public, contains no personal data. */
export type Tracking = {
    tracking_number: string;
    status: Option<OrderStatusValue>;
    description: string;
    is_final: boolean;
    destination: { city: string; postcode: string };
    branch: { name: string; city: string };
    chargeable_weight_g: number;
    scheduled_for: string | null;
    /**
     * The day the customer can expect it: the scheduled day, or today while
     * a delivery carried over from an earlier day is still on the run.
     */
    expected_delivery: string | null;
    created_at: string | null;
    delivered_at: string | null;
    events: TrackingEvent[];
    /** Out for delivery: its stop on the driver's run; null otherwise. */
    progress: StopProgress | null;
    /**
     * On a driver's run (assigned or picked up): the public channel its new
     * stop and status are sent on, a name that cannot be guessed; null otherwise.
     */
    live_channel: string | null;
};

export type TrackingEvent = {
    status: Option<OrderStatusValue>;
    description: string;
    /** City of the branch where it happened, when known. */
    city: string | null;
    created_at: string;
};

/** A paginated resource collection, as Laravel serialises it. */
export type Pagination<T> = {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        links: {
            url: string | null;
            label: string;
            /** Missing on the "..." separator entries. */
            page?: number | null;
            active: boolean;
        }[];
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
};

/** Flash data sent with Inertia::flash('toast', [...]); shown by lib/flashToast.ts. */
export type Flash = {
    toast?: {
        type: 'success' | 'info' | 'warning' | 'error';
        message: string;
    };
};

/*
|--------------------------------------------------------------------------
| Page props
|--------------------------------------------------------------------------
|
| One type per Inertia page. The controllers own these props: when a
| controller changes what it sends, update the matching type here.
|
*/

export type WelcomePageProps = {
    branches: Branch[];
    pricing: Pricing;
    states: Option<MalaysianStateValue>[];
};

export type TrackShowPageProps = {
    query: string | null;
    result: Tracking | null;
};

/** The page behind the link in each receiver email. */
export type DeliveriesEmailsPageProps = {
    /** Display form, e.g. "KT-7Q4M92XD". */
    trackingNumber: string;
    /** The receiver has stopped the emails (or the customer gave no address). */
    stopped: boolean;
    /** The signed link the stop button posts to. */
    stopUrl: string;
};

export type BranchesIndexPageProps = {
    branches: Branch[];
};

export type PricingIndexPageProps = {
    pricing: Pricing;
    /** When the next rate card takes effect, if one is scheduled. */
    upcoming: { effectiveFrom: string | null } | null;
    /** Active branches, by name, for the estimator's "from". */
    branches: Branch[];
    states: Option<MalaysianStateValue>[];
};

export type OrdersIndexPageProps = {
    orders: Pagination<OrderSummary>;
};

export type OrdersCreatePageProps = {
    branches: Branch[];
    pricing: Pricing;
    states: Option<MalaysianStateValue>[];
    sender: { name: string; phone: string | null };
};

export type OrdersShowPageProps = {
    order: Order;
    canCancel: boolean;
    /** Out for delivery: its stop on the driver's run; null otherwise. */
    progress: StopProgress | null;
    /** On a driver's run: the private channel of its updates ("orders.12"); null otherwise. */
    liveChannel: string | null;
};

/**
 * A search that finds a parcel redirects to staff/OrderShow, so this page
 * only renders when there was no search or nothing matched it.
 */
export type StaffCounterPageProps = {
    /** The tracking number searched for (nothing matched it), or null. */
    query: string | null;
    /** The last 10 parcels received at the user's branch (every branch for admins without one); each has branch. */
    recent: OrderSummary[];
};

export type StaffOrderShowPageProps = {
    /**
     * Has branch, customer, driver, payment (with received_by), latest_attempt,
     * status_events (with branch and actor) and both rate cards.
     */
    order: Order;
    /** The card in effect for a parcel still to weigh; the card that set the final price once weighed. */
    pricing: Pricing;
    /** The state the price runs from: this counter's branch before weighing, the parcel's branch after. */
    origin: MalaysianStateValue;
    paymentMethods: Option<PaymentMethodValue>[];
};

export type StaffReceiptPageProps = {
    /** Has order, branch and received_by. */
    payment: Payment;
};

/** A failed delivery on the dispatch board (a list row with its attempts). */
export type FailedDelivery = OrderSummary & {
    failed_attempts: number;
    latest_attempt: DeliveryAttempt | null;
};

/**
 * Each queue is paginated separately (20 per page) with its own page
 * parameter: awaiting_page, failed_page, overdue_page and scheduled_page.
 */
export type AdminDispatchPageProps = {
    /** Paid parcels waiting for a driver, oldest payment first; each has branch. */
    awaiting: Pagination<OrderSummary>;
    /** Failed deliveries to reschedule or return, oldest first; each has branch and driver. */
    failed: Pagination<FailedDelivery>;
    /** Deliveries still open after their scheduled day, oldest first; each has branch, driver and failed_attempts. */
    overdue: Pagination<OrderSummary>;
    /**
     * Open deliveries (assigned or picked up) scheduled on `date`, grouped by
     * driver name; each has branch, driver and failed_attempts. Assigned ones
     * can be reassigned. Page parameter: scheduled_page.
     */
    scheduled: Pagination<OrderSummary>;
    /** Active drivers; jobs_count is their open jobs on `date`. */
    drivers: Driver[];
    /** The day shown, YYYY-MM-DD (Malaysia time). */
    date: string;
    /** Today in Malaysia, YYYY-MM-DD: the earliest delivery date allowed. */
    today: string;
    /** A failed delivery can be rescheduled while failed_attempts < maxFailedAttempts. */
    maxFailedAttempts: number;
};

export type AdminOrdersIndexPageProps = {
    /** 20 per page, newest first; each has branch, customer and driver. */
    orders: Pagination<OrderSummary>;
    filters: {
        status: OrderStatusValue | null;
        q: string | null;
        branch: number | null;
    };
    statuses: Option<OrderStatusValue>[];
    branches: BranchSummary[];
};

export type AdminOrdersShowPageProps = {
    /** Has branch, customer, driver, payment, delivery_attempts (with driver), status_events and failed_attempts. */
    order: Order;
    maxFailedAttempts: number;
    /** Active drivers with jobs_count on `date`; empty unless the order can be (re)assigned. */
    drivers: Driver[];
    /** The day the drivers' workload is counted for (?date=, default today), YYYY-MM-DD. */
    date: string;
    /** Today in Malaysia, YYYY-MM-DD: the earliest delivery date allowed. */
    today: string;
};

export type AdminUsersIndexPageProps = {
    /** Each user has branch. */
    users: Pagination<UserAccount>;
    filters: {
        role: RoleValue | null;
        q: string | null;
    };
    roles: Option<RoleValue>[];
};

export type AdminUsersFormPageProps = {
    /** The account being edited (with branch), or null when creating one. */
    user: UserAccount | null;
    roles: Option<RoleValue>[];
    /** Active branches only: staff can only be assigned to one of these. */
    branches: BranchSummary[];
};

export type AdminBranchesIndexPageProps = {
    branches: Branch[];
};

export type AdminBranchesFormPageProps = {
    branch: Branch | null;
    states: Option<MalaysianStateValue>[];
};

/** The business rules on the Site settings page (App\Support\Settings::all()). */
export type BusinessSettings = {
    /** Days an order may wait for drop-off before it is cancelled. */
    unclaimed_order_days: number;
    /** Days before that the customer is reminded; 0 = no reminder. */
    drop_off_reminder_days_before: number;
    /** Failed delivery attempts before the parcel must be returned. */
    max_failed_attempts: number;
};

/** DropOffTiming::summary(): drop-offs in the last `window_days` days. */
export type DropOffTiming = {
    window_days: number;
    /** The unclaimed-order limit the share is measured against. */
    limit_days: number;
    /** Orders dropped off in the window; the statistics are null when 0. */
    dropped_off: number;
    /** Malaysian calendar days from the order day to drop-off, one decimal. */
    median_days: number | null;
    p90_days: number | null;
    p95_days: number | null;
    /** Share dropped off within the limit, one decimal (0–100). */
    within_limit_percent: number | null;
    /** Orders cancelled in the window for never being dropped off. */
    cancelled_unclaimed: number;
    /** Orders waiting for drop-off now. */
    waiting: number;
    /** Of those, the ones the nightly run at midnight cancels. */
    expiring_tonight: number;
    /** One line of advice, e.g. "95% drop off within 2.4 days, inside the 7-day limit." */
    suggestion: string | null;
};

export type AdminSettingsPageProps = {
    settings: BusinessSettings;
    /** The values allowed for each setting. */
    limits: Record<keyof BusinessSettings, { min: number; max: number }>;
    timing: DropOffTiming;
};

export type AdminRatesIndexPageProps = {
    /** Every version: drafts first, then published ones from the last to take effect; each has published_by. */
    rateCards: RateCard[];
};

export type AdminRatesShowPageProps = {
    /** Has zones, routes (with bands), created_by and published_by. */
    rateCard: RateCard;
    /** What stops a draft from being published, in plain words; empty otherwise. */
    problems: string[];
    states: Option<MalaysianStateValue>[];
    can: {
        update: boolean;
        publish: boolean;
        withdraw: boolean;
        delete: boolean;
    };
};

export type AdminRatesEditPageProps = {
    /** A draft, with zones and routes (with bands). */
    rateCard: RateCard;
    states: Option<MalaysianStateValue>[];
    /** The heaviest band allowed, in grams. */
    maxWeightG: number;
};

export type AdminRateImportsCreatePageProps = {
    /** The versions whose zones the prices can use (those with zones), drafts first. */
    rateCards: RateCard[];
    /** The default base, and the version the template is downloaded from. */
    currentRateCardId: number;
    /** The latest 10 imports, newest first; each has user, base_rate_card and rate_card. */
    recent: RateImportSummary[];
    /** The largest file accepted, in KB. */
    maxKb: number;
};

export type AdminRateImportsShowPageProps = {
    /** Has user, base_rate_card and rate_card. */
    rateImport: RateImport;
    /** The base card's zones, in its order: the routes a file can hold. */
    zones: PriceZone[];
    currentRateCardId: number;
    maxKb: number;
    can: {
        /** Confirm the mapping (again). */
        map: boolean;
        /** Read another sheet of the workbook. */
        chooseSheet: boolean;
        createDraft: boolean;
    };
};

export type DriverJobsPageProps = {
    /** The day shown, YYYY-MM-DD (Malaysia time; defaults to today). */
    date: string;
    /** Today on the server, YYYY-MM-DD (Malaysia time). */
    today: string;
    /**
     * Open jobs (assigned or picked up) scheduled for the day, in the driver's
     * order; each has branch and failed_attempts. Today's list also has the
     * overdue jobs, first until the driver moves them among today's stops.
     * An earlier day's are on today's list now, and listed in its order.
     */
    jobs: DriverJob[];
    /**
     * The stop of each job, in the order of `jobs`: its place among the
     * parcels on the van, the number its customer is told; null while it
     * is still to collect.
     */
    stops: (number | null)[];
    counts: {
        /** Open jobs still to be collected from the branch. */
        assigned: number;
        /** Open jobs out for delivery. */
        picked_up: number;
        /** Attempts the driver completed during the day. */
        delivered: number;
        failed: number;
    };
};

export type DriverJobShowPageProps = {
    /** An open job, with branch, delivery_attempts (oldest first) and failed_attempts. */
    order: DriverJob;
    failureReasons: Option<DeliveryFailureReasonValue>[];
};
