// --------------------------------------------------------------------------
// From Assay Exchange generator v1 that can be generic
// --------------------------------------------------------------------------

export type MethodDisplayType = 'Outturn' | 'Inturn Final' | 'Inturn' | 'Estimated' | 'Planned';
export type MethodEnumType = 'Outturn' | 'InturnFinal' | 'Inturn' | 'Estimated' | 'Planned';

export type FetchedAssayLotData = {
    lot_number: number;
	assay_uom?: string;

	seller_assay?: string;
	final_assay?: string;

	commodity: string;
	method: MethodDisplayType;
}

export type FetchedWeightLotData = {
	method: MethodDisplayType;
	lot_number: number;

	wet_weight?: string;
	wet_weight_uom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: string;
	// moisutre_uom?: string;

	dry_weight?: string;
	dry_weight_uom?: string;
}

export type WeightLotForGenerator = {
	lotNumber: number;
	wetWeight: number;
	wetWeightUom: string;
	moisture: number;
	moistureUom: string;
	dryWeight: number;
	dryWeightUom: string;
}

export type FetchedCommodityData = {
	code: string;
	name: string;
}

// --------------------------------------------------------------------------
// From Cert of Origin generator v1 that can be generic
// --------------------------------------------------------------------------
export type Weight = {
	// method: MethodEnum;
	method: MethodDisplayType;
	wetWeight?: number;
	wetWeightUom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: number;
	// moisture_uom?: string;

	dryWeight?: number;
	dryWeightUom?: string;

	lots: FetchedWeightLotData[];
}

// --------------------------------------------------------------------------
// Common tech types
// --------------------------------------------------------------------------

export enum NavarchDocument {
    AssayExchange = 'Assay Exchange',
    CertOfOrigin = 'Cert Of Origin',
    Invoices = 'Invoices',
    LoadportDisportComparison = 'Loadport-Disport Comparison',
    PenaltyElements = 'Penalty Elements',
    ShipmentLatest = 'Shipment Latest',
    WeightAndAssayCert = 'Weight & Assay Cert'
}

export type NavarchImageData = {
	imageData: string;
	imageType: NavarchImageType;
}

export enum NavarchImageType {
	PNG = 'image/png',
	JPEG = 'image/jpeg',
	JPG = 'image/jpg'
}

// --------------------------------------------------------------------------
// Common types
// --------------------------------------------------------------------------

export enum Method {
	Outturn = 'Outturn',
	InturnFinal = 'Inturn Final',
	Inturn = 'Inturn',
	Estimated = 'Estimated',
	Planned = 'Planned'
}

// Putting numerical space in between the enum values to allow for future additions, not that any are expected
export enum MethodRanked {
	Estimated = 0,
	Planned = 10,
	Inturn = 20,
	InturnFinal = 30,
	Outturn = 40,
}

export enum InvoiceType {
	Advance = 'Advance',
	SecondAdvance = 'Second Advance',
	ThirdAdvance = 'Third Advance',
	FourthAdvance = 'Fourth Advance',
	Provisionial = 'Provisionial',
	SecondProvisionial = 'Second Provisionial',
	ThirdProvisionial = 'Third Provisionial',
	FourthProvisionial = 'Fourth Provisionial',
	Final = 'Final'
}

// Putting numerical space in between the enum values to allow for future additions in case of new invoice types
export enum InvoiceTypeRanked {
	Advance = 0,
	SecondAdvance = 10,
	ThirdAdvance = 20,
	FourthAdvance = 30,
	Provisionial = 40,
	SecondProvisionial = 50,
	ThirdProvisionial = 60,
	FourthProvisionial = 70,
	Final = 80
}

export type DropdownSelection = {
    value: string;
    text: string;
}
