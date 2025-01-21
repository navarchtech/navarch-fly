<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generatePdf()"
			:loading="isGeneraingDoc"
		>Generate Assay Exchange Cert</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => viewPdf()"
		>View Assay Exchange Cert
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

type AssayLot = {
    lot_number: number;
	assay_uom?: string;

	seller_assay?: string;
	final_assay?: string;

	commodity: string;
	method: 'Outturn' | 'Inturn Final' | 'Inturn' | 'Estimated' | 'Planned';
}

type WeightLot = {
	method: string;
	lot_number: number;

	wet_weight?: string;
	wet_weight_uom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: string;
	// moisutre_uom?: string;

	dry_weight?: string;
	dry_weight_uom?: string;
}

type WeightLotForGenerator = {
	lotNumber: number;
	wetWeight: number;
	wetWeightUom: string;
	moisture: number;
	moistureUom: string;
	dryWeight: number;
	dryWeightUom: string;
}

// // Unused
// enum AggregatableWeightLotFields {
// 	WET_WEIGHT = 'wet_weight',
// 	MOISTURE = 'moisture',
// 	DRY_WEIGHT = 'dry_weight'
// }

// enum SharedLotPropertyFields {
// 	WET_WEIGHT_UOM = 'wet_weight_uom',
// 	MOISTURE_UOM = 'moisture_uom',
// 	DRY_WEIGHT_UOM = 'dry_weight_uom'
// }

// type Assay = {
// 	commodity: string;
// 	final_assay: number;
// 	assay_uom: string;
// }

type AssayForGenerator = {
	lotNumber: number | null;
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
}

type AssayLotForGenerator = {
	lotNumber: number;
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
}

type CompositeAssayForGenerator = {
	commodityName: string;
	commodityCode: string;
	analyticalAssay: number;
	assayUom: string;
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
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		const ASSAY_EXCHANGE_DOC_GENERATOR_API_PATH = '/generate/assay-exchange';

		const ASSAY_EXCHANGE_PARCEL_FIELD_NAME = 'parcel';

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		// const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_ORIGIN_FIELD_NAME = 'origin';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
	
		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_COMMODITY_FIELD_NAME = 'commodity';
		const ASSAY_LOT_SELLER_ASSAY_FIELD_NAME = 'seller_assay';
		const ASSAY_LOT_ASSAY_UOM_FIELD_NAME = 'assay_uom';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_WET_WEIGHT_FIELD_NAME = 'wet_weight';
		const WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME = 'wet_weight_uom';
		const WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		
		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_NAME_FIELD_NAME = 'name';
		const COMPANY_LINE_1_FIELD_NAME = 'line_1';
		const COMPANY_LINE_2_FIELD_NAME = 'line_2';
		const COMPANY_CITY_FIELD_NAME = 'city';
		const COMPANY_STATE_FIELD_NAME = 'state';
		const COMPANY_COUNTRY_FIELD_NAME = 'country';
		const COMPANY_ZIP_FIELD_NAME = 'zip';
		const COMPANY_PHONE_CODE_FIELD_NAME = 'phone_code';
		const COMPANY_PHONE_NUMBER_FIELD_NAME = 'phone_number';
		// const COMPANY_EMAIL_FIELD_NAME = 'email';
		const COMPANY_SIGNATORY_NAME_FIELD_NAME = 'signatory_name';
		const COMPANY_SIGNATORY_TITLE_FIELD_NAME = 'signatory_title';
		const COMPANY_SIGNATURE_FIELD_NAME = 'signature';
		const COMPANY_LOGO_FIELD_NAME = 'logo';

		const COUNTRY_COLLECTION_NAME = 'navarch_country';
		const COUNTRY_NAME_FIELD_NAME = 'name';
		const COUNTRY_PHONE_CODE_FIELD_NAME = 'phone_code';

		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';
		const PORT_COUNTRY_FIELD_NAME = 'country';

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_NAME_FIELD_NAME = 'name';

		return { 
			isGeneraingDoc,
			failureReason,
			generatePdf,
			copy,
			isCopying,
			viewPdf,
			downloadPdf,
		};

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, assay_exchange_cert, ...requestBody } = formValues.value;
			console.log(`[assay exchange::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_assay_exchange', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[assay exchange::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate assay exchange with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_assay_exchange/${copyResponse.data.data.id}`);
		}

		async function generatePdf() {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				const parcelId = formValues.value[ASSAY_EXCHANGE_PARCEL_FIELD_NAME];
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							ID_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME, 
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_COUNTERPARTY_FIELD_NAME,
							// PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							// PARCEL_INVOICE_DATE_FIELD_NAME, 
							// PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							// PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME
						]
					}
				});	

				validateParcelData(parcelResponce);

				const assayForeignKey = parcelResponce.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME];
				const weightForeignKey = parcelResponce.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME];
				const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {
					params: {
						fields: [
							METHOD_FIELD_NAME,
							LOT_NUMBER_FIELD_NAME,
							ASSAY_LOT_COMMODITY_FIELD_NAME,
							ASSAY_LOT_SELLER_ASSAY_FIELD_NAME, 
							ASSAY_LOT_ASSAY_UOM_FIELD_NAME
						],
					}
				});

				validateAssayLotsData(assayLotResponse);

				// console.log(`assay lot response: ${JSON.stringify(assayLotResponse.data.data)}`);

				// sort assay lots into an array of arrays of assay lots, where each array of assay lots has the same method
				const groupedAssayLotsByMethod: AssayLot[][] = assayLotResponse.data.data.reduce((accumulator: AssayLot[][], assayLot: AssayLot) => {
					const method = assayLot[METHOD_FIELD_NAME];
					const assayLotArray = accumulator.find(assayLotArray => assayLotArray[0][METHOD_FIELD_NAME] === method);
					if (assayLotArray) {
						assayLotArray.push(assayLot);
					} else {
						accumulator.push([assayLot]);
					}
					return accumulator;
				}, []);

				// console.log(`grouped assay lots by method: ${JSON.stringify(groupedAssayLotsByMethod)}`);


				// TODO: when cleaning up I can make it find the latest method when sorting
				const latestAssayLots = groupedAssayLotsByMethod.find(assay => assay[0][METHOD_FIELD_NAME] === 'Outturn') ?? 
					groupedAssayLotsByMethod.find(assay => assay[0][METHOD_FIELD_NAME] === 'Inturn Final') ?? 
					groupedAssayLotsByMethod.find(assay => assay[0][METHOD_FIELD_NAME] === 'Inturn') ?? 
					groupedAssayLotsByMethod.find(assay => assay[0][METHOD_FIELD_NAME] === 'Estimated') ?? 
					groupedAssayLotsByMethod.find(assay => assay[0][METHOD_FIELD_NAME] === 'Planned');
					
				if (!latestAssayLots) {
					throw new Error('No assay lots with a valid method found in selected parcel');
				}

				const LATEST_METHOD = latestAssayLots[0][METHOD_FIELD_NAME];
				if (!LATEST_METHOD) {
					throw new Error('No method found in selected parcel');
				} else if (!(['Outturn', 'Inturn Final', 'Inturn', 'Estimated', 'Planned'].includes(LATEST_METHOD))) {
					throw new Error(`Invalid method ${LATEST_METHOD} found in selected parcel`);
				}

				const commodities = assayLotResponse.data.data.map(assayLot => assayLot.commodity).filter((commodity, index, self) => self.indexOf(commodity) === index);
				const filterString = commodities.map((commodity, index) => `filter[_or][${index}][code]=${commodity}`).join('&');
				const commodityMappingResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}?${filterString}`, {
					params: {
						fields: [COMMODITY_NAME_FIELD_NAME, COMMODITY_CODE_FIELD_NAME]
					}
				});
				validateCommodityMappingData(commodityMappingResponse);
				console.log(`commodity mapping response: ${JSON.stringify(commodityMappingResponse.data.data)}`);
				const commodityCodeToNameMapping = commodityMappingResponse.data.data.reduce((accumulator: Record<string, string>, commodity: Commodity) => {
					accumulator[commodity.code] = commodity.name;
					return accumulator;
				}, {});
				const latestAssayLotsForGenerator: AssayForGenerator[] = latestAssayLots.map((assay: AssayLot) => {
					return {
						lotNumber: assay[LOT_NUMBER_FIELD_NAME],
						commodityName: commodityCodeToNameMapping[assay[ASSAY_LOT_COMMODITY_FIELD_NAME]],
						commodityCode: assay[ASSAY_LOT_COMMODITY_FIELD_NAME],
						analyticalAssay: parseFloat(assay[ASSAY_LOT_SELLER_ASSAY_FIELD_NAME] ?? '0'),
						assayUom: assay[ASSAY_LOT_ASSAY_UOM_FIELD_NAME],
					} as AssayForGenerator
				});

				const ASSAY_LOTS = latestAssayLotsForGenerator.filter((assay: AssayForGenerator) => assay.lotNumber !== null) as AssayLotForGenerator[];
				// only include composite assay items that are not already in the assay lots
				// TODO: find a better way to filter out composite assay items that are already in the assay lots
				const COMPOSITE_ASSAYS = latestAssayLotsForGenerator.filter((assay: AssayForGenerator) => assay.lotNumber === null && (ASSAY_LOTS.find(assayLot => assayLot.commodityCode === assay.commodityCode) === undefined)) as CompositeAssayForGenerator[];

				const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&filter[${METHOD_FIELD_NAME}]=${LATEST_METHOD}&sort[]=${LOT_NUMBER_FIELD_NAME}`, {params: {
					fields: [
						METHOD_FIELD_NAME,
						LOT_NUMBER_FIELD_NAME,
						WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
						WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
						WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME, 
						WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME
					],
				}});

				validateWeightLotsData(weightLotResponse);

				// sort weight lot response into an array of arrays of weight lots, where each array of weight lots has the same method
				const weightLots = weightLotResponse.data.data.reduce((accumulator: WeightLot[][], weightLot: WeightLot) => {
					const method = weightLot[METHOD_FIELD_NAME];
					const weightLotArray = accumulator.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === method);
					if (weightLotArray) {
						weightLotArray.push(weightLot);
					} else {
						accumulator.push([weightLot]);
					}
					return accumulator;
				}, []);

				// find the weight lot array by method in order of Outturn, Inturn Final, Inturn, Estimated, Planned
				const weightLotArray = weightLots.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === 'Outturn') ?? 
					weightLots.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === 'Inturn Final') ?? 
					weightLots.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === 'Inturn') ?? 
					weightLots.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === 'Estimated') ?? 
					weightLots.find(weightLotArray => weightLotArray[0][METHOD_FIELD_NAME] === 'Planned');

				if (!weightLotArray) {
					throw new Error('No weight lots with a valid method found in selected parcel');
				}

				// convert weight lot array into an array of weight lots for the generator
				const WEIGHTS = weightLotArray.map((weightLot: WeightLot) => {
					return {
						lotNumber: weightLot[LOT_NUMBER_FIELD_NAME],
						wetWeight: parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '0'),
						wetWeightUom: weightLot[WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME],
						moisture: (parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '0') - parseFloat(weightLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME] ?? '0')) / parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '1') * 100,
						moistureUom: "%",
						dryWeight: parseFloat(weightLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME] ?? '0'),
						dryWeightUom: weightLot[WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME],
					} as WeightLotForGenerator
				});

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
						COMPANY_LINE_1_FIELD_NAME,
						COMPANY_LINE_2_FIELD_NAME,
						COMPANY_CITY_FIELD_NAME,
						COMPANY_STATE_FIELD_NAME,
						COMPANY_ZIP_FIELD_NAME,
						COMPANY_COUNTRY_FIELD_NAME,
						COMPANY_PHONE_CODE_FIELD_NAME,
						COMPANY_PHONE_NUMBER_FIELD_NAME,
						// COMPANY_EMAIL_FIELD_NAME,
						COMPANY_SIGNATORY_NAME_FIELD_NAME,
						COMPANY_SIGNATORY_TITLE_FIELD_NAME,
						COMPANY_SIGNATURE_FIELD_NAME,
						COMPANY_LOGO_FIELD_NAME,
					]
				}});

				validateCompanyData(companyDataResponse);

				const companyData = companyDataResponse.data.data;
				const companyName = companyData[COMPANY_NAME_FIELD_NAME];
				
				let companyPhoneCode;
				let companyPhoneNumber;
				if (!!companyData[COMPANY_PHONE_CODE_FIELD_NAME]) {
					const companyPhoneCodeResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_PHONE_CODE_FIELD_NAME]}`, {params: {
						fields: [COUNTRY_PHONE_CODE_FIELD_NAME],
					}});
					validateCompanyCountryCodeData(companyPhoneCodeResponse.data.data);
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
				validateCompanyCountryBaseData(companyBaseCountryResponse);
				const companyAddressCountry = !!companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				const companyZipcode = !!companyData[COMPANY_ZIP_FIELD_NAME] ? ` ${companyData[COMPANY_ZIP_FIELD_NAME]}` : '';
				const COMPANY_ADDRESS = `${companyAddressLine1}${companyAddressLine2}${companyAddressCity}${companyZipcode}${companyAddressState}${companyAddressCountry}`;
				
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
				validateCounterpartyData(counterpartyResponse);

				const originPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_ORIGIN_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});

				validatePortData(originPortResponse, 'origin');

				const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
					fields: [
						PORT_NAME_FIELD_NAME,
						PORT_COUNTRY_FIELD_NAME,
					],
				}});

				validatePortData(destinationPortResponse, 'destination');

				// parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME] should have been validated to have a value
				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME]}`, {params: {
					fields: [
						CONTRACT_NAME_FIELD_NAME,
					],
				}});
				validateContractData(contractResponse.data.data);

				const requestBody = {
					"folder_id": await getFolderID(),
					"company_logo": companyLogoData,
					"seller": companyName,
					"seller_address": COMPANY_ADDRESS,
					"seller_phone_number": (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					"buyer": counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					"vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					"contract_ref": contractResponse.data.data[CONTRACT_NAME_FIELD_NAME],
					"bl_date": formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])),
					"parcel_ref": `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${parcelResponce.data.data[ID_FIELD_NAME]})`,//"CZ-100-GLS (#5)",
					"port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"weights": WEIGHTS,
					"assays": ASSAY_LOTS,
					"composite_assays": COMPOSITE_ASSAYS,
					"signatory": SIGNATORY
				}

				let response: any;
				try {
					response = await api.post(ASSAY_EXCHANGE_DOC_GENERATOR_API_PATH, requestBody)
					// // assign the invoice url as the value for this field
				} catch (error) {
					console.error(`[generateProvWeightAndAssay] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generateProvWeightAndAssay] invoice response status: ${response.status}`);
					isGeneraingDoc.value = false;
					failureReason.value = `Something went wrong when generating assay exchange cert, please contact Navarch for assistance.`;
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
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Assay Exchange')}`);

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
				name: 'Assay Exchange',
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
				link.download = filenameDownload ?? 'assay-exchange.pdf';

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
			// token = api.defaults?.headers?.['Authorization']?.split(' ')[1] ||
			// api.defaults?.headers?.common?.['Authorization']?.split(' ')[1] ||
			// null
			const authorisationInfo = api.defaults?.headers?.['Authorization'] ||
				api.defaults?.headers?.common?.['Authorization'] ||
				null
			const token = !!authorisationInfo ? authorisationInfo.toString().split(' ')[1] : null;
			// The access token must be the token of the current logged in user, else using another user's token will result in a 403 error
			window.open(`/assets/${documentID}?access_token=${token}`);

			// // open the invoice in a new tab
			// const docName = documentName ?? props.value['doc_name'];
			// console.log(`[viewPdf] doc name: ${docName}`);
			// // console.log(`[viewPdf] doc path: ${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// // const encodedValue = encodeURIComponent(`${process.env.STORAGE_LOCAL_ROOT}/${docName}.pdf`);
			// const encodedValue = encodeURIComponent(`${docName}.pdf`);
			// const url = `/display-doc?docname=${encodedValue}`;
			// window.open(url);
		}

		function validateParcelData(parcelResponse) {
			if (!parcelResponse || !parcelResponse.data || !parcelResponse.data.data) {
				throw new Error('No parcel data found, please ensure the selected parcel still exists.');
			}

			if (!parcelResponse.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME]) {
				throw new Error('No assay data found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME]) {
				throw new Error('No weight data found in selected parcel');
			}

			// vessel is not required, display N/A when absent, will not be checked for in parcelResponse

			if (!parcelResponse.data.data[PARCEL_CONTRACT_FIELD_NAME]) {
				throw new Error('No contract found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]) {
				throw new Error('No shipment code found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]) {
				throw new Error('No counterparty found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_BL_DATE_FIELD_NAME]) {
				throw new Error('No bill of lading date found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_ORIGIN_FIELD_NAME]) {
				throw new Error('No origin port found in selected parcel');
			}

			if (!parcelResponse.data.data[PARCEL_DESTINATION_FIELD_NAME]) {
				throw new Error('No destination port found in selected parcel');
			}
		}

		function validateAssayLotsData(assayLotsResponse) {
			if (!assayLotsResponse || !assayLotsResponse.data || !assayLotsResponse.data.data || assayLotsResponse.data.data.length === 0) {
				throw new Error('No assay lots data found, please ensure assay data has been entered for the selected parcel.');
			}

			// check that all assay lots has method, commodity, final assay, and assay uom properties
			assayLotsResponse.data.data.forEach((assayLot: AssayLot) => {
				if (!assayLot[METHOD_FIELD_NAME]) {
					throw new Error('Some assays in the selected parcel does not have a method value');
				}

				if (!assayLot[ASSAY_LOT_COMMODITY_FIELD_NAME]) {
					throw new Error('Some assays in the selected parcel does not have a commodity value');
				}

				if (!assayLot[ASSAY_LOT_SELLER_ASSAY_FIELD_NAME]) {
					throw new Error('Some assays in the selected parcel does not have a seller assay value');
				}

				if (!assayLot[ASSAY_LOT_ASSAY_UOM_FIELD_NAME]) {
					throw new Error('Some assays in the selected parcel does not have an assay uom value');
				}
			})
		}

		function validateWeightLotsData(weightLotsResponse) {
			if (!weightLotsResponse || !weightLotsResponse.data || !weightLotsResponse.data.data || weightLotsResponse.data.data.length === 0) {
				throw new Error('No weight lots data found, please ensure weight data has been entered for the selected parcel.');
			}

			// check that all weight lots has method, wet weight, wet weight uom, dry weight, and dry weight uom properties
			weightLotsResponse.data.data.forEach((weightLot: WeightLot) => {
				if (!weightLot[METHOD_FIELD_NAME]) {
					throw new Error('Some weights in the selected parcel does not have a method');
				}

				if (!weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME]) {
					throw new Error('Some weights in the selected parcel does not have a wet weight value');
				}

				if (!weightLot[WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME]) {
					throw new Error('Some weights in the selected parcel does not have a wet weight UOM');
				}

				if (!weightLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]) {
					throw new Error('Some weights in the selected parcel does not have a dry weight value');
				}

				if (!weightLot[WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME]) {
					throw new Error('Some weights in the selected parcel does not have a dry weight UOM');
				}
			})
		}

		function validateCommodityMappingData(commodityMappingResponse) {
			if (!commodityMappingResponse || !commodityMappingResponse.data || !commodityMappingResponse.data.data || commodityMappingResponse.data.data.length === 0) {
				throw new Error('No commodity mapping data found, please contact Navarch for assistance.');
			}

			// check that all commodities have a name and code
			commodityMappingResponse.data.data.forEach((commodity: Commodity) => {
				if (!commodity[COMMODITY_NAME_FIELD_NAME]) {
					throw new Error('Some commodities in the selected parcel does not have a name, please contact Navarch for assistance.');
				}

				if (!commodity[COMMODITY_CODE_FIELD_NAME]) {
					throw new Error('Some commodities in the selected parcel does not have a code, please contact Navarch for assistance.');
				}
			})
		}

		function validateCompanyData(companyDataResponse) {
			if (!companyDataResponse || !companyDataResponse.data || !companyDataResponse.data.data) {
				throw new Error('No company data found, please ensure that company data has been entered.');
			}

			if (!companyDataResponse.data.data[COMPANY_NAME_FIELD_NAME]) {
				throw new Error('Company name not found.');
			}

			if (!companyDataResponse.data.data[COMPANY_LINE_1_FIELD_NAME]) {
				throw new Error('Please ensure that company address line 1 has been entered.');
			}

			// company address line 2 is optional
			// company city is optional
			// company state is optional

			if (!companyDataResponse.data.data[COMPANY_COUNTRY_FIELD_NAME]) {
				throw new Error('Company base country not found.');
			}

			// company zip is optional

			// if (!companyDataResponse.data.data[COMPANY_PHONE_CODE_FIELD_NAME]) {
			// 	throw new Error('Company phone code not found.');
			// }

			// if (!companyDataResponse.data.data[COMPANY_PHONE_NUMBER_FIELD_NAME]) {
			// 	throw new Error('Company phone number not found.');
			// }
			
			if (!companyDataResponse.data.data[COMPANY_SIGNATORY_NAME_FIELD_NAME]) {
				throw new Error('Company signatory name not found.');
			}

			if (!companyDataResponse.data.data[COMPANY_SIGNATORY_TITLE_FIELD_NAME]) {
				throw new Error('Company signatory title not found.');
			}
		}

		function validatePortData(portResponse, portType: 'origin' | 'destination') {
			if (!portResponse || !portResponse.data || !portResponse.data.data) {
				throw new Error(`No ${portType} port data found, please contact Navarch to check that the selected port is still valid.`);
			}

			if (!portResponse.data.data[PORT_NAME_FIELD_NAME]) {
				throw new Error(`Port name for ${portType} port not found, please contact Navarch to check that the selected port is still valid.`);
			}

			if (!portResponse.data.data[PORT_COUNTRY_FIELD_NAME]) {
				throw new Error('Port country for ${portType} port not found, please contact Navarch to check that the selected port is still valid.');
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

		function validateCompanyCountryBaseData(countryBaseData) {
			if (!countryBaseData || !countryBaseData.data || !countryBaseData.data.data) {
				throw new Error('No company country base data found, please contact Navarch for assistance.');
			}

			if (!countryBaseData.data.data[COUNTRY_NAME_FIELD_NAME]) {
				throw new Error('Company-based country name not found, please contact Navarch for assistance.');
			}
		}

		function validateCompanyCountryCodeData(countryCode) {
			if (!countryCode || !countryCode.data || !countryCode.data.data) {
				throw new Error('No company country phone code data found, please contact Navarch for assistance.');
			}

			if (!countryCode.data.data[COUNTRY_PHONE_CODE_FIELD_NAME]) {
				throw new Error('Company-based country phone code not found, please contact Navarch for assistance.');
			}
		}

		function validateCounterpartyData(counterpartyResponse) {
			if (!counterpartyResponse || !counterpartyResponse.data || !counterpartyResponse.data.data) {
				throw new Error('No counterparty data found, please ensure that counterparty data has been entered.');
			}

			if (!counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME]) {
				throw new Error('Counterparty name not found, please ensure that the selected counterparty has a name.');
			}
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
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>
