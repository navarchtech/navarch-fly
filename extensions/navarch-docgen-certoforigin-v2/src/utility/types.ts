type WeightLot = {
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

enum AggregatableWeightLotFields {
	WET_WEIGHT = 'wet_weight',
	MOISTURE = 'moisture',
	DRY_WEIGHT = 'dry_weight'
}

enum SharedLotPropertyFields {
	METHOD = 'method',
	WET_WEIGHT_UOM = 'wet_weight_uom',
	MOISTURE_UOM = 'moisture_uom',
	DRY_WEIGHT_UOM = 'dry_weight_uom'
}