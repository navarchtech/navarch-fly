<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generatePdf()"
			:loading="isGeneraingDoc"
		>Generate Weight & Assay Cert</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadPdf()"
		>Download Weight & Assay Cert
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

type AssayLotsOrCompositeForProcessing = {
	// copied from AssayLotsOrCompositeForInvoice in the invoice generator
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

type Weight = {
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

type Assay = {
	commodity: string;
	final_assay: number;
	assay_uom: string;
}

type AssayForGenerator = {
	commodity_name: string;
	analytical_assay: number;
	assay_uom: string;
}

type Commodity = {
	code: string;
	name: string;
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
		const LATEST_METHOD: Ref<string | null> = ref(null); // TODO: when cleaning up, need to standardise how the latest method is fetched here and in Assay Exchange generator, and possibly elsewhere
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		// Field in the form named 'parcel'
		const WA_PARCEL_FIELD_NAME = 'parcel';
		// const WA_INVOICE_TYPE_FIELD_NAME = 'invoice_type'; // not needed anymore, getting latest method from assay lots

		const PROVE_WEIGHT_AND_ASSAY_CERT_GENERATOR_PATH = '/generate/weight-and-assay-cert';

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_ORIGIN_FIELD_NAME = 'origin';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
	
		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_COMMODITY_FIELD_NAME = 'commodity';
		const ASSAY_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		const ASSAY_LOT_BUYER_ASSAY_FIELD_NAME = 'buyer_assay';
		const ASSAY_LOT_SELLER_ASSAY_FIELD_NAME = 'seller_assay';
		const ASSAY_LOT_FINAL_ASSAY_FIELD_NAME = 'final_assay';
		const ASSAY_LOT_ASSAY_UOM_FIELD_NAME = 'assay_uom';
		const ASSAY_LOT_LOT_NUMBER_FIELD_NAME = 'lot_number';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_WET_WEIGHT_FIELD_NAME = 'wet_weight';
		const WEIGHT_LOT_MOISTURE_FIELD_NAME = 'moisture';
		const WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME = 'wet_weight_uom';
		const WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		
		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_NAME_FIELD_NAME = 'name';
		const COMPANY_LOGO_FIELD_NAME = 'logo';
		const COMPANY_LINE_1_FIELD_NAME = 'line_1';
		const COMPANY_LINE_2_FIELD_NAME = 'line_2';
		const COMPANY_CITY_FIELD_NAME = 'city';
		const COMPANY_STATE_FIELD_NAME = 'state';
		const COMPANY_COUNTRY_FIELD_NAME = 'country';
		const COMPANY_ZIP_FIELD_NAME = 'zip';
		const COMPANY_PHONE_CODE_FIELD_NAME = 'phone_code';
		const COMPANY_PHONE_NUMBER_FIELD_NAME = 'phone_number';
		const COMPANY_EMAIL_FIELD_NAME = 'email';
		const COMPANY_SIGNATORY_NAME_FIELD_NAME = 'signatory_name';
		const COMPANY_SIGNATORY_TITLE_FIELD_NAME = 'signatory_title';
		const COMPANY_SIGNATURE_FIELD_NAME = 'signature';

		const COUNTRY_COLLECTION_NAME = 'navarch_country';
		const COUNTRY_NAME_FIELD_NAME = 'name';
		const COUNTRY_PHONE_CODE_FIELD_NAME = 'phone_code';

		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';
		const PORT_COUNTRY_FIELD_NAME = 'country';

		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_PRIMARY_COMMODITY_FIELD_NAME = 'primary_commodity';

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
	
		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_NAME_FIELD_NAME = 'name';

		return { 
			isGeneraingDoc,
			failureReason,
			generatePdf,
			isCopying,
			copy,
			viewPdf,
			downloadPdf,
		};

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, weight_and_assay_cert, ...requestBody } = formValues.value;
			console.log(`[weight & assay::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_weight_and_assay_cert', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[weight & assay::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate weight & assay with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_weight_and_assay_cert/${copyResponse.data.data.id}`);
		}
		
		async function generatePdf() {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				const parcelId = formValues.value[WA_PARCEL_FIELD_NAME];
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							PARCEL_ASSAY_RESULTS_FIELD_NAME, 
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							// PARCEL_INVOICE_DATE_FIELD_NAME, 
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							// PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME
						]
					}
				});	

				const assayForeignKey = parcelResponce.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME];
				const weightForeignKey = parcelResponce.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME];
				// const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&filter[${METHOD_FIELD_NAME}]=Inturn&filter[${LOT_NUMBER_FIELD_NAME}][_null]=true`, {
				// 	params: {
				// 		fields: [
				// 			ASSAY_LOT_COMMODITY_FIELD_NAME,
				// 			ASSAY_LOT_FINAL_ASSAY_FIELD_NAME, 
				// 			ASSAY_LOT_ASSAY_UOM_FIELD_NAME
				// 		],
				// 	}
				// });

				// if (assayLotResponse.data.data.length === 0) {
				// 	throw new Error(`No Inturn composite assay found for parcel #${parcelId}`);
				// }
				const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {
					params: {
						fields: [
							ID_FIELD_NAME, 
							ASSAY_LOT_COMMODITY_FIELD_NAME, 
							METHOD_FIELD_NAME, 
							ASSAY_LOT_DRY_WEIGHT_FIELD_NAME,
							ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
							ASSAY_LOT_BUYER_ASSAY_FIELD_NAME,
							ASSAY_LOT_SELLER_ASSAY_FIELD_NAME,
							ASSAY_LOT_FINAL_ASSAY_FIELD_NAME, 
							ASSAY_LOT_LOT_NUMBER_FIELD_NAME,
							ASSAY_LOT_ASSAY_UOM_FIELD_NAME
						],
					}
				});

				console.log(`assayLotResponse.data.data=${JSON.stringify(assayLotResponse.data.data)}`);
				validateAssayLots(assayLotResponse.data.data);
				const commodities: string[] = assayLotResponse.data.data.map(assayLot => assayLot.commodity).filter((commodity, index, self) => self.indexOf(commodity) === index);
				console.log(`commodities: ${commodities}`)
				// const filterString = commodities.map((commodity, index) => `filter[_or][${index}][code]=${commodity}`).join('&');
				const commodityMappingResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}`, {
					params: {
						fields: ['name', 'code'],
						filter: {
							code: {
								"_in": commodities,
							}
						} 
					}
				});

				const commodityCodeToNameMapping = commodityMappingResponse.data.data.reduce((accumulator: Record<string, string>, commodity: Commodity) => {
					accumulator[commodity.code] = commodity.name;
					return accumulator;
				}, {});
				
				// This method evaluateAnalyticalAssay was copied across from the Invoice generator interface and modified because we only need the latest assay data by method here
				const assays = evaluateAnalyticalAssay(assayLotResponse.data.data as AssayLotsOrCompositeForProcessing[]);
				if (LATEST_METHOD.value === null) {
					throw new Error(`No latest method found for assay lots`);
				}

				// const ASSAYS = assayLotResponse.data.data.map((assay: Assay) => {
				// 	return {
				// 		commodity_name: commodityCodeToNameMapping[assay[ASSAY_LOT_COMMODITY_FIELD_NAME]],
				// 		analytical_assay: assay[ASSAY_LOT_FINAL_ASSAY_FIELD_NAME],
				// 		assay_uom: assay[ASSAY_LOT_ASSAY_UOM_FIELD_NAME],
				// 	} as AssayForGenerator
				// });

				const ASSAYS = Object.keys(assays).map(commodity => ({
					commodity_name: commodityCodeToNameMapping[commodity],
					analytical_assay: assays[commodity]['analytical_assay'],
					assay_uom: assays[commodity][ASSAY_LOT_ASSAY_UOM_FIELD_NAME],
				} as AssayForGenerator));

				console.log(`[generateProvWeightAndAssay] assay data=${JSON.stringify(ASSAYS)}}`);

				// // TODO: this is technically correct because provisional weight n assay cert only uses Inturn method, but maybe best to use latest method
				// const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&filter[${METHOD_FIELD_NAME}]=Inturn&sort[]=${LOT_NUMBER_FIELD_NAME}`, {params: {
				// 	fields: [
				// 		WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
				// 		WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
				// 		WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME, 
				// 		WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME
				// 	],
				// }});
				
				// // TODO: can be more efficient since everything is of method Inturn, unless we want to refactor as a shared function
				// const WEIGHT = evaluateWeightData(weightLotResponse.data.data as WeightLot[]);

				// Swap to get latest method weight lot data and generate doc based on that
				const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {params: {
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
				console.log(`weightLotResponse.data.data=${JSON.stringify(weightLotResponse.data.data)}`);
				validateWeightLots(weightLotResponse.data.data);
				// do some calculations for weight lot response based on method, or filter by method beforehand so just add
				const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);

				// if no weight lots data found with the LATEST_METHOD as set by assay lots evaluator, then find weight by the method field with the values Outturn, Inturn Final, Inturn, Estimated, Planned in this order
				let WEIGHT = weights.find(weight => weight.method === LATEST_METHOD.value);
				
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

				const vesselId = parcelResponce.data.data[PARCEL_VESSEL_FIELD_NAME];
				let vesselResponse;
				if (!!vesselId) {
					vesselResponse = await api.get(`/items/${VESSEL_COLLECTION_NAME}/${vesselId}`, {params: {
						fields: [VESSEL_NAME_FIELD_NAME],
					}});
				}
				const companyDataResponse = await api.get(`/items/${COMPANY_COLLECTION_NAME}`, { params: {
					fields: [
						COMPANY_NAME_FIELD_NAME,
						COMPANY_LOGO_FIELD_NAME,
						COMPANY_LINE_1_FIELD_NAME,
						COMPANY_LINE_2_FIELD_NAME,
						COMPANY_CITY_FIELD_NAME,
						COMPANY_STATE_FIELD_NAME,
						COMPANY_ZIP_FIELD_NAME,
						COMPANY_COUNTRY_FIELD_NAME,
						COMPANY_PHONE_CODE_FIELD_NAME,
						COMPANY_PHONE_NUMBER_FIELD_NAME,
						COMPANY_EMAIL_FIELD_NAME,
						COMPANY_SIGNATORY_NAME_FIELD_NAME,
						COMPANY_SIGNATORY_TITLE_FIELD_NAME,
						COMPANY_SIGNATURE_FIELD_NAME,
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
				const companyName = companyData[COMPANY_NAME_FIELD_NAME];
				let companyPhoneCode;
				let companyPhoneNumber;
				if (!!companyData[COMPANY_PHONE_CODE_FIELD_NAME]) {
					const companyPhoneCodeResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_PHONE_CODE_FIELD_NAME]}`, {params: {
						fields: [COUNTRY_PHONE_CODE_FIELD_NAME],
					}});
					companyPhoneCode = companyPhoneCodeResponse.data.data[COUNTRY_PHONE_CODE_FIELD_NAME];
					companyPhoneNumber = companyData[COMPANY_PHONE_NUMBER_FIELD_NAME];
				}

				const companyAddressLine1 = companyData[COMPANY_LINE_1_FIELD_NAME];
				const companyAddressLine2 = !!companyData[COMPANY_LINE_2_FIELD_NAME] ? `,\n${companyData[COMPANY_LINE_2_FIELD_NAME]}` : '';
				const companyAddressCity = !!companyData[COMPANY_CITY_FIELD_NAME] ? `,\n${companyData[COMPANY_CITY_FIELD_NAME]}` : '';
				const companyAddressState = !!companyData[COMPANY_STATE_FIELD_NAME] ? `,\n${companyData[COMPANY_STATE_FIELD_NAME]}` : '';

				const companyBaseCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_COUNTRY_FIELD_NAME]}`, {params: {
					fields: [COUNTRY_NAME_FIELD_NAME],
				}});
				const companyAddressCountry = !!companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				const companyZipcode = !!companyData[COMPANY_ZIP_FIELD_NAME] ? ` ${companyData[COMPANY_ZIP_FIELD_NAME]}` : '';
				const COMPANY_ADDRESS = `${companyAddressLine1}${companyAddressLine2}${companyAddressCity}${companyZipcode}${companyAddressState}${companyAddressCountry}`;

				const signatureId = companyData[COMPANY_SIGNATURE_FIELD_NAME];
				let signatureImageData: ImageData | null = null;
				if (!!signatureId) {
					const signatureFile = await api.get(`/assets/${signatureId}`, { responseType: 'arraybuffer' });
					// Convert the response data to a Buffer
					const imageBuffer = Buffer.from(signatureFile.data, 'binary');
					// Determine the image type
					const imageType = signatureFile.headers['content-type'] as ImageType;
					if (Object.values(ImageType).includes(imageType)) {
						signatureImageData = {
							// Convert the buffer to a base64 string
							imageData: imageBuffer.toString('base64'),
							imageType
						};
					}
				}
				const SIGNATORY = {
					signatoryName: companyData[COMPANY_SIGNATORY_NAME_FIELD_NAME] as string,
					signatoryTitle: companyData[COMPANY_SIGNATORY_TITLE_FIELD_NAME] as string,
					signature: signatureImageData ?? null,
					company: companyName as string
				}
				const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
					fields: [COUNTERPARTY_NAME_FIELD_NAME],
				}});

				const originPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_ORIGIN_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});

				const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});

				const contractId = parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME];
				const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${PARCEL_CONTRACT_FIELD_NAME}]=${contractId}&filter[${COMM_IN_PRIMARY_COMMODITY_FIELD_NAME}]=true`, {params: {
					fields: [
						COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,
					],
				}});
				
				const primaryCommodityId = commodityInContractResponse.data.data[0][COMM_IN_CONTRACT_COMMODITY_FIELD_NAME];
				const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}/${primaryCommodityId}`, {params: {
					fields: [COMMODITY_NAME_FIELD_NAME],
				}});

				const primaryCommodity = commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME] ?? '';
				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [
						CONTRACT_NAME_FIELD_NAME,
					],
				}});
				validateContractData(contractResponse.data.data);

				const requestBody = {
					"folder_id": await getFolderID(),
					"invoice_type": LATEST_METHOD.value,
					"company_logo": companyLogoData,
					"parcel_ref": `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${parcelId})`,
					"seller": companyName,
					"seller_address": COMPANY_ADDRESS,
					"seller_phone_number": (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					"buyer": counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					"vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					"contract_ref": contractResponse.data.data[CONTRACT_NAME_FIELD_NAME],
					"bl_date": formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])),
					"port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"commodity_name": primaryCommodity,
					"wet_weight": WEIGHT.wet_weight,
					"wet_weight_uom": WEIGHT.wet_weight_uom,
					"dry_weight": WEIGHT.dry_weight,
					"dry_weight_uom": WEIGHT.dry_weight_uom,
					"moisture": WEIGHT.moisture,
					"moisture_uom": "%",
					"assays": ASSAYS,
					"signatory": SIGNATORY
				}

				let response: any;
				try {
					response = await api.post(PROVE_WEIGHT_AND_ASSAY_CERT_GENERATOR_PATH, requestBody)
					// // assign the invoice url as the value for this field
				} catch (error) {
					console.error(`[generateProvWeightAndAssay] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generateProvWeightAndAssay] invoice response status: ${response.status}`);
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
			} catch(error) {
				console.error('[generateProvWeightAndAssay] error=', error);
				failureReason.value = error;
				isGeneraingDoc.value = false;
			}
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Weight & Assay Cert')}`);

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
				name: 'Weight & Assay Cert',
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
				link.download = filenameDownload ?? 'weight-and-assay.pdf';

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
			// api.get(`/assets/${documentID}`).catch(error => {
			// 	console.error(`[viewPdf] error: ${error}`);
			// 	throw new Error('Failed to fetch the document, please try again');
			// }).then(response => {
			// 	const blob = new Blob([response.data], { type: 'application/pdf' });
			// 	const url = URL.createObjectURL(blob);
			// 	const newTab = window.open();
			// 	if (!newTab) {
			// 		throw new Error('Failed to open a new tab');
			// 	}
			// 	newTab.location.href = url;
			// });

			// // open the invoice in a new tab
			// const docName = documentName ?? props.value['doc_name'];
			// console.log(`[viewPdf] doc name: ${docName}`);
			// // console.log(`[viewPdf] doc path: ${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// // const encodedValue = encodeURIComponent(`${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// const encodedValue = encodeURIComponent(`${docName}.pdf`);
			// const url = `/display-doc?docname=${encodedValue}`;
			// window.open(url);
		}

		// function to convert a Date object into DD MMM YYYY format
		function formatDate(date: Date) {
			const monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov", "Dec"
			];
			const day = date.getDate();
			const monthIndex = date.getMonth();
			const year = date.getFullYear();
			return `${day} ${monthNames[monthIndex]} ${year}`;
		}

		function validateAssayLots(assayLots) {
			if (!assayLots || assayLots.length === 0) {
				throw new Error(`No assay lots found for the selected parcel`);
			}
		}

		function validateContractData(contractData: any) {
			if (!contractData) {
				throw new Error('No contract data found, please ensure the selected parcel has an associated contract');
			}
			if (!contractData[CONTRACT_NAME_FIELD_NAME]) {
				throw new Error('No contract name found for the associated contract of the selected parcel');
			}
		}
		
		function evaluateAnalyticalAssay(assayLotsOrComposites: AssayLotsOrCompositeForProcessing[]): {} {
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
						(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForProcessing>).length === 1 &&
						group[assayLotOrComposite.method][assayLotOrComposite.commodity][0].lot_number === null
					) {
						// assay for this commodity-method combination is assay lot, remove composite assay if present
						group[assayLotOrComposite.method][assayLotOrComposite.commodity] = [];
					}
					// only push assay lots to group if they have a lot number
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				} else if (
					assayLotOrComposite.lot_number === null && 
					(group[assayLotOrComposite.method][assayLotOrComposite.commodity] as Array<AssayLotsOrCompositeForProcessing>).length === 0
				) {
					// a composite assay for commodity-method combination, only add it in if it is the first and no other composite assay exists for this combination. There should only be one composite assay per commodity-method combination in a parcel
					group[assayLotOrComposite.method][assayLotOrComposite.commodity].push(assayLotOrComposite);
				}
			}
			console.log(`[evaluateAnalyticalAssay] group: ${JSON.stringify(group)}}`);

			let ASSAYS = group['Outturn'];
			let METHOD = 'Outturn';
			if (!ASSAYS) {
				ASSAYS = group['Inturn Final'];
				METHOD = 'Inturn Final';
			}
			if (!ASSAYS) {
				ASSAYS = group['Inturn'];
				METHOD = 'Inturn';
			}
			if (!ASSAYS) {
				ASSAYS = group['Estimated'];
				METHOD = 'Estimated';
			}
			if (!ASSAYS) {
				ASSAYS = group['Planned'];
				METHOD = 'Planned';
			}
			if (!ASSAYS) {
				throw new Error(`No assay lot data found for all assay methods. Please ensure assay lot data has been entered in the selected parcel.`);
			}
			console.log(`[evaluateAnalyticalAssay] latest method=${METHOD}`);
			LATEST_METHOD.value = METHOD;
			const analyticalAssay = {};
			for(const commodityKey in group[METHOD]) {
				console.log(`[evaluateAnalyticalAssay] commodityKey: ${commodityKey}, group[METHOD][commodityKey]: ${JSON.stringify(group[METHOD][commodityKey])}`);
				// calculate average of final_assay value for each commodity and assign the calculated value to the same path in analyticalAssay
				analyticalAssay[commodityKey] = {};
				const totalDryWeight = group[METHOD][commodityKey].reduce((accumulator, currentValue: AssayLotsOrCompositeForProcessing) => accumulator + parseFloat(currentValue.dry_weight ?? '0'), 0);
				console.log(`[evaluateAnalyticalAssay] totalDryWeight: ${totalDryWeight} from ${JSON.stringify(group[METHOD][commodityKey])}`)
				if (totalDryWeight === 0 || isNaN(totalDryWeight)) {
					failureReason.value = `Please provide dry weight for ${commodityKey} commodity in ${METHOD} method, total dry weight cannot be ${totalDryWeight}`;
					throw new Error(`[evaluateAnalyticalAssay] totalDryWeight is 0`);
				}
				console.log(`[evaluateAnalyticalAssay] totalDryWeight: ${totalDryWeight}`)
				
				analyticalAssay[commodityKey]['analytical_assay'] = group[METHOD][commodityKey].reduce((accumulator: number, currentValue: AssayLotsOrCompositeForProcessing) => {
					const assayValue = parseFloat(currentValue.final_assay ?? (currentValue.seller_assay ?? currentValue.buyer_assay));
					if (assayValue === null || assayValue === undefined) {
						failureReason.value = `Please provide Final, Seller or Buyer assay value for ${commodityKey} commodity in ${METHOD} method`;
						throw new Error(`[evaluateAnalyticalAssay] assay value is not defined for assay lot`);
					}

					// NOTE: probably don't need to do conversion since we're just trying to get the weighted average here, conversion will be done later with the calculated analytical assay

					// const unitSymbolResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}?filter[${UNIT_DRY_SYMBOL_FIELD_NAME}]=${currentValue.dry_weight_uom}`, {
					// 	params: { fields: [ UNIT_SYMBOL_FIELD_NAME ] }
					// });
					// if (unitSymbolResponse.data.data.length === 0 || unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME] === null || unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME] === undefined) {
					// 	throw new Error(`[evaluateAnalyticalAssay] failed to get unit symbol for dry weight unit ${currentValue.dry_weight_uom}`);
					// }
					// const unitSymbol = unitSymbolResponse.data.data[0][UNIT_SYMBOL_FIELD_NAME];
					// // requires the weight unit symbol, not the dry weight unit symbol
					// const conversionFactor = await getConversionValueForWeightWithWeightAndAssayUom(
					// 	unitSymbol, 
					// 	currentValue.dry_weight_uom, 
					// 	currentValue.assay_uom,
					// );
					// console.log(`[evaluateAnalyticalAssay] assay value: ${assayValue}; dry weight: ${currentValue.dry_weight}; conversionFactor: ${conversionFactor}; accumulator: ${accumulator}`);
					// const analyticalAssay = accumulator + (assayValue*currentValue.dry_weight*conversionFactor);
					// console.log(`[evaluateAnalyticalAssay] evaluated analytical assay: ${analyticalAssay}`);
					// return analyticalAssay;

					const analyticalAssay = accumulator + (assayValue * parseFloat(currentValue.dry_weight ?? '0'));
					console.log(`[evaluateAnalyticalAssay] evaluated analytical assay: ${analyticalAssay} for method=${METHOD}, commodity=${commodityKey}; with values accumulator=${accumulator}, assayValue=${assayValue}, dryWeight=${currentValue.dry_weight}`);
					return analyticalAssay;
				}, 0) / totalDryWeight;
				console.log(`[evaluateAnalyticalAssay] analytical assay: ${analyticalAssay[commodityKey]['analytical_assay']}`)
				if (group[METHOD][commodityKey].length > 0) {
					analyticalAssay[commodityKey][ASSAY_LOT_ASSAY_UOM_FIELD_NAME] = group[METHOD][commodityKey][0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME];
				}
			}
			
			console.log(`[evaluateAnalyticalAssay] analyticalAssay: ${JSON.stringify(analyticalAssay)}`);
			return analyticalAssay;
		}

		function validateWeightLots(weightLots) {
			if (!weightLots || weightLots.length === 0) {
				throw new Error(`No weight lots found for the selected parcel`);
			}
		}

		function evaluateWeights(lots: WeightLot[]): Weight[] {
			console.log('[evaluateWeights]');
			const weightData = {};
			for(const lot of lots) {
				if (!weightData[lot.method]) {
					console.log(`adding method ${lot.method} to weightData object`)
					weightData[lot.method] = [];
				}
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

		function evaluateWeightData(weightLots: WeightLot[]): Weight {
			console.log('[evaluateWeightData]');
			if (weightLots.length === 0) {
				throw new Error('No weight lots found');
			}
			const dryWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.DRY_WEIGHT);
			const wetWeight = evaluateAggregateValue(weightLots, AggregatableWeightLotFields.WET_WEIGHT);
			return {
				method: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.METHOD),
				dry_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.DRY_WEIGHT_UOM),
				wet_weight_uom: getFirstValueAsSharedValue(weightLots, SharedLotPropertyFields.WET_WEIGHT_UOM),
				dry_weight: dryWeight,
				wet_weight: wetWeight,
				moisture: (wetWeight - dryWeight) / wetWeight * 100,
			} as Weight
		}

		function evaluateAggregateValue(lots: WeightLot[], field: AggregatableWeightLotFields): number {
			console.log('[evaluateAggregateValue]');
			return lots.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue[field.toString()] ?? '0'), 0);
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
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>