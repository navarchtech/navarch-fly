<template>
	<div style='display:flex; flex-direction: row'>
		<div v-if='!value'>
			<v-button
				@click='() => generatePdf()'
				:loading='isGeneratingDoc'
			>Generate Assay Exchange Cert</v-button>
		</div>
		<div v-else>
			<v-button
				@click='() => downloadPdf()'
			>Download Assay Exchange Cert
			</v-button>
		</div>
		<v-button
			class='margin-left-16px secondary-button'
			@click='() => copy()'
			:loading='isCopying'
		>Copy</v-button>
	</div>
	<v-notice class='margin-top-16px' v-if='!!failureReason'>
		{{ failureReason }}
	</v-notice>
</template>

<script lang='ts'>
import { defineComponent, Ref, ref, inject } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { Buffer } from 'buffer/';

import {
	ID_FIELD_NAME,
	FOREIGN_KEY_FIELD_NAME,
    METHOD_FIELD_NAME,
	LOT_NUMBER_FIELD_NAME,
	PARCEL_FIELD_NAME,

	PARCEL_COLLECTION_NAME,
    PARCEL_ASSAY_RESULTS_FIELD_NAME,
    PARCEL_WEIGHT_RESULTS_FIELD_NAME,
    PARCEL_CONTRACT_FIELD_NAME,
    PARCEL_SHIPMENT_CODE_FIELD_NAME,
    PARCEL_COUNTERPARTY_FIELD_NAME,
    PARCEL_BL_DATE_FIELD_NAME,
    PARCEL_ORIGIN_FIELD_NAME,
    PARCEL_DESTINATION_FIELD_NAME,
	PARCEL_VESSEL_FIELD_NAME,
	
	ASSAY_LOT_COLLECTION_NAME,
    ASSAY_LOT_COMMODITY_FIELD_NAME,
    ASSAY_LOT_SELLER_ASSAY_FIELD_NAME,
    ASSAY_LOT_ASSAY_UOM_FIELD_NAME,

	WEIGHT_LOT_COLLECTION_NAME,
    WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,

	COMPANY_COLLECTION_NAME,
    COMPANY_NAME_FIELD_NAME,
    COMPANY_LINE_1_FIELD_NAME,
	COMPANY_LINE_2_FIELD_NAME,
    COMPANY_COUNTRY_FIELD_NAME,
    COMPANY_PHONE_CODE_FIELD_NAME,
    COMPANY_PHONE_NUMBER_FIELD_NAME,
    COMPANY_SIGNATORY_NAME_FIELD_NAME,
    COMPANY_SIGNATORY_TITLE_FIELD_NAME,
	COMPANY_CITY_FIELD_NAME,
	COMPANY_STATE_FIELD_NAME,
	COMPANY_ZIP_FIELD_NAME,
	COMPANY_SIGNATURE_FIELD_NAME,
	COMPANY_LOGO_FIELD_NAME,

	COUNTRY_COLLECTION_NAME,
    COUNTRY_NAME_FIELD_NAME,
    COUNTRY_PHONE_CODE_FIELD_NAME,

	PORT_COLLECTION_NAME,
    PORT_NAME_FIELD_NAME,
    PORT_COUNTRY_FIELD_NAME,

	CONTRACT_COLLECTION_NAME,
    CONTRACT_NAME_FIELD_NAME,

	COUNTERPARTY_COLLECTION_NAME,
    COUNTERPARTY_NAME_FIELD_NAME,
	
	COMMODITY_COLLECTION_NAME,
    COMMODITY_NAME_FIELD_NAME,
    COMMODITY_CODE_FIELD_NAME,

	VESSEL_COLLECTION_NAME,
	VESSEL_NAME_FIELD_NAME,
} from '../../shared/common/constants';
import {
	formatDate,
	buildFunctionDownloadDoc,
	buildFunctionGetFolderId,
	uploadGeneratedDoc,
	buildFunctionCopyDocForm,
	fetchImage,

} from '../../shared/common/utils';
import {
	FetchedWeightLotData,
	FetchedAssayLotData,
	FetchedCommodityData,
	WeightLotForGenerator,
	NavarchDocument,
	NavarchImageData,
} from '../../shared/common/types';

import {
	validateParcelData,
	validateAssayLotsData,
	validateWeightLotsData,
	validateCommodityMappingData,
	validateCompanyCountryBaseData,
	validateCompanyCountryCodeData,
	validateCompanyData,
	validateContractData,
	validateCounterpartyData,
	validatePortData,
} from './utility/utils';
import {
	ASSAY_EXCHANGE_DOC_GENERATOR_API_PATH,
	COLLECTION_NAME,
	SAVED_DOC_FIELD_NAME,
} from './utility/constants';
import {
	AssayForAssayExchangeGenerator,
	CompositeAssayForAssayExchangeGenerator,
	AssayLotForAssayExchangeGenerator,
} from './utility/types';

/**
 * TODO List:
 * 1. use 'filter' and 'fields' and 'sort' param in the api.get json request object instead of string interpolation
 * 	1.1. useItems is another way to fetch data from the database but lets not fix what's already working, just an interesting note
 * 	1.2. try using the 'filter' param with nested objects to find data linked relationally to another table
 * 2. Numerify the Method types so we can do comparisons, what to use for default values if the produced number is NaN?
 * 3. Assume all number data from the database is a string and convert it to a number with parseFloat
 * 4. Create a type for the assay exchange JSON object to be saved? Optional
 * x5. Arrange buttons horizontally and make Copy secondary
 * 6. Add a Clear button to clear the value (and maybe delete the generated doc??), make it secondary but red on hover
 * x7. Make it so that I can import stuffs for the 'shared' folder like it is a node module
 * x8. Shared function for extracting images for the logo and signature
 * 9. Context object for failure messages and to pass in necessary data
 */

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		const failureReason: Ref<string | null> = ref(null);
		const isGeneratingDoc: Ref<boolean> = ref(false);
		const isCopying: Ref<boolean> = ref(false);
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		const getFolderId: () => Promise<any> = buildFunctionGetFolderId(NavarchDocument.AssayExchange, api);
		const downloadPdf: (docId?: string) => void  = buildFunctionDownloadDoc(props, api, NavarchDocument.AssayExchange);

		const genericCopy: () => Promise<void> = buildFunctionCopyDocForm(formValues.value, api, COLLECTION_NAME, SAVED_DOC_FIELD_NAME);
		const copy: () => Promise<void> = async () => {
			isCopying.value = true;
			try {
				await genericCopy();
			} catch (error) {
				failureReason.value = error.message;
			}
			isCopying.value = false;
		}

		return { 
			isGeneratingDoc,
			failureReason,
			generatePdf,
			copy,
			isCopying,
			// viewPdf,
			downloadPdf,
		};

		async function generatePdf() {
			failureReason.value = null;
			isGeneratingDoc.value = true;
			try {
				const parcelId = formValues.value[PARCEL_FIELD_NAME];
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							ID_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME, 
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME
						]
					}
				});	

				validateParcelData(parcelResponce);

				const assayForeignKey = parcelResponce.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME];
				const weightForeignKey = parcelResponce.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME];

				// originally `/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`
				const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}`, {
					params: {
						filter: {
							[FOREIGN_KEY_FIELD_NAME]: {
								'_eq': assayForeignKey,
							}
						},
						sort : [
							LOT_NUMBER_FIELD_NAME
						],
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

				// sort assay lots into an array of arrays of assay lots, where each array of assay lots has the same method
				const groupedAssayLotsByMethod: FetchedAssayLotData[][] = assayLotResponse.data.data.reduce((accumulator: FetchedAssayLotData[][], assayLot: FetchedAssayLotData) => {
					const method = assayLot[METHOD_FIELD_NAME];
					const assayLotArray = accumulator.find(assayLotArray => assayLotArray[0][METHOD_FIELD_NAME] === method);
					if (assayLotArray) {
						assayLotArray.push(assayLot);
					} else {
						accumulator.push([assayLot]);
					}
					return accumulator;
				}, []);


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
				const filterOrParams = commodities.map(commodity => ({[COMMODITY_CODE_FIELD_NAME]: { _eq: commodity }}));
				const commodityMappingResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}`, {
					params: {
						filter: {
							_or: filterOrParams
						},
						fields: [COMMODITY_NAME_FIELD_NAME, COMMODITY_CODE_FIELD_NAME]
					}
				});
				validateCommodityMappingData(commodityMappingResponse);
				console.log(`commodity mapping response: ${JSON.stringify(commodityMappingResponse.data.data)}`);
				const commodityCodeToNameMapping = commodityMappingResponse.data.data.reduce((accumulator: Record<string, string>, commodity: FetchedCommodityData) => {
					accumulator[commodity.code] = commodity.name;
					return accumulator;
				}, {});
				const latestAssayLotsForGenerator: AssayForAssayExchangeGenerator[] = latestAssayLots.map((assay: FetchedAssayLotData) => {
					return {
						lotNumber: assay[LOT_NUMBER_FIELD_NAME],
						commodityName: commodityCodeToNameMapping[assay[ASSAY_LOT_COMMODITY_FIELD_NAME]],
						commodityCode: assay[ASSAY_LOT_COMMODITY_FIELD_NAME],
						analyticalAssay: parseFloat(assay[ASSAY_LOT_SELLER_ASSAY_FIELD_NAME] ?? '0'),
						assayUom: assay[ASSAY_LOT_ASSAY_UOM_FIELD_NAME],
					} as AssayForAssayExchangeGenerator
				});

				const ASSAY_LOTS = latestAssayLotsForGenerator.filter((assay: AssayForAssayExchangeGenerator) => assay.lotNumber !== null) as AssayLotForAssayExchangeGenerator[];
				// only include composite assay items that are not already in the assay lots
				// TODO: find a better way to filter out composite assay items that are already in the assay lots
				const COMPOSITE_ASSAYS = latestAssayLotsForGenerator.filter((assay: AssayForAssayExchangeGenerator) => assay.lotNumber === null && (ASSAY_LOTS.find(assayLot => assayLot.commodityCode === assay.commodityCode) === undefined)) as CompositeAssayForAssayExchangeGenerator[];

				// originally `/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&filter[${METHOD_FIELD_NAME}]=${LATEST_METHOD}&sort[]=${LOT_NUMBER_FIELD_NAME}`
				const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, {params: {
					filter: {
						[FOREIGN_KEY_FIELD_NAME]: {
							'_eq': weightForeignKey,
						},
						[METHOD_FIELD_NAME]: {
							'_eq': LATEST_METHOD,
						}
					},
					sort: [
						LOT_NUMBER_FIELD_NAME
					],
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
				const weightLots = weightLotResponse.data.data.reduce((accumulator: FetchedWeightLotData[][], weightLot: FetchedWeightLotData) => {
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
				const WEIGHTS = weightLotArray.map((weightLot: FetchedWeightLotData) => {
					return {
						lotNumber: weightLot[LOT_NUMBER_FIELD_NAME],
						wetWeight: parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '0'),
						wetWeightUom: weightLot[WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME],
						moisture: (parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '0') - parseFloat(weightLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME] ?? '0')) / parseFloat(weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME] ?? '1') * 100,
						moistureUom: '%',
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
				
				const companyLogoData: NavarchImageData | null = await fetchImage(companyData[COMPANY_LOGO_FIELD_NAME], api, Buffer);

				const signatureId = companyData[COMPANY_SIGNATURE_FIELD_NAME];
				const signatureImageData: NavarchImageData | null = await fetchImage(signatureId, api, Buffer);

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
					'folder_id': await getFolderId(),
					'company_logo': companyLogoData,
					'seller': companyName,
					'seller_address': COMPANY_ADDRESS,
					'seller_phone_number': (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					'buyer': counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					'vessel': !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					'contract_ref': contractResponse.data.data[CONTRACT_NAME_FIELD_NAME],
					'bl_date': formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])),
					'parcel_ref': `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${parcelResponce.data.data[ID_FIELD_NAME]})`,//'CZ-100-GLS (#5)',
					'port_of_loading': `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					'port_of_discharge': `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					'weights': WEIGHTS,
					'assays': ASSAY_LOTS,
					'composite_assays': COMPOSITE_ASSAYS,
					'signatory': SIGNATORY
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
					isGeneratingDoc.value = false;
					failureReason.value = `Something went wrong when generating assay exchange cert, please contact Navarch for assistance.`;
					return;
				}

				const docID = await uploadGeneratedDoc(response.data, api);

				// Clear the company logo and signature images and pass in doc id
				requestBody['doc_name'] = docID;
				requestBody['company_logo'] = null;
				requestBody['signatory']['signature'] = null;

				emit('input', requestBody);
				isGeneratingDoc.value = false;

				// viewPdf(docID);
				downloadPdf(docID);
				
			} catch(error) {
				console.error('[generateProvWeightAndAssay] error=', error);
				failureReason.value = error;
				isGeneratingDoc.value = false;
			}
		}

		// async function copy() {
		// 	isCopying.value = true;
		// 	const { id, user_created, date_created, user_updated, date_updated, assay_exchange_cert, ...requestBody } = formValues.value;
		// 	const copyResponse = await api.post('/items/navarch_assay_exchange', requestBody);

		// 	if (copyResponse.status !== 200) {
		// 		console.error(`[assay exchange::copy] copy response status: ${copyResponse.status}`);
		// 		failureReason.value = `Failed to duplicate assay exchange with status ${copyResponse.status}`;
		// 		return;
		// 	}
		// 	isCopying.value = false;

		// 	window.open(`/admin/content/navarch_assay_exchange/${copyResponse.data.data.id}`);
		// }
	},
});
</script>

<style lang='scss' scoped>
	.margin-top-16px {
		margin-top: 16px;
	}

	.margin-left-16px {
		margin-left: 16px;
	}

	.secondary-button {
		--v-button-background-color: var(--background-page);
		--v-button-color: var(--primary);
		border: 1px solid var(--primary);
		border-radius: var(--border-radius);
	}
	.secondary-button:hover {
		border-color: var(--v-button-background-color-hover);
		--v-button-color: inherit;
	}
</style>
