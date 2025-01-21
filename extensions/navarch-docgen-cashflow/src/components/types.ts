

// export type WeightLot = {
// 	lot_number: number;
// 	dry_weight: number;
// 	method: string;
// }

export enum MethodEnum {
	INTURN = 'Inturn',
	OUTTURN = 'Outturn',
    INTURN_FINAL = 'Inturn Final',
	PLANNED = 'Planned'
}

export type QuotationalPeriod = {
	qp_period: number;
	qp_code: string;
	default: boolean;
}

export type QpCommodity = {
    qp_selected: string | null;
    commodity_name: string;
    commodity_code: string;
    commodity_id: string;
    declared: boolean;
}

export type PricingDates = {
	provisionalPricingStartDate: Date;
	provisionalPricingEndDate: Date;
	expectedNoOfBusinessDays: number | null; // if assigned a non-null positive integer, then more price data will be fetched in case of non-business days, and the right number of business days will used to calculate the average price, set to null if the average price calculator function should fetch exactly according to the start and end date
}

export type AveragePriceWithinPeriod = {
	averagePrice: number;
	startDate: Date;
	endDate: Date;
}

export type AssayLotsOrCompositeForInvoice = {
	commodity: string;
	method: string;
	dry_weight: string;
	dry_weight_uom: string;
	assay_uom: string;
	buyer_assay: string;
	seller_assay: string;
	final_assay: string;
	lot_number: number | null;
}

export enum BracketType {
	BRACKET = 'Bracket',
	MIN_DEDUCTION = 'Minimum Deduction',
	MAX_CAP = 'Maximum Cap',
}

// expected to only have these 2 enums (percentage or fractional only), there are logic in the code that assumes this
export enum RateType {
	PERCENTAGE = 'Percentage',
	FRACTIONAL = 'Fractional',
}

export type GenericBracket = {
	lower_threshold: number;
	lower_threshold_inclusive: boolean;
	upper_threshold: number;
	upper_threshold_inclusive: boolean;
}

export type PayableAssayBracket = GenericBracket & {
	bracket_type: BracketType;
	// lower_threshold: number;
	// lower_threshold_inclusive: boolean;
	// upper_threshold: number;
	// upper_threshold_inclusive: boolean;
	rate?: number;
	rate_type?: RateType;
	initial_adjustment?: number;
	initial_adjustment_uom?: string;
	minimum_deduction?: number;
	minimum_deduction_uom?: string;
	maximum_cap?: number;
	maximum_cap_uom?: string;
}

export type ChargeBracket = GenericBracket & {
	// lower_threshold: number;
	// lower_threshold_inclusive: boolean;
	// upper_threshold: number;
	// upper_threshold_inclusive: boolean;
	base_treatment_charge: number;
	base_charge_adjustment: number | null;
	use_btc: boolean;
	escalator_reference: number;
	for_every_unit: string | null;
	rate: number | null;
}

export type PenaltyBracket = GenericBracket &{
	// lower_threshold: number;
	// lower_threshold_inclusive: boolean;
	// upper_threshold: number;
	// upper_threshold_inclusive: boolean;
	no_penalty: boolean;
	escalator_reference: number;
	for_every_unit?: string;
	rate?: number;
}

export type Bracket = {
	bracket_type: BracketType;
	lower_threshold?: number;
	lower_threshold_inclusive?: boolean;
	upper_threshold?: number;
	upper_threshold_inclusive?: boolean;
	rate?: number;
	rate_type?: RateType;
	initial_adjustment?: number;
	// initial_adjustment_uom?: string;
	final_adjustment?: number;
	// final_adjustment_uom?: string;
	comparator?: number;
	// comparator_uom?: string;
}

export type BracketConversions = {
	initialConversion?: UnitConversion;
	finalConversion?: UnitConversion;
	comparatorConversion?: UnitConversion;
}

export type BracketForEvaluation = {
	bracket_type: BracketType;
	rate?: number;
	rate_type?: RateType;
	initial_adjustment?: number;
	initial_adjustment_conversion_factor?: number;
	initial_adjustment_conversion_by_multiplication?: boolean;
	final_adjustment?: number;
	final_adjustment_conversion_factor?: number;
	final_adjustment_conversion_by_multiplication?: boolean; // TODO: probably don't need this one, final_adjustment_conversion_factor is never set by anything currently, maybe something missed?
	comparator?: number;
	comparator_conversion_factor?: number;
	comparator_conversion_by_multiplication?: boolean;
}

export type Weight = {
	// method: MethodEnum;
	method: string;
	wet_weight?: number;
	wet_weight_uom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: number;
	// moisture_uom?: string;

	dry_weight?: number;
	dry_weight_uom?: string;

	lots: WeightLot[];
}

export type WeightLot = {
	id?: string;
	// method: MethodEnum;
	method: string;

	lot_number: number;

	wet_weight?: number;
	wet_weight_uom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: number;
	// moisutre_uom?: string;

	dry_weight?: number;
	dry_weight_uom?: string;
}

export enum AggregatableWeightLotFields {
	WET_WEIGHT = 'wet_weight',
	MOISTURE = 'moisture',
	DRY_WEIGHT = 'dry_weight'
}

export enum SharedLotPropertyFields {
	METHOD = 'method',
	WET_WEIGHT_UOM = 'wet_weight_uom',
	MOISTURE_UOM = 'moisture_uom',
	DRY_WEIGHT_UOM = 'dry_weight_uom'
}

// // Need to make sure the contract form can store values like this instead of just writing a sentence
// export type PayableAssayBracket = {
// 	lower_threshold: number;
// 	lower_threshold_inclusive: boolean;
// 	payable_percentage: number;
// }

export type ExpressionUnits = {
	valueUom?: string;

	// these two fields should either be both declared together, or both be undefined. Used in building the penalty expression
	ratePerUom?: string;
	currency?: string;
}

// TODO: need to simplify unit conversion types when cleaning up the code for Directus v10
export type UnitConversion = {
	conversionFactor: number;
	conversionUom: string;
	isConvertByMultiplication: boolean;
}

export type ConversionValue = {
	value: number;
	isConvertByMultiplication: boolean;
}

export type PayableMetalUnitConversionData = {
	initialConversion?: UnitConversion;
	finalConversion?: UnitConversion;
}

export type FinalValueAndExpression = {
	finalValue?: number;
	expression?: string;
	bracket?: Bracket;
}

type Signatory = {
    signatoryName: string;
    signatoryTitle: string;
    company: string;
}

export type InvoiceRequestBody = {
	seller: string;
	seller_address: string;
	seller_phone_number: string;
	signatory: Signatory;
	remittance: string;

	buyer: string;
	buyer_address: string;
	shipment_code: string;
	vessel: string;
	bl_date: string;

	invoice_type: string;
	invoice_date: string;
	revision?: string;
	invoice_number: string;
	parcel: string;

	port_of_loading: string;
	port_of_discharge: string;
	primary_commodity: string;

	due_date: string;

	
	wet_weight: string;
	moisture: string;
	dry_weight: string;
	wet_weight_uom: string;
	wet_weight_uom_name: string;
	moisture_uom: string;
	dry_weight_uom: string;
	dry_weight_uom_name: string;

	total_revenue: string;
	total_deductions: string;

	currency: string;

	commodities: {
		commodity: string;

		analytical_assay: string;
		deduction_expression: string;
		payable_assay: string;
		assay_uom: string;

		payable_metal: string;
		payable_metal_expression: string;
		payable_metal_uom: string;
		qp: string;
		qp_start_date: string;
		qp_end_date: string;
		price_method: string;
		price_rate: string; // how to calculate this again?
		price_per_uom: string;
		price: string;
		
		treatment_charge?: {
			rate: string;
			discount: string;
			final_rate: string;
			per_uom: string;
			final_amount: string;
		}

		final_total: string;
	}[];

	penalties: {
		penalties: {
			commodity: string;

			analytical_assay: string;
			deductible_amount: string;
			deduction_expression?: string;
			assay_uom: string;

			penalty_rate: string;
			penalty_per_uom: string;
			final_penalty_rate: string;

			final_penalty: string;
		}[];
		total_penalties: string;
	};

	adjustments?: {
		adjustments: {
			description: string;
			amount: string;
		}[];
		total_adjustments: string;
	};

	invoice_value: string;
	payable_percentage: string; // appears to be similar to 'invoice_value'
	payable_amount: string;
	payment_received_source?: string;
	payment_received?: string; // where is this from??
	balance_in_sellers_favor: string;

}

export type InvoiceParam = {
	parcel: string;
	document_type: string;
	revision_invoice: string;
	invoice_type: string;
	weight_method: string;
	assay_method: string;
}