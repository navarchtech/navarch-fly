export type AssayForAssayExchangeGenerator = {
	lotNumber: number | null;
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
}

export type AssayLotForAssayExchangeGenerator = {
	lotNumber: number;
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
}

export type CompositeAssayForAssayExchangeGenerator = {
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
}