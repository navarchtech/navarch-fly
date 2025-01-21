<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generatePdf()"
			:loading="isGeneraingDoc"
		>Generate Shipment Latest Doc</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadPdf()"
		>Download Shipment Latest Doc
		</v-button>
	</div>
	<v-button
		class="margin-top-16px"
		@click="() => copy()"
		:loading="isCopying"
	>Copy</v-button>
</template>

<script lang="ts">
import { defineComponent, Ref, ref, inject } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { Buffer } from 'buffer/';

type ParcelResponse = {
	shipment_code: string;
	counterparty: string;
	physical_status: string;
	financial_status: string;
	// actual_shipment_date: string;
	bl_date: string;
	vessel: string;
	destination: string;
	assay_results: string;
	weight_result: string;
	contract: string;
}

type AssayLotsOrCompositeForShipmentLatest = {
	commodity: string;
	method: string;
	assay_uom: string;
	dry_weight: string;
	final_assay: string;
	lot_number: number | null;
}

type Weight = {
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

type ImageData = {
	imageData: string;
	imageType: ImageType;
}

enum ImageType {
	PNG = 'image/png',
	JPEG = 'image/jpeg',
	JPG = 'image/jpg'
}

export default defineComponent({
	props: {
		value: {
			type: Object,
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		const failureReason: Ref<string> = ref('');
		const isGeneraingDoc: Ref<boolean> = ref(false);
		const isCopying: Ref<boolean> = ref(false);
		const api = useApi();

		// TODO: currently using first parcel and first element reached, will use their uom as the default for the entire doc strategy
		const DRY_WEIGHT_UOM = ref('');
		const WET_WEIGHT_UOM = ref('');
		const assayUomByCommodityCode: Record<string, string> = {};
		const commodityCodeToMetalUomMap: Record<string, string> = {};

		const formValues = inject('values', ref<Record<string, any>>({}));

		const SHIPMENT_LATEST_DOCGEN_ENDPOINT = '/generate/shipment-latest';

		const SHIPMENT_LATEST_START_DATE_FIELD_NAME = 'start_date';
		const SHIPMENT_LATEST_END_DATE_FIELD_NAME = 'end_date';
		const SHIPMENT_LATEST_FILTER_DATE_FIELD_NAME = 'filter_date';
		
		const ID_FIELD_NAME = 'id';
		const METHOD_FIELD_NAME = 'method';
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		
		const PARCEL_COLLECTION_NAME = 'navarch_parcel';

		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_PHYSICAL_STATUS_FIELD_NAME = 'physical_status';
		const PARCEL_FINANCIAL_STATUS_FIELD_NAME = 'financial_status';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';

		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME = 'parcel_finalisation_date';

		const INVOICE_COLLECTION_NAME = 'navarch_invoice';
		const INVOICE_INVOICE_FIELD_NAME = 'invoice';
		const INVOICE_PARCEL_FIELD_NAME = 'parcel';
		const INVOICE_INVOICE_DATE_FIELD_NAME = 'invoice_date';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_LOGO_FIELD_NAME = 'logo';

		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_COMMODITY_FIELD_NAME = 'commodity';
		const ASSAY_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const ASSAY_LOT_FINAL_ASSAY_FIELD_NAME = 'final_assay';
		const ASSAY_LOT_ASSAY_UOM_FIELD_NAME = 'assay_uom';
		const ASSAY_LOT_LOT_NUMBER_FIELD_NAME = 'lot_number';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_WET_WEIGHT_FIELD_NAME = 'wet_weight';
		const WEIGHT_LOT_MOISTURE_FIELD_NAME = 'moisture';
		const WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME = 'wet_weight_uom';
		const WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		
		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME = 'price_per_uom';
		const COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME = 'payable_commodity';
		
		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_CODENAME_FIELD_NAME = 'codename';
		
		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_KEY_FIELD_NAME = 'unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol';
		const UNIT_DRY_SYMBOL_FIELD_NAME = 'dry_symbol';
		const UNIT_CONVERSION_TO_GRAM_FIELD_NAME = 'conversionToGram';

		const ASSAY_UNIT_COLLECTION_NAME = 'navarch_assay_unit';
		const ASSAY_UNIT_UNIT_FIELD_NAME = 'unit';
		const ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME = 'conversion_to_ppb';
		const ASSAY_UNIT_COMPOSITION_FIELD_NAME = 'composition';

		return { 
			isGeneraingDoc,
			failureReason,
			viewPdf,
			downloadPdf,
			copy,
			isCopying,
			generatePdf,
		};

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, shipment_latest, ...requestBody } = formValues.value;
			console.log(`[shipment latest::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_shipment_latest', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[shipment latest::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate shipment latest with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_shipment_latest/${copyResponse.data.data.id}`);
		}

		async function generatePdf() {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				const START_DATE = formValues.value[SHIPMENT_LATEST_START_DATE_FIELD_NAME];
				const END_DATE = formValues.value[SHIPMENT_LATEST_END_DATE_FIELD_NAME];
				const FILTER_DATE = formValues.value[SHIPMENT_LATEST_FILTER_DATE_FIELD_NAME];

				// get parcels by the FILTER_DATE within the START_DATE and END_DATE
				if (!START_DATE) {
					failureReason.value = 'Start date not selected';
					isGeneraingDoc.value = false;
					return;
				}
				if (!END_DATE) {
					failureReason.value = 'End date not selected';
					isGeneraingDoc.value = false;
					return;
				}
				if (!FILTER_DATE) {
					failureReason.value = 'Filter date not selected';
					isGeneraingDoc.value = false;
					return;
				}

				let filterDate = '';
				let isFetchFromInvoiceCollection = false;
				switch(FILTER_DATE) {
					case 'Arrival Date':
						filterDate = PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME;
						break;
					// case 'Shipment Date':
					// 	filterDate = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
					// 	break;
					case 'Invoice Date':
						isFetchFromInvoiceCollection = true;
						break;
					case 'B/L Date':
						filterDate = PARCEL_BL_DATE_FIELD_NAME;
						break;
					case 'Parcel Finalisation Date':
						filterDate = PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME;
						break;
					default:
						failureReason.value = 'Invalid filter date';
						isGeneraingDoc.value = false;
						return;
				}

				let parcelFilterString;
				if (isFetchFromInvoiceCollection) {
					// Will enter if the filter date is Invoice Date
					const invoiceResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}?filter[${INVOICE_INVOICE_FIELD_NAME}][_nnull]=true`, {params: {
						fields: [
							INVOICE_PARCEL_FIELD_NAME,
							INVOICE_INVOICE_FIELD_NAME,
						],
					}});
					if (invoiceResponse.status !== 200) {
						console.error(`[generatePdf] invoiceResponse status: ${invoiceResponse.status}`);
						failureReason.value = 'Failed to fetch invoices for filter date Invoice Date';
						isGeneraingDoc.value = false;
						return;
					}
					// filter out invoices that have invoice date between START_DATE and END_DATE, dedupe the ids
					const parcelIds = invoiceResponse.data.data.filter(invoice => {
						if (!invoice[INVOICE_INVOICE_FIELD_NAME][INVOICE_INVOICE_DATE_FIELD_NAME]) {
							return false;
						}
						const invoiceDate = new Date(invoice[INVOICE_INVOICE_FIELD_NAME][INVOICE_INVOICE_DATE_FIELD_NAME]);
						return invoiceDate >= new Date(START_DATE) && invoiceDate <= new Date(END_DATE);
					}).map(invoice => invoice[INVOICE_PARCEL_FIELD_NAME])
					.filter((parcelId, index, self) => self.indexOf(parcelId) === index);

					parcelFilterString = `filter[id][_in]=${parcelIds.join(',')}`;
				} else {
					// fetches all parcels within the selected filter date range, and sorts them in descending order according to the Invoice Date field if the Invoice Type is Latest Issued Invoice (or ascending order if the invoice type is First Issued Invoice) so the latest (or first) one can be picked out. Filters out any parcels with null Invoice Date
					parcelFilterString = `filter[_and][0][_and][0][${filterDate}][_between][0]=${START_DATE}&filter[_and][0][_and][0][${filterDate}][_between][1]=${END_DATE}`;
					
				}

				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}?${parcelFilterString}`, {
					params: {
						fields: [
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_PHYSICAL_STATUS_FIELD_NAME,
							PARCEL_FINANCIAL_STATUS_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME,
							PARCEL_WEIGHT_RESULTS_FIELD_NAME,
							PARCEL_CONTRACT_FIELD_NAME,
						]
					}
				});

				if (parcelResponce.status !== 200) {
					console.error(`[generatePdf] parcelResponce status: ${parcelResponce.status}`);
					failureReason.value = 'Failed to fetch parcels';
					isGeneraingDoc.value = false;
					return;
				}

				if (parcelResponce.data.data.length === 0) {
					failureReason.value = `No parcels found within the selected date range of ${START_DATE} to ${END_DATE} for the filter date ${FILTER_DATE}`;
					isGeneraingDoc.value = false;
					return;
				}

				// get the latest assays by method for each parcel

				const PARCELS: any[] = [];
				for (const parcel of parcelResponce.data.data as ParcelResponse[]) {
					if (parcel.contract === null) {
						failureReason.value = `Contract not selected for parcel with shipment code ${parcel.shipment_code}`;
						isGeneraingDoc.value = false;
						return;
					}
					
					const contractId = parcel.contract;
					const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${PARCEL_CONTRACT_FIELD_NAME}]=${contractId}&filter[${COMM_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME}]=true`, {params: {
						fields: [
							COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,
							COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME,
						],
					}});

					if (commodityInContractResponse.status !== 200) {
						console.error(`[generatePdf] commodityInContractResponse status: ${commodityInContractResponse.status}`);
						failureReason.value = 'Failed to fetch payable commodities';
						isGeneraingDoc.value = false;
						return;
					}
					if (commodityInContractResponse.data.data.length === 0) {
						// If no payable commodities are found, then skip this parcel
						console.log(`[generatePdf] No payable commodities found for parcel with shipment code ${parcel.shipment_code}`);
						continue
					}

					const commodityInContractIds = commodityInContractResponse.data.data.map(commInContract => commInContract[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME]);
					
					const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}?filter[id][_in]=${commodityInContractIds.join(',')}`, {params: {
						fields: [ID_FIELD_NAME, COMMODITY_NAME_FIELD_NAME, COMMODITY_CODE_FIELD_NAME],
					}});

					if (commodityResponse.status !== 200) {
						console.error(`[generatePdf] commodityResponse status: ${commodityResponse.status}`);
						failureReason.value = 'Failed to fetch commodities';
						isGeneraingDoc.value = false;
						return;
					}
					if (commodityResponse.data.data.length === 0) {
						// If no commodities are found, then skip this parcel
						throw new Error(`[generatePdf] No commodities found for parcel with shipment code ${parcel.shipment_code}`);
					}

					if (parcel.assay_results === null) {
						continue;
					}
					const payableCommoditiesCodesList = commodityResponse.data.data.map(commodity => commodity.code);
					const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${parcel.assay_results}&filter[${ASSAY_LOT_COMMODITY_FIELD_NAME}][_in]=${payableCommoditiesCodesList}&sort[]=${ASSAY_LOT_LOT_NUMBER_FIELD_NAME}`, {
						params: {
							fields: [
								ID_FIELD_NAME,
								METHOD_FIELD_NAME, 
								ASSAY_LOT_COMMODITY_FIELD_NAME,
								ASSAY_LOT_DRY_WEIGHT_FIELD_NAME,
								ASSAY_LOT_FINAL_ASSAY_FIELD_NAME, 
								ASSAY_LOT_LOT_NUMBER_FIELD_NAME,
								ASSAY_LOT_ASSAY_UOM_FIELD_NAME
							],
						}
					});
					const assays = evaluateAnalyticalAssay(assayLotResponse.data.data as AssayLotsOrCompositeForShipmentLatest[]);
					let assayByLatestMethod;
					let latestAssayMethod;
					if (!assayByLatestMethod) {
						assayByLatestMethod = assays['Outturn'];
						latestAssayMethod = 'Outturn';
					}
					if (!assayByLatestMethod) {
						assayByLatestMethod = assays['Inturn Final'];
						latestAssayMethod = 'Inturn Final';
					}
					if (!assayByLatestMethod) {
						assayByLatestMethod = assays['Inturn'];
						latestAssayMethod = 'Inturn';
					}
					if (!assayByLatestMethod) {
						assayByLatestMethod = assays['Estimated'];
						latestAssayMethod = 'Estimated';
					}
					if (!assayByLatestMethod) {
						assayByLatestMethod = assays['Planned'];
						latestAssayMethod = 'Planned';
					}
					if (!assayByLatestMethod) {
						throw new Error(`No assay lot data found for all assay methods. Please ensure assay lot data has been entered in the selected parcel.`);
					}

					console.log('assayByLatestMethod=', JSON.stringify(assayByLatestMethod));

					if (parcel.weight_result === null) {
						continue;
					}
					const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${parcel.weight_result}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {params: {
						fields: [
							ID_FIELD_NAME, 
							WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
							WEIGHT_LOT_WET_WEIGHT_FIELD_NAME, 
							METHOD_FIELD_NAME, 
							WEIGHT_LOT_MOISTURE_FIELD_NAME, 
							WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME, 
							WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME
						],
					}});

					const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);
					// if WEIGHT_METHOD is not defined, then find weight by the method field with the values Outturn, Inturn Final, Inturn, Estimated, Planned in this order
					let WEIGHT: Weight | undefined;
					if (!WEIGHT) {
						WEIGHT = weights.find(weight => weight.method === 'Outturn');
					}
					if (!WEIGHT) {
						WEIGHT = weights.find(weight => weight.method === 'Inturn Final');
					}
					if (!WEIGHT) {
						WEIGHT = weights.find(weight => weight.method === 'Inturn');
					}
					if (!WEIGHT) {
						WEIGHT = weights.find(weight => weight.method === 'Estimated');
					}
					if (!WEIGHT) {
						WEIGHT = weights.find(weight => weight.method === 'Planned');
					}
					if (!WEIGHT) {
						throw new Error(`No weight lot data found for all weight methods. Please ensure weight lot data has been entered in the selected parcel.`);
					}
					if (
						WEIGHT.dry_weight === undefined || WEIGHT.dry_weight === null || 
						WEIGHT.wet_weight === undefined || WEIGHT.wet_weight === null || 
						WEIGHT.moisture === undefined || WEIGHT.moisture === null || 
						WEIGHT.dry_weight_uom === undefined || WEIGHT.dry_weight_uom === null || 
						WEIGHT.wet_weight_uom === undefined || WEIGHT.wet_weight_uom === null || 
						WEIGHT.method === undefined || WEIGHT.method === null) {
						throw new Error(`One of the fields for weight lots is undefined`);
					}
					
					if (DRY_WEIGHT_UOM.value === '') {
						// ASSUMPTIONS: the first parcel's dry weight uom is the same as the uom for all other parcels
						DRY_WEIGHT_UOM.value = WEIGHT.dry_weight_uom;
					}
					if (WET_WEIGHT_UOM.value === '') {
						// ASSUMPTIONS: the first parcel's wet weight uom is the same as the uom for all other parcels
						WET_WEIGHT_UOM.value = WEIGHT.wet_weight_uom;
					}

					const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}/${parcel[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
						fields: [COUNTERPARTY_CODENAME_FIELD_NAME],
					}});

					const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcel[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
						fields: [
							PORT_NAME_FIELD_NAME,
						],
					}});

					const vesselId = parcel[PARCEL_VESSEL_FIELD_NAME];
					let vesselResponse;
					if (!!vesselId) {
						vesselResponse = await api.get(`/items/${VESSEL_COLLECTION_NAME}/${vesselId}`, {params: {
							fields: [VESSEL_NAME_FIELD_NAME],
						}});
					}

					// reduce this to a mapping of commodity code to commodity name
					const commodityCodeToNameMap = commodityResponse.data.data.reduce((acc, commodity) => {
						acc[commodity.code] = commodity.name;
						return acc;
					}, {});

					console.log('commodityCodeToNameMap=', JSON.stringify(commodityCodeToNameMap));

					const metalUomList = commodityInContractResponse.data.data.map(commInContract => commInContract[COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]);
					const pricePerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_KEY_FIELD_NAME}][_in]=${metalUomList.join(',')}`, {params: {
						fields: [UNIT_KEY_FIELD_NAME, UNIT_SYMBOL_FIELD_NAME],
					}});
					const unitNameToSymbolMap = pricePerUomResponse.data.data.reduce((acc, unit) => {
						acc[unit[UNIT_KEY_FIELD_NAME]] = unit[UNIT_SYMBOL_FIELD_NAME];
						return acc;
					}, {});

					// const commodityCodeToMetalUomMap = commodityInContractResponse.data.data.reduce((acc, commInContract) => {
					// 	const commodityCodeById = commodityResponse.data.data.find(c => c[ID_FIELD_NAME] === commInContract[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME])[COMMODITY_CODE_FIELD_NAME];
					// 	const commodityUom = unitNameToSymbolMap[commInContract[COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]];
					// 	acc[commodityCodeById] = commodityUom;
					// 	return acc;
					// }, {});

					commodityInContractResponse.data.data.forEach(commInContract => {
						const commodityCodeById = commodityResponse.data.data.find(c => c[ID_FIELD_NAME] === commInContract[COMM_IN_CONTRACT_COMMODITY_FIELD_NAME])[COMMODITY_CODE_FIELD_NAME];
						if (!commodityCodeToMetalUomMap[commodityCodeById]) {
							const commodityUom = unitNameToSymbolMap[commInContract[COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]];
							commodityCodeToMetalUomMap[commodityCodeById] = commodityUom;
						}
					});

					console.log('commodityCodeToMetalUomMap=', JSON.stringify(commodityCodeToMetalUomMap));

					const dryWeightConversionValue = await getWeightUnitConversionValue(WEIGHT.dry_weight_uom, DRY_WEIGHT_UOM.value);

					const wetWeightByDefaultWetWeightUom = WEIGHT.wet_weight * dryWeightConversionValue; // using dry weight conversion value because they both should have the same conversion value, so we'll only need to fetch just one, and there will be more inaccurate values if dry weight value is wrong so we will use the conversion to dry weight uom over wet
					const dryWeightByDefaultDryWeightUom = WEIGHT.dry_weight * dryWeightConversionValue;

					const parcelForRequestBody = {
						"name": parcel.shipment_code,
						"counterparty": counterpartyResponse.data.data[COUNTERPARTY_CODENAME_FIELD_NAME],
						"port": destinationPortResponse.data.data[PORT_NAME_FIELD_NAME],
						"vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
						"phy_status": parcel.physical_status,
						"fin_status": parcel.financial_status,
						// "shipment_date": formatShortDate(new Date(parcel.actual_shipment_date)),
						"shipment_date": formatShortDate(new Date(parcel[PARCEL_BL_DATE_FIELD_NAME])),
						"weight_source": WEIGHT.method,
						"wet_weight": wetWeightByDefaultWetWeightUom,
						"moisture": WEIGHT.moisture,
						"dry_weight": dryWeightByDefaultDryWeightUom,
						"assay_source": latestAssayMethod,
						"assays": await generateAssayForRequest(assayByLatestMethod, commodityCodeToNameMap, commodityCodeToMetalUomMap, dryWeightByDefaultDryWeightUom)
					}

					PARCELS.push(parcelForRequestBody);
				}
				// if multiple parcels have the same shipment code, then add a bracket number to identify each one

				// get the payable commodities only for each parcel from contract by checking if they have the payable fields filled in
				// filter out assays that are not payable for each parcel

				// get the aggregate assay values for each parcel

				// get the wet and dry weight uoms and assign them to the refs

				const companyDataResponse = await api.get(`/items/${COMPANY_COLLECTION_NAME}`, { params: {
					fields: [
						COMPANY_LOGO_FIELD_NAME,
					]
				}});

				const companyData = companyDataResponse.data.data;
				let companyLogoData: ImageData | null = null;
				if (!!companyData[COMPANY_LOGO_FIELD_NAME]) {
					const companyLogoId = companyData[COMPANY_LOGO_FIELD_NAME];
					const companyLogoFile = await api.get(`/assets/${companyLogoId}`, { responseType: 'arraybuffer' });
					// Convert the response data to a Buffer
					const imageBuffer = Buffer.from(companyLogoFile.data, 'binary');
					// Determine the image type
					const imageType = companyLogoFile.headers['content-type'] as ImageType;
					if (Object.values(ImageType).includes(imageType)) {
						companyLogoData = {
							// Convert the buffer to a base64 string
							imageData: imageBuffer.toString('base64'),
							imageType
						};
					}
				}

				const requestBody = {
					"folder_id": await getFolderID(),
					"company_logo": companyLogoData,
					"start_date": formatDate(new Date(START_DATE)),
					"end_date": formatDate(new Date(END_DATE)),
					"filter_date": FILTER_DATE,
					"parcels": PARCELS,
					// "parcels": [
					// 	{
					// 		"name": "TB-364-DRY",
					// 		"counterparty": "TB",
					// 		"port": "Huangpu New Port",
					// 		"vessel": "Edwine Oldendorff",
					// 		"status": "QP Known",
					// 		"shipment_date": "22 May 23",
					// 		"weight_source": "Outturn",
					// 		"wet_weight": 11665.22,
					// 		"moisture": 15.30,
					// 		"dry_weight": 9880.468,
					// 		"assay_source": "Outturn",
					// 		"assays": [
					// 			{
					// 				"commodity": "Copper",
					// 				"code": "Cu",
					// 				"assay": 45.7414,
					// 				"assay_uom": "%",
					// 				"contained_metal": 4519.469,
					// 				"contained_metal_uom": "t"
					// 			}
					// 		]
					// 	},
					// 	{
					// 		"name": "TB-439-NRT",
					// 		"counterparty": "JAS",
					// 		"port": "Huangpu New Port",
					// 		"vessel": "Edwine Oldendorff",
					// 		"status": "QP Known",
					// 		"shipment_date": "10 May 23",
					// 		"weight_source": "Outturn",
					// 		"wet_weight": 11724.340,
					// 		"dry_weight": 9990.243,
					// 		"moisture": 14.79,
					// 		"assay_source": "Outturn",
					// 		"assays": [
					// 			{
					// 				"commodity": "Gold",
					// 				"code": "Au",
					// 				"assay": 176.3003,
					// 				"assay_uom": "g/t",
					// 				"contained_metal": 56626.5159,
					// 				"contained_metal_uom": "oz"
					// 			},
					// 			{
					// 				"commodity": "Copper",
					// 				"code": "Cu",
					// 				"assay": 45.7813,
					// 				"assay_uom": "%",
					// 				"contained_metal": 4573.6669,
					// 				"contained_metal_uom": "t"
					// 			}
					// 		]
					// 	},
					// 	{
					// 		"name": "TB-632-NRT",
					// 		"counterparty": "JAS",
					// 		"port": "Huangpu New Port",
					// 		"vessel": "Edwine Oldendorff",
					// 		"status": "QP Known",
					// 		"shipment_date": "10 May 23",
					// 		"weight_source": "Outturn",
					// 		"wet_weight": 6236.340,
					// 		"dry_weight": 3634.243,
					// 		"moisture": 44.79,
					// 		"assay_source": "Outturn",
					// 		"assays": [
					// 			{
					// 				"commodity": "Silver",
					// 				"code": "Ag",
					// 				"assay": 253.3003,
					// 				"assay_uom": "g/t",
					// 				"contained_metal": 1235.5159,
					// 				"contained_metal_uom": "oz"
					// 			},
					// 			{
					// 				"commodity": "Zinc",
					// 				"code": "Zn",
					// 				"assay": 45.7813,
					// 				"assay_uom": "%",
					// 				"contained_metal": 6245.6669,
					// 				"contained_metal_uom": "t"
					// 			}
					// 		]
					// 	},
					// 	{
					// 		"name": "TB-254-GHD (1)",
					// 		"counterparty": "DRY",
					// 		"port": "Lianyungang",
					// 		"vessel": "Edwine Oldendorff",
					// 		"status": "QP Known",
					// 		"shipment_date": "21 May 23",
					// 		"weight_source": "Outturn",
					// 		"wet_weight": 9363.660,
					// 		"dry_weight": 8008.893,
					// 		"moisture": 14.47,
					// 		"assay_source": "Outturn",
					// 		"assays": [
					// 			{
					// 				"commodity": "Copper",
					// 				"code": "Cu",
					// 				"assay": 45.4081,
					// 				"assay_uom": "%",
					// 				"contained_metal": 3636.6822,
					// 				"contained_metal_uom": "t"
					// 			}
					// 		]
					// 	},
					// 	{
					// 		"name": "TB-254-GHD (2)",
					// 		"counterparty": "JAS",
					// 		"port": "Lianyungang",
					// 		"vessel": "MV New Momentum",
					// 		"status": "QP Known",
					// 		"shipment_date": "15 May 23",
					// 		"weight_source": "Outturn",
					// 		"wet_weight": 2345.02,
					// 		"dry_weight": 2000.372,
					// 		"moisture": 14.70,
					// 		"assay_source": "Outturn",
					// 		"assays": [
					// 			{
					// 				"commodity": "Copper",
					// 				"code": "Cu",
					// 				"assay": 45.3896,
					// 				"assay_uom": "%",
					// 				"contained_metal": 907.9614,
					// 				"contained_metal_uom": "t"
					// 			}
					// 		]
					// 	}
					// ],
					"wet_weight_uom": WET_WEIGHT_UOM.value?.toUpperCase(),
					"dry_weight_uom": DRY_WEIGHT_UOM.value?.toUpperCase()
				}

				let response: any;
				try {
					response = await api.post(SHIPMENT_LATEST_DOCGEN_ENDPOINT, requestBody);
				} catch (error) {
					console.error(`[generatePdf] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generatePdf] response status: ${response.status}`);
					failureReason.value = response.data;
					isGeneraingDoc.value = false;
					return;
				}
				
				const docID = await uploadGeneratedDoc(response.data);
				
				// Clear the company logo and signature images and pass in doc id
				requestBody['doc_name'] = docID;
				requestBody['company_logo'] = null;
				requestBody['signatory']['signature'] = null;

				emit('input', requestBody);
				isGeneraingDoc.value = false;
				// viewPdf(docID);
				downloadPdf(docID);
			} catch (error) {
				failureReason.value = error.message;
				isGeneraingDoc.value = false;
			}
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Shipment Latest')}`);

			if (folderResponse.status === 200 && !!folderResponse.data && !!folderResponse.data.data) {
				if (folderResponse.data.data.length === 0) {
					return await createFolderIfNotExist();
				}
				return folderResponse.data.data[0].id;
			}
			return null;
		}

		async function createFolderIfNotExist() {
			const response = await api.post('/folders', {
				name: 'Shipments Latest',
			});

			return response.data.data.id;
		}

		async function uploadGeneratedDoc(fileData: any) {
			if (!fileData) {
				console.error(`[uploadGeneratedDoc] fileData is empty`);
				throw new Error('A failure occured while trying to upload the generated document, no file data found. Please try again.');
			}
			const formData = convertJsonToFormData(fileData);

			const uploadedFileData = await api.post('/files', formData, {
				headers: {
					'Content-Type': 'multipart/form-data'
				}
			});

			if (uploadedFileData.status !== 200) {
				console.error(`[uploadGeneratedDoc] uploadedFileData status: ${uploadedFileData.status}`);
				throw new Error('A failure occured while trying to upload the generated document. Please try again.');
			}

			return uploadedFileData.data.data['id'];
		}

		function base64ToBlob(base64, mimeType) {
			// Decode base64 string
			const byteCharacters = atob(base64); // TODO: this is deprecated, find an alternative for this, can't use Buffer.from in a Vue component

			// Create an ArrayBuffer of the correct length
			const arrayBuffer = new ArrayBuffer(byteCharacters.length);

			// Create a view of the ArrayBuffer
			const uint8Array = new Uint8Array(arrayBuffer);

			// Fill the Uint8Array with the decoded data
			for (let i = 0; i < byteCharacters.length; i++) {
				uint8Array[i] = byteCharacters.charCodeAt(i);
			}

			// Create a Blob from the Uint8Array
			const blob = new Blob([uint8Array], {type: mimeType});

			return blob;
		}

		function convertJsonToFormData(json) {
			console.log('[convertJsonToFormData] json=', JSON.stringify(json))
			const formData = new FormData();
			for (let key in json) {
				if (key !== 'file') {
					formData.append(key, json[key]);
				}
			}

			// for some reason, the 'file' field must come last or any other fields that come after it will be sent but not processed by the server
			const base64String = json['file'];
			const mimeType = 'application/pdf';
			const blob = base64ToBlob(base64String, mimeType);
			formData.append('file', blob, json['filename_download']);
			return formData;
		}

		async function downloadPdf(docID?: string): Promise<void> {
			// open the invoice in a new tab
			const documentID = docID ?? props.value['doc_name'];
			console.log(`[downloadPdf] doc ID: ${documentID}`);
			if (!documentID) {
				throw new Error('No document ID found, please ensure the document has been generated');
			}

			try {
				const filenameDownloadResponse = await api.get(`/files/${documentID}`);
				const filenameDownload = filenameDownloadResponse.data.data['filename_download'];
				const response = await api.get(`/assets/${documentID}`, {
					responseType: 'arraybuffer' // this is required or the downloaded pdf will be blank
				});

				// Convert response.data to Blob
				const blob = new Blob([response.data], { type: 'application/pdf' });

				// Create a URL for the Blob
				const url = URL.createObjectURL(blob);

				// Create a link element
				const link = document.createElement('a');
				link.href = url;
				link.download = filenameDownload ?? 'shipment-latest.pdf';

				// Append the link to the document
				document.body.appendChild(link);

				// Trigger the download
				link.click();

				// Remove the link from the document
				document.body.removeChild(link);

				// Revoke the object URL
				URL.revokeObjectURL(url);
			} catch (error) {
				console.error(`[downloadPdf] error: ${error}`);
				throw new Error('Failed to fetch the document, please try again');
			}
		}

		function viewPdf(docID?: string): void {
			// open the invoice in a new tab
			const documentID = docID ?? props.value['doc_name'];
			console.log(`[viewPdf] doc ID: ${documentID}`);
			
			// The access token must be the token of the current logged in user, else using another user's token will result in a 403 error
			window.open(`/assets/${documentID}?access_token=9TKZlOUjs29Svyop45nyyyN02lYPlX_x`);

			// // open the invoice in a new tab
			// const docName = documentName ?? props.value['doc_name'];
			// console.log(`[viewPdf] doc name: ${docName}`);
			// // console.log(`[viewPdf] doc path: ${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// // const encodedValue = encodeURIComponent(`${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// const encodedValue = encodeURIComponent(`${docName}.pdf`);
			// const url = `/display-doc?docname=${encodedValue}`;
			// window.open(url);
		}

		async function generateAssayForRequest(assays: {[key: string]: {analytical_assay: number, assay_uom: string}}, commodityCodeToNameMap: Record<string, string>, commodityCodeToMetalUomMap: Record<string, string>, dryWeight: number) {
			// input params: Assays, dry weight
			// get list of keys from assays
			const commodities = Object.keys(assays);
			return await Promise.all(commodities.map(async (commodity) => {
				const assay = assays[commodity];
				if (!assayUomByCommodityCode[commodity]) {
					assayUomByCommodityCode[commodity] = assay.assay_uom;
				}
				const assayConversionValue = await getAssayUnitConversionValue(assay.assay_uom, assayUomByCommodityCode[commodity]);
				const containedMetalConversionValue = await getConversionValuesForContainedMetal(
					commodityCodeToMetalUomMap[commodity], 
					DRY_WEIGHT_UOM.value,
					assay.assay_uom
				);
				return {
					"commodity": commodityCodeToNameMap[commodity],
					"code": commodity,
					"assay": assay.analytical_assay * assayConversionValue,
					"assay_uom": assayUomByCommodityCode[commodity],
					"contained_metal": dryWeight * assay.analytical_assay * containedMetalConversionValue,
					"contained_metal_uom": commodityCodeToMetalUomMap[commodity]
				}
			}));
		}

		// function to convert a Date object into DD MMM YYYY format
		function formatDate(date: Date) {
			// get the day of week of the input date
			const dayOfWeek = date.getDay();
			const weekDayNames = [
				"Sunday", "Monday", "Tuesday",
				"Wednesday", "Thursday", "Friday", "Saturday",
			];

			const monthNames = [
				"January", "February", "March",
				"April", "May", "June", "July",
				"August", "September", "October",
				"November", "December",
			];
			const day = date.getDate();
			const monthIndex = date.getMonth();
			const year = date.getFullYear();
			return `${day} ${monthNames[monthIndex]} ${year} (${weekDayNames[dayOfWeek]})`;
		}

		function formatShortDate(date: Date) {
			const monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov", "Dec"
			];
			const day = date.getDate();
			const monthIndex = date.getMonth();
			// get the last two digits of the date year
			const year = date.getFullYear().toString().slice(-2);
			return `${day} ${monthNames[monthIndex]} ${year}`;
		}

		function evaluateWeights(lots: WeightLot[]): Weight[] {
			console.log('[evaluateWeights]');
			const weightData = {};
			for(const lot of lots) {
				if (!weightData[lot.method]) {
					console.log(`adding method ${lot.method} to weightData object`)
					weightData[lot.method] = [];
				}
				// the property names in 'weightData' match the string values of corresponding MethodEnum enums
				console.log(`adding lot ${lot.id} to weightData.${lot.method} array`)
				weightData[lot.method.toString()].push(lot);
			}
			const weights: Weight[] = [];
			// for(const method in weightData) {
			for(const method of Object.keys(weightData)) {
				if (!weightData[method]) {
					console.log(`method=${method} does not exist in weightData object`)
					// only push weight lots to 'weights' if there exists lots for a given method
					continue;
				}
				console.log(`adding lots and other values to weights for method=${method}`)
				const weight = evaluateWeightData(weightData[method]);

				if (!!weight) {
					weights.push(weight);
				}
			}

			return weights;
		}

		function evaluateWeightData(weightLots: WeightLot[]): Weight | undefined {
			console.log('[evaluateWeightData]');
			if (weightLots.length === 0) {
				return undefined;
			}
			const dryWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.DRY_WEIGHT);
			const wetWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.WET_WEIGHT);
			return {
				method: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.METHOD),
				lots: weightLots,
				dry_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.DRY_WEIGHT_UOM),
				wet_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.WET_WEIGHT_UOM),
				dry_weight: dryWeight,
				wet_weight: wetWeight,
				moisture: (wetWeight - dryWeight) / wetWeight * 100,
			} as Weight
		}

		function getFirstValueAsSharedValue(lots: WeightLot[], field: SharedLotPropertyFields) {
			console.log('[getFirstValueAsSharedValue]');
			if (lots.length === 0) {
				return undefined;
			}
			console.log(`lots[0][${field.toString()}]=${lots[0][field.toString()]}`);
			// the string values of SharedLotPropertyFields match the corresponding property names in WeightLot
			return lots[0][field.toString()];
		}

		function evaluateAggregateValue(lots: WeightLot[], field: AggregatableWeightLotFields): number {
			console.log('[evaluateAggregateValue]');
			return lots.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue[field.toString()] ?? '0'), 0);
		}

		function evaluateAnalyticalAssay(assayLotsOrComposites: AssayLotsOrCompositeForShipmentLatest[]) {
			console.log('[evaluateAnalyticalAssay]');
			// probably use INTURN or INTURN_FINAL only, confirm with Taylor
			const group = {};
			for(const assayLotOrComposite of assayLotsOrComposites) {
				if (!group[assayLotOrComposite.method]) {
					group[assayLotOrComposite.method] = {};
				}
				if (!group[assayLotOrComposite.method][assayLotOrComposite.commodity]) {
					group[assayLotOrComposite.method][assayLotOrComposite.commodity] = [];
				}
				if (assayLotOrComposite.lot_number !== null) {
					if (
						(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForShipmentLatest>).length === 1 &&
						group[assayLotOrComposite.method][assayLotOrComposite.commodity][0].lot_number === null
					) {
						// assay for this commodity-method combination is assay lot, remove composite assay if present
						group[assayLotOrComposite.method][assayLotOrComposite.commodity] = [];
					}
					// only push assay lots to group if they have a lot number
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				} else if (
					assayLotOrComposite.lot_number === null && 
					(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForShipmentLatest>).length === 0
				) {
					// a composite assay for commodity-method combination, only add it in if it is the first and no other composite assay exists for this combination. There should only be one composite assay per commodity-method combination in a parcel
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				}
			}
			console.log(`[evaluateAnalyticalAssay] group: ${JSON.stringify(group)}}`);
			const analyticalAssay = {};
			for(const methodKey in group) {
				console.log(`[evaluateAnalyticalAssay] methodKey: ${methodKey}, group[methodKey]: ${JSON.stringify(group[methodKey])}`);
				for(const commodityKey in group[methodKey]) {
					console.log(`[evaluateAnalyticalAssay] commodityKey: ${commodityKey}, group[methodKey][commodityKey]: ${JSON.stringify(group[methodKey][commodityKey])}`);
					// calculate average of final_assay value for each commodity and assign the calculated value to the same path in analyticalAssay
					analyticalAssay[methodKey] = analyticalAssay[methodKey] ?? {};
					analyticalAssay[methodKey][commodityKey] = {};
					const totalDryWeight = group[methodKey][commodityKey].reduce((accumulator: number, currentValue) => accumulator + parseFloat(currentValue[ASSAY_LOT_DRY_WEIGHT_FIELD_NAME] ?? '0'), 0);
					console.log(`[evaluateAnalyticalAssay] totalDryWeight: ${totalDryWeight} from ${JSON.stringify(group[methodKey][commodityKey])}`)
					analyticalAssay[methodKey][commodityKey]['analytical_assay'] = group[methodKey][commodityKey].reduce((accumulator, currentValue) => accumulator + (parseFloat(currentValue[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME] ?? '0') * parseFloat(currentValue[ASSAY_LOT_DRY_WEIGHT_FIELD_NAME] ?? '0')), 0) / (totalDryWeight !== 0 ? totalDryWeight : 1); // if due to any error, totalDryWeight equals 0, then divide it by 1 to prevent division by 0 error
					console.log(`[evaluateAnalyticalAssay] analytical assay: ${analyticalAssay[methodKey][commodityKey]['analytical_assay']}`)
					if (group[methodKey][commodityKey].length > 0) {
						analyticalAssay[methodKey][commodityKey][ASSAY_LOT_ASSAY_UOM_FIELD_NAME] = group[methodKey][commodityKey][0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME];
					}
				}
			}
			console.log(`[evaluateAnalyticalAssay] analyticalAssay: ${JSON.stringify(analyticalAssay)}`);
			return analyticalAssay;
		}

		/**
		 * Need to handle the following cases:
		 * - weight to weight uom conversion to a standard wet/dry weight uom
		 * 		- handled by getWeightUnitConversionValue()
		 * - assay to assay uom conversion to a standard assay uom for each element
		 * 		- handled by getAssayUnitConversionValue()
		 * - weight and assay uom conversion to a standard contained metal uom for each element
		 * 		- handled by getConversionValuesForContainedMetal()
		 */

		async function getWeightUnitConversionValue(sourceWeightUnitSymbol: string, targetWeightUnitSymbol: string): Promise<number> {
			if (sourceWeightUnitSymbol === targetWeightUnitSymbol) {
				return 1;
			}
			const sourceWeightUnitToGrams = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_SYMBOL_FIELD_NAME}]=${sourceWeightUnitSymbol}`, {
				params: { fields: [ UNIT_CONVERSION_TO_GRAM_FIELD_NAME ] }
			});

			if (sourceWeightUnitToGrams.data.data.length === 0 || sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === null || sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === undefined) {
				throw new Error(`[getWeightUnitConversionValue] failed to get conversion value for source weight unit ${sourceWeightUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const targetWeightUnitToGrams = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_SYMBOL_FIELD_NAME}]=${targetWeightUnitSymbol}`, {
				params: { fields: [ UNIT_CONVERSION_TO_GRAM_FIELD_NAME ] }
			});

			if (targetWeightUnitToGrams.data.data.length === 0 || targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === null || targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME] === undefined) {
				throw new Error(`[getWeightUnitConversionValue] failed to get conversion value for the target weight unit ${targetWeightUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const sourceUnitConversion = parseFloat(sourceWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME]);
			if (isNaN(sourceUnitConversion)) {
				throw new Error(`[getWeightUnitConversionValue] source weight unit ${sourceWeightUnitSymbol} conversion value=${sourceUnitConversion} is not a number`);
			}

			const targetUnitConversion = parseFloat(targetWeightUnitToGrams.data.data[0][UNIT_CONVERSION_TO_GRAM_FIELD_NAME]);
			if (isNaN(targetUnitConversion)) {
				throw new Error(`[getWeightUnitConversionValue] target weight unit ${targetWeightUnitSymbol} conversion value=${targetUnitConversion} is not a number`);
			}

			console.log(`[getWeightUnitConversionValue] source weight unit=${sourceWeightUnitSymbol}, target weight unit=${targetWeightUnitSymbol}, source weight unit conversion=${sourceUnitConversion}, target weight unit conversion=${targetUnitConversion}`);
			console.log(`[getWeightUnitConversionValue] conversion factor=${sourceUnitConversion / targetUnitConversion}`);
			return sourceUnitConversion / targetUnitConversion;
		}

		async function getAssayUnitConversionValue(sourceAssayUnitSymbol: string | undefined, targetAssayUnitSymbol: string | undefined): Promise<number> {
			if (
				sourceAssayUnitSymbol === null || 
				sourceAssayUnitSymbol === undefined || 
				targetAssayUnitSymbol === null || 
				targetAssayUnitSymbol === undefined
			) {
				return 1;
			}
			if (sourceAssayUnitSymbol === targetAssayUnitSymbol) {
				return 1;
			}
			const sourceaAssayUnitToPpb = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}?filter[${ASSAY_UNIT_UNIT_FIELD_NAME}]=${sourceAssayUnitSymbol}`, {
				params: { fields: [ ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME ] }
			});

			if (sourceaAssayUnitToPpb.data.data.length === 0 || sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === undefined || sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === null) {
				throw new Error(`[getAssayUnitConversionValue] failed to get conversion value for source weight unit ${sourceAssayUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const targetAssayUnitToPpb = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}?filter[${ASSAY_UNIT_UNIT_FIELD_NAME}]=${targetAssayUnitSymbol}`, {
				params: { fields: [ ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME ] }
			});

			if (targetAssayUnitToPpb.data.data.length === 0 || targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === undefined || targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME] === null) {
				throw new Error(`[getAssayUnitConversionValue] failed to get conversion value for the target weight unit ${targetAssayUnitSymbol}. Ensure that the symbol is correct and is a weight unit symbol`);
			}

			const sourceUnitConversion = parseFloat(sourceaAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME]);
			if (isNaN(sourceUnitConversion)) {
				throw new Error(`[getAssayUnitConversionValue] source weight unit ${sourceAssayUnitSymbol} conversion value=${sourceUnitConversion} is not a number`);
			}

			console.log(`[getAssayUnitConversionValue] source unit conversion value=${sourceUnitConversion}`);

			const targetUnitConversion = parseFloat(targetAssayUnitToPpb.data.data[0][ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME]);
			if (isNaN(targetUnitConversion)) {
				throw new Error(`[getAssayUnitConversionValue] target weight unit ${sourceAssayUnitSymbol} conversion value=${targetUnitConversion} is not a number`);
			}

			console.log(`[getAssayUnitConversionValue] target unit conversion value=${targetUnitConversion}`);


			// the data fetched via the api is to factor to convert the source unit to ppb by multiplication, then to the target unit by division
			console.log(`[getAssayUnitConversionValue] returning ${sourceUnitConversion / targetUnitConversion}`)
			return sourceUnitConversion / targetUnitConversion;
		}

		async function getConversionValuesForContainedMetal(
			targetWeightUnit: string,  // e.g. t, kg, g, mt, Mt, oz, lb, etc.
			dryWeightUnit: string, // e.g. dmt, dMt, etc.
			assayUnit: string // e.g. %, g/t, oz/t, ppm, ppb, etc.
		): Promise<number> {
			const dryWeightUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${dryWeightUnit}`, {
				params: { fields: [ UNIT_SYMBOL_FIELD_NAME ] }
			});
			if (!dryWeightUomResponse.data.data || !dryWeightUomResponse.data.data[0] || !dryWeightUomResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME]) {
				throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] Dry weight uom not found for symbol ${dryWeightUnit}`);
			}
			const originalWeightUnit = dryWeightUomResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME];
			if (assayUnit === '%') {
				// percentage assay unit is a special case where we directly convert the dry weight unit to the target weight unit
				if (originalWeightUnit === targetWeightUnit) {
					// if target unit and dry weight unit are the same, the only conversion needed is to divide it by 100 after multiplying by the assay value because it's measured in percentage
					return 0.01;
				}
				return await getWeightUnitConversionValue(originalWeightUnit, targetWeightUnit);
			}
			let splitAssayUnit = assayUnit.split('/');

			if (splitAssayUnit.length == 1)  {
				const assayUnitCompResponse = await getAssayUnitComposition(assayUnit);
				if (!assayUnitCompResponse) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] assay unit ${assayUnit} does not have a composition`);
				}
				splitAssayUnit = assayUnitCompResponse.split('/');
			}

			if (splitAssayUnit.length > 2 || splitAssayUnit.length === 0) {
				throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] assay unit ${assayUnit} is not in the format of 'unit1/unit2'`);
			}

			const assayUnitNumerator = splitAssayUnit[0];
			const assayUnitDenominator = splitAssayUnit[1];

			let conversionValue = 1;

			if (assayUnitDenominator !== originalWeightUnit) {
				const conversionValueForOriginalWeightUomAndAssayUomDenominator = await getWeightUnitConversionValue(originalWeightUnit, assayUnitDenominator);
				if (
					isNaN(conversionValueForOriginalWeightUomAndAssayUomDenominator) || 
					conversionValueForOriginalWeightUomAndAssayUomDenominator === 0
				) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] conversion value=${conversionValueForOriginalWeightUomAndAssayUomDenominator} for original weight unit ${originalWeightUnit} and assay unit denominator ${assayUnitDenominator} is not a number or is zero`);
				}
				conversionValue *= conversionValueForOriginalWeightUomAndAssayUomDenominator;
			}

			if (assayUnitNumerator !== targetWeightUnit) {
				const conversionValueForEvaluatedContainedMetalUomToTargetWeightUom = await getWeightUnitConversionValue(assayUnitNumerator, targetWeightUnit);
				if (
					isNaN(conversionValueForEvaluatedContainedMetalUomToTargetWeightUom) || 
					conversionValueForEvaluatedContainedMetalUomToTargetWeightUom === 0
				) {
					throw new Error(`[getConversionValuesAndUnitsForPayableMetalCalculation] conversion value=${conversionValueForEvaluatedContainedMetalUomToTargetWeightUom} for evaluated contained metal uom ${assayUnitNumerator} and target weight unit ${targetWeightUnit} is not a number or is zero`);
				}
				conversionValue *= conversionValueForEvaluatedContainedMetalUomToTargetWeightUom;
			}

			console.log(`[getConversionValuesAndUnitsForPayableMetalCalculation] returning conversion value=${conversionValue}`);
			return conversionValue;
		}

		async function getAssayUnitComposition(assayUnit: string): Promise<string> {
			const assayUnitCompositionResponse = await api.get(`/items/${ASSAY_UNIT_COLLECTION_NAME}`, {
				params: { 
					fields: [ ASSAY_UNIT_UNIT_FIELD_NAME, ASSAY_UNIT_COMPOSITION_FIELD_NAME ],
					filter: {
						[ASSAY_UNIT_COMPOSITION_FIELD_NAME]: { 
							"_nnull": true,
						},
						[ASSAY_UNIT_UNIT_FIELD_NAME]: {
							"_eq": assayUnit,
						}
					} 
				}
			});

			if (assayUnitCompositionResponse.status !== 200 || !assayUnitCompositionResponse.data || assayUnitCompositionResponse.data.data.length === 0) {
				throw new Error(`[getAssayUnitComposition] no assay units found with composition`);
			}

			return assayUnitCompositionResponse.data.data[0][ASSAY_UNIT_COMPOSITION_FIELD_NAME];
		}
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>
