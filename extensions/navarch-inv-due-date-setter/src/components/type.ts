export type DueDateItem = {
    due_date: string | null;
    locked: boolean;
    inv_type: string;
};

export type PaymentAdviceConfig = {
    days: number;
    day_type: string;
    ref_day: string;
};

export type QpCommodity = {
    qp_selected: string | null;
    commodity_name: string;
    commodity_code: string;
    commodity_id: string;
    declared: boolean;
}