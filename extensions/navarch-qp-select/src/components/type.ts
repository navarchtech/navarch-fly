export type QpCommodity = {
    qp_selected: string | null;
    commodity_name: string;
    commodity_code: string;
    commodity_id: string;
    declared: boolean;
}

export type Selection = {
    text: string;
    value: string;
}

export type QuotationalPeriod = {
    qp_period: string;
    qp_code: string;
    default?: boolean;
}