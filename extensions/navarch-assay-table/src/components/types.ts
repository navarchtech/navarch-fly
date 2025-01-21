import { Ref } from "vue";

export type Alignment = 'left' | 'center' | 'right';

export type TableHeader = {
	text: string;
	value: string;
	description?: string | null;
	align?: Alignment;
	sortable?: boolean;
	width?: number | null;
	[key: string]: any;
};

export type Header = Required<TableHeader>;

export type Item = {
	[key: string]: any;
};

export type ItemSelectEvent = {
	value: boolean;
	item: Item;
};

export type Sort = {
	by: string | null;
	desc: boolean;
};

export type Method = 'INTURN' | 'OUTTURN' | 'PLANNED'

export enum MethodEnum {
	INTURN = 'Inturn',
	INTURN_FINAL = 'Inturn Final',
	OUTTURN = 'Outturn',
	ESTIMATED = 'Estimated',
	PLANNED = 'Planned'
}

export type LosingParty = 'Seller' | 'Buyer' | 'Split';

export enum LosingPartyEnum {
	SELLER = 'Seller',
	BUYER = 'Buyer',
	SPLIT = 'Split'
}

// export type UmpireData = {
// 	umpire_name: string;
// 	umpire_assay: number;
// 	losing_party: LosingPartyEnum;
// }

export type Commodity = {
	code: string;
	name: string;
}

export type Assay = {
	// temp_id: string;
	assay_id: string;
	
	method: MethodEnum;
	commodity: string;
	commodity_name: string;

	// TODO: how to get uom for assay? Ans: from the contract
	assay_uom?: string;
	dry_weight_uom?: string;

	seller_assay?: number;
	buyer_assay?: number;

	difference?: number;
	splitting_limit?: number;

	to_umpire?: boolean;
	// TODO: check if all lots of the same commodity and method have the same umpire
	umpire_name?: string;
	umpire_assay?: number;
	// TODO: what to set losing party to in Assay?
	losing_party?: LosingPartyEnum;

	final_assay?: number;

	total_dry_weight: number;
	total_arbitrated_dry_weight: number;
	lots: AssayLot[] | AssayComposite;
}

export type AssayV2 = {
	assay_id: string;
	
	method: MethodEnum;
	commodity: string;
	commodity_name: string;

	assay_uom?: string;
	dry_weight_uom?: string;

	seller_assay?: number;
	buyer_assay?: number;

	difference?: number;
	splitting_limit?: number;

	to_umpire?: boolean;
	umpire_name?: string;
	umpire_assay?: number;
	losing_party?: LosingPartyEnum;

	final_assay?: number;

	total_dry_weight: number;
	total_arbitrated_dry_weight: number;
	// TODO: make sure all assay lots have an assay composite, have it defined and make this mandatory
	composite?: AssayComposite;
	lots: AssayLot[];
}

export type AssayLot = {
	id?: string;
	foreign_key: string;
    lot_number: number;
	weight_lot_id: string;
    dry_weight?: number;
	// TODO: maybe make this an enum since there's a set value for them, or not and just keep them as string type
	dry_weight_uom?: string;
	
	// TODO: check whether we need UoMs for seller_assay, buyer_assay, umpire_assay, final_assay, splitting_limit, and difference
	// Yes, same unit for all.
	assay_uom?: string;
    seller_assay?: number;
    buyer_assay?: number;

	difference?: number;
	splitting_limit?: number;

	to_umpire?: boolean;
	umpire_name?: string;
	umpire_assay?: number;
	losing_party?: LosingPartyEnum;

	final_assay?: number;

	commodity: string;
	method: MethodEnum;
}

export type UpdatableSharedLotProperties = {
	dry_weight_uom?: string;
	assay_uom?: string;
	splitting_limit?: number;
}

export type AssayComposite = {
	// Use the absence of a lot number as a way to implicitly identify the composite lot and the fact that there is only one composite lot per assay
	id?: string;
	foreign_key: string;

	// TODO: check if we need dry weight and its uom for composite lots
	dry_weight?: number;
	dry_weight_uom?: string;

	assay_uom?: string;
    seller_assay?: number;
    buyer_assay?: number;
	
	difference?: number;
	splitting_limit?: number;

	to_umpire?: boolean;
	umpire_name?: string;
	umpire_assay?: number;
	losing_party?: LosingPartyEnum;

	final_assay?: number;

	commodity: string;
	// TODO: come back to this and check if this can be simply Ref<MethodEnum>
	method: MethodEnum;
}

export enum FinalAssayEquation {
	AVG_WITH_MIDDLE_ASSAY_AS_FINAL_FOR_ARBITRATION = 'AVG_WITH_MIDDLE_ASSAY_AS_FINAL_FOR_ARBITRATION',
	AVG_WITH_AVG_OF_UMPIRE_AND_CLOSEST_AS_FINAL_FOR_ARBITRATION = 'AVG_WITH_AVG_OF_UMPIRE_AND_CLOSEST_AS_FINAL_FOR_ARBITRATION',
}

export type CommoditiesData = {
	name: string;
	code: string;
	splittingLimit: number;
	isPrimaryCommodity: boolean;
	splittingLimitUOM: string;
}

export type ContractData = {
	commodities: CommoditiesData[];
	dryWeightUOM: string;
	// weightUOM: string;
	methods: string[];
	umpires: string[];
	umpireArbitrationWhenSLEqualsDiff: boolean;
	finalAssayEquation: FinalAssayEquation;
}

export enum OptionalField {
	DRY_WEIGHT,
	DRY_WEIGHT_UOM,

	SELLER_ASSAY,
	BUYER_ASSAY,
	DIFFERENCE,
	SPLITTING_LIMIT,
	
	TO_UMPIRE,
	UMPIRE_NAME,
	UMPIRE_ASSAY,
	LOSING_PARTY,

	FINAL_ASSAY
}

export type WeightLot = {
	lot_number: number;
	dry_weight: string;
	method: string;
	id: string;
}










/**
 * Old types
 */

export type AssayByCommodity = {
	temp_id: string;
	
	method: MethodEnum;
	commodity: string;
	seller_assay: number;
	buyer_assay: number;
	difference: number;
	splitting_limit: number;
	absolute_difference: number;
	to_umpire: boolean;
	umpire_assay?: number;
	losing_party?: string;

	count: number;
	index: number;
};

export type AssayByMethod = {
	method: MethodEnum;
	assays: AssayByCommodity[];
} & AssayByCommodity;

// export type AssayGroup = {
// 	INTURN: Ref<Assay[]>,
// 	OUTTURN: Ref<Assay[]>,
// 	PLANNED: Ref<Assay[]>
// }

// Try to match the type of ht_directory to reduce the amount of type casting.
export type AssayLotDeprecate = {
	id?: string;
	foreign_key: string;
    lot_number: number;
    dry_weight: number;
    seller_lab: number;
    seller_declared: number;
    buyer_declared: number;
	difference: number;
	splitting_limit: number;
	absolute_difference: number;
	to_umpire: boolean;
	umpire_name?: string;
	umpire_declared?: number;
	losing_party?: string;
	final_assay: number;

	commodity: string;
	method: MethodEnum;
};

export type CompositeItem = {
	id?: string;
	foreign_key: string;
    dry_weight: number;
    seller_assay: number;
    buyer_assay: number;
	final_assay: number;

	commodity: string;
	method: MethodEnum;
};

export type CompositeItemWithRefValues = {
	id?: string;
	foreign_key: string;
    dry_weight: Ref<number | null>;

	assay_uom: Ref<string | null | undefined>;
	splitting_limit: Ref<number | null | undefined>;
    seller_assay: Ref<number | null>;
    buyer_assay: Ref<number | null>;
	final_assay: Ref<number | null>;

	commodity: Ref<string | null>;
	method: Ref<MethodEnum | '' | null>;
};

// // TODO: Split out fields that should have information together into their own types one day
// // Do we even need this? Wouldn't it be easier to just patch everything for now, even data that didn't change
// export type PatchAssayLotRequest = {
//     dry_weight?: number;
//     seller_lab?: number;
//     seller_declared?: number;
//     buyer_declared?: number;
// 	difference?: number;
// 	splitting_limit?: number;
// 	absolute_difference?: number;
// 	to_umpire?: boolean;
// 	umpire_name?: string;
// 	umpire_declared?: number;
// 	losing_party?: string;
// 	final_assay?: number;

// 	commodity?: string;
// 	method?: MethodEnum;
// };

export type AssaysByCommodity = AssayByCommodity[];

export type AssayLotsDeprecate = AssayLotDeprecate[];