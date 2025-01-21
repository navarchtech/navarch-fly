<template>
	<div style='display:flex; flex-direction: row'>
		<div v-if='!value'>
			<v-button
				@click='() => generatePdf()'
				:loading='isGeneratingDoc'
			>Generate Cert Of Origin</v-button>
		</div>
		<div v-else>
			<v-button
				@click='() => downloadPdf()'
			>Download Cert Of Origin
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

import { useApi } from '@directus/extensions-sdk';
import { Buffer } from 'buffer/';
import { defineComponent, ref, Ref, inject } from 'vue';

import {
	ID_FIELD_NAME,
	FOREIGN_KEY_FIELD_NAME,
    METHOD_FIELD_NAME,
	LOT_NUMBER_FIELD_NAME,
	PARCEL_FIELD_NAME,

	PARCEL_COLLECTION_NAME,
    PARCEL_WEIGHT_RESULTS_FIELD_NAME,
    PARCEL_CONTRACT_FIELD_NAME,
    PARCEL_SHIPMENT_CODE_FIELD_NAME,
    PARCEL_COUNTERPARTY_FIELD_NAME,
	PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
	PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
    PARCEL_BL_DATE_FIELD_NAME,
    PARCEL_ORIGIN_FIELD_NAME,
    PARCEL_DESTINATION_FIELD_NAME,
	PARCEL_VESSEL_FIELD_NAME,

	WEIGHT_LOT_COLLECTION_NAME,
    WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
	WEIGHT_LOT_MOISTURE_FIELD_NAME,

	COMPANY_COLLECTION_NAME,
    COMPANY_NAME_FIELD_NAME,
    COMPANY_LINE_1_FIELD_NAME,
	COMPANY_LINE_2_FIELD_NAME,
    COMPANY_COUNTRY_FIELD_NAME,
    COMPANY_PHONE_CODE_FIELD_NAME,
    COMPANY_PHONE_NUMBER_FIELD_NAME,
	COMPANY_EMAIL_FIELD_NAME,
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

	COMMODITY_IN_CONTRACT_COLLECTION_NAME,
	COMM_IN_PRIMARY_COMMODITY_FIELD_NAME,
	COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,

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
	evaluateWeights,
} from '../../shared/common/utils';
import {
	Weight,
	FetchedWeightLotData,
	NavarchDocument,
	NavarchImageData,
} from '../../shared/common/types';

import {
	CERT_OF_ORIGIN_DOC_GENERATOR_API_PATH,
	COLLECTION_NAME,
	SAVED_DOC_FIELD_NAME,
	CERT_OF_ORIGIN_FORM_OTHER_COMMENTS_FIELD_NAME,
} from './utility/constants'
import { 
	validateContractData 
} from './utility/utils';

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

		const getFolderId: () => Promise<any> = buildFunctionGetFolderId(NavarchDocument.CertOfOrigin, api);
		const downloadPdf: (docId?: string) => void  = buildFunctionDownloadDoc(props, api, NavarchDocument.CertOfOrigin);

		const genericCopy: () => Promise<void> = buildFunctionCopyDocForm(formValues.value, api, COLLECTION_NAME, SAVED_DOC_FIELD_NAME);
		const copy: () => Promise<void> = async () => {
			isCopying.value = true;
			try {
				await genericCopy();
			} catch (error) {
				failureReason.value = error.message;
			}
			isCopying.value = false;
		};

		return { 
			isGeneratingDoc,
			failureReason,
			generatePdf,
			copy,
			isCopying,
			// viewPdf,
			downloadPdf,
		};

		async function generatePdf(): Promise<void> {
			failureReason.value = null;
			try {
				isGeneratingDoc.value = true;
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
				const companyAddressLine1 = companyData[COMPANY_LINE_1_FIELD_NAME];
				const companyAddressLine2 = !!companyData[COMPANY_LINE_2_FIELD_NAME] ? `,\n${companyData[COMPANY_LINE_2_FIELD_NAME]}` : '';
				const companyAddressCity = !!companyData[COMPANY_CITY_FIELD_NAME] ? `,\n${companyData[COMPANY_CITY_FIELD_NAME]}` : '';
				const companyAddressState = !!companyData[COMPANY_STATE_FIELD_NAME] ? `,\n${companyData[COMPANY_STATE_FIELD_NAME]}` : '';

				const signatureId = companyData[COMPANY_SIGNATURE_FIELD_NAME];
				const signatureImageData: NavarchImageData | null = await fetchImage(signatureId, api, Buffer);

				const SIGNATORY = {
					signatoryName: companyData[COMPANY_SIGNATORY_NAME_FIELD_NAME] as string,
					signatoryTitle: companyData[COMPANY_SIGNATORY_TITLE_FIELD_NAME] as string,
					signature: signatureImageData ?? null,
					company: companyData[COMPANY_NAME_FIELD_NAME] as string
				}

				let companyPhoneCode;
				let companyPhoneNumber;
				if (!!companyData[COMPANY_PHONE_CODE_FIELD_NAME]) {
					const companyPhoneCodeResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_PHONE_CODE_FIELD_NAME]}`, {params: {
						fields: [COUNTRY_PHONE_CODE_FIELD_NAME],
					}});
					companyPhoneCode = companyPhoneCodeResponse.data.data[COUNTRY_PHONE_CODE_FIELD_NAME];
					companyPhoneNumber = companyData[COMPANY_PHONE_NUMBER_FIELD_NAME];
				}

				const companyBaseCountryResponse = await api.get(`/items/${COUNTRY_COLLECTION_NAME}/${companyData[COMPANY_COUNTRY_FIELD_NAME]}`, {params: {
					fields: [COUNTRY_NAME_FIELD_NAME],
				}});
				const companyAddressCountry = !!companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME] ? `, ${companyBaseCountryResponse.data.data[COUNTRY_NAME_FIELD_NAME]}` : '';
				const companyZipcode = !!companyData[COMPANY_ZIP_FIELD_NAME] ? ` ${companyData[COMPANY_ZIP_FIELD_NAME]}` : '';
				const COMPANY_ADDRESS = `${companyAddressLine1}${companyAddressLine2}${companyAddressCity}${companyZipcode}${companyAddressState}${companyAddressCountry}`;

				const companyLogoData: NavarchImageData | null = await fetchImage(companyData[COMPANY_LOGO_FIELD_NAME], api, Buffer);

				const parcelId = formValues.value[PARCEL_FIELD_NAME];
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_ORIGIN_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME
						]
					}
				});

				const weightForeignKey = parcelResponce.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME];

				const vesselId = parcelResponce.data.data[PARCEL_VESSEL_FIELD_NAME];
				let vesselResponse;
				if (!!vesselId) {
					vesselResponse = await api.get(`/items/${VESSEL_COLLECTION_NAME}/${vesselId}`, {params: {
						fields: [VESSEL_NAME_FIELD_NAME],
					}});
				}

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

				const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}/${parcelResponce.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]}`, {params: {
					fields: [COUNTERPARTY_NAME_FIELD_NAME],
				}});

				// const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&sort[]=${LOT_NUMBER_FIELD_NAME}`, { params: {
					const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, { params: {
					filter: {
						[FOREIGN_KEY_FIELD_NAME]: { '_eq': weightForeignKey},
					},
					sort : [
						LOT_NUMBER_FIELD_NAME
					],
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
				const weights = evaluateWeights(weightLotResponse.data.data as FetchedWeightLotData[]);
				let WEIGHT: Weight | null = null;
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Outturn') ?? null;
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Inturn Final') ?? null;
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Inturn') ?? null;
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Estimated') ?? null;
				}
				if (!WEIGHT) {
					WEIGHT = weights.find(weight => weight.method === 'Planned') ?? null;
				}
				if (!WEIGHT) {
					throw new Error(`No weight lot data found for all weight methods. Please ensure weight lot data has been entered in the selected parcel.`);
				}

				const contractId = parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME];
				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [
						CONTRACT_NAME_FIELD_NAME,
					],
				}});
				validateContractData(contractResponse.data.data);
				// const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${PARCEL_CONTRACT_FIELD_NAME}]=${contractId}&filter[${COMM_IN_PRIMARY_COMMODITY_FIELD_NAME}]=true`, {params: {
				const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}`, { params: {
					filter: {
						[PARCEL_CONTRACT_FIELD_NAME]: { '_eq': contractId},
						[COMM_IN_PRIMARY_COMMODITY_FIELD_NAME]: { '_eq': true}, // TODO: verify the response only gives primary commodities with this filter rule
					},
					fields: [
						COMM_IN_CONTRACT_COMMODITY_FIELD_NAME,
					],
				}});
				
				const primaryCommodityId = commodityInContractResponse.data.data[0][COMM_IN_CONTRACT_COMMODITY_FIELD_NAME];
				const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}/${primaryCommodityId}`, {params: {
					fields: [COMMODITY_NAME_FIELD_NAME],
				}});

				const primaryCommodity = commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME] ?? '';

				const requestData = {
					'folder_id': await getFolderId(),
					'parcel_id': parcelId,
					'parcel_ref': `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${parcelId})`,
					'company_logo': companyLogoData ?? null,
					'seller': companyData[COMPANY_NAME_FIELD_NAME],
					'seller_address': COMPANY_ADDRESS,
					'seller_phone_number': (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					'buyer': counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					'vessel': !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					'contract_ref': contractResponse.data.data[CONTRACT_NAME_FIELD_NAME],
					'bl_date': formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])),
					'port_of_loading': `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					'port_of_discharge': `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					'wet_weight': WEIGHT.wetWeight,
					'wet_weight_uom': WEIGHT.wetWeightUom,
					'country_of_origin': originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME],
					'commodity_name': primaryCommodity,
					'other_comments': formValues.value[CERT_OF_ORIGIN_FORM_OTHER_COMMENTS_FIELD_NAME] ?? '',
					'signatory': SIGNATORY
				}

				let response: any;
				try {
					response = await api.post(CERT_OF_ORIGIN_DOC_GENERATOR_API_PATH, requestData);
				} catch (error) {
					console.error(`[generateCertOfOrigin] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generateCertOfOrigin] invoice response status: ${response.status}`);
					failureReason.value = 'Something went wrong while generating the Cert Of Origin. Please try again.';
					isGeneratingDoc.value = false;
					return;
				}

				const docID = await uploadGeneratedDoc(response.data, api);

				// Clear the company logo and signature images and pass in doc id
				requestData['doc_name'] = docID;
				requestData['company_logo'] = null;
				requestData['signatory']['signature'] = null;

				emit('input', requestData);
				isGeneratingDoc.value = false;
				// viewPdf(docID);
				downloadPdf(docID);
			} catch(error) {
				console.error('[generateCertOfOrigin] error=', error);
				failureReason.value = error;
				isGeneratingDoc.value = false;
			}
		}
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
