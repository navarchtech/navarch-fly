// import { Ref } from "vue";

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

export enum MethodEnum {
	INTURN = 'Inturn',
	OUTTURN = 'Outturn',
	PLANNED = 'Planned',
	ESTIMATED = 'Estimated',
	INTURN_FINAL = 'Inturn Final',
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
	foreign_key: string;
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
	// MOISTURE = 'moisture',
	DRY_WEIGHT = 'dry_weight'
}

export enum SharedLotPropertyFields {
	METHOD = 'method',
	WET_WEIGHT_UOM = 'wet_weight_uom',
	MOISTURE_UOM = 'moisture_uom',
	DRY_WEIGHT_UOM = 'dry_weight_uom'
}

export type UpdatableSharedLotProperties = {
	wet_weight_uom?: string;
	moisutre_uom?: string;
	dry_weight_uom?: string;
}

// type CommoditiesData = {
// 	name: string;
// 	code: string;
// 	splittingLimit: number;
// 	isPrimaryCommodity: boolean;
// 	splittingLimitUOM: string;
// }

export type ContractData = {
	// commodities: CommoditiesData[];
	wetWeightUOM: string;
	dryWeightUOM: string;
	// weightUOM: string;
	moistureUOM: string;
	methods: string[];
	// umpires: string[];
	// umpireArbitrationWhenSLEqualsDiff: boolean;
	// finalAssayEquation: FinalAssayEquation;
}
