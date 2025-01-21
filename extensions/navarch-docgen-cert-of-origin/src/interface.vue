<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<div v-if="!value">
		<v-button
			@click="() => generateCertOfOrigin()"
			:loading="isGeneraingDoc"
		>Generate Cert Of Origin</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadPdf()"
		>Download Cert Of Origin
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

		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));
		const isGeneraingDoc: Ref<boolean> = ref(false);
		const isCopying: Ref<boolean> = ref(false);
		console.log('[main] formValues=', formValues);

		const failureReason = ref<string | null>(null);

		const CERT_OF_ORIGIN_GENERATOR_PATH = '/generate/cert-of-origin';

		const COO_PARCEL_FIELD_NAME = 'parcel';
		const COO_OTHER_COMMENTS_FIELD_NAME = 'other_comments';

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

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_NAME_FIELD_NAME = 'name';

		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_PRIMARY_COMMODITY_FIELD_NAME = 'primary_commodity';

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_WET_WEIGHT_FIELD_NAME = 'wet_weight';
		const WEIGHT_LOT_MOISTURE_FIELD_NAME = 'moisture';
		const WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME = 'wet_weight_uom';
		const WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';

		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';

		const COUNTRY_COLLECTION_NAME = 'navarch_country';
		const COUNTRY_NAME_FIELD_NAME = 'name';
		const COUNTRY_PHONE_CODE_FIELD_NAME = 'phone_code';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_COUNTERPARTY_FIELD_NAME = 'counterparty';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_ORIGIN_FIELD_NAME = 'origin';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';
		const PORT_COUNTRY_FIELD_NAME = 'country';

		return { 
			// handleChange,
			isGeneraingDoc,
			failureReason,
			generateCertOfOrigin,
			copy,
			isCopying,
			viewPdf,
			downloadPdf,
		};

		async function copy() {
			isCopying.value = true;
			const { id, user_created, date_created, user_updated, date_updated, cert_of_origin, ...requestBody } = formValues.value;
			console.log(`[cert of origin::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_cert_of_origin', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[cert of origin::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate cert of origin with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_cert_of_origin/${copyResponse.data.data.id}`);
		}

		async function generateCertOfOrigin(): Promise<void> {
			failureReason.value = null;
			try {
				isGeneraingDoc.value = true;
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

				const parcelId = formValues.value[COO_PARCEL_FIELD_NAME];
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {
					params: {
						fields: [
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
							PARCEL_COUNTERPARTY_FIELD_NAME,
							PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME, 
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							// PARCEL_INVOICE_DATE_FIELD_NAME, 
							PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME,
							// PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME,
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
				const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);
				let WEIGHT: Weight | undefined = undefined;
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

				const contractId = parcelResponce.data.data[PARCEL_CONTRACT_FIELD_NAME];
				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [
						CONTRACT_NAME_FIELD_NAME,
					],
				}});
				validateContractData(contractResponse.data.data);
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

				const requestData = {
					"folder_id": await getFolderID(),
					"parcel_id": parcelId,
					"parcel_ref": `${parcelResponce.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]} (#${parcelId})`,
					"company_logo": companyLogoData ?? null,
					"seller": companyData[COMPANY_NAME_FIELD_NAME],
					"seller_address": COMPANY_ADDRESS,
					"seller_phone_number": (!!companyPhoneCode && !!companyPhoneNumber) ? `+${companyPhoneCode} ${companyPhoneNumber}` : null,
					"buyer": counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME],
					"vessel": !!vesselResponse ? vesselResponse.data.data[VESSEL_NAME_FIELD_NAME] : 'N/A',
					"contract_ref": contractResponse.data.data[CONTRACT_NAME_FIELD_NAME],
					"bl_date": formatDate(new Date(parcelResponce.data.data[PARCEL_BL_DATE_FIELD_NAME])),
					"port_of_loading": `${originPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"port_of_discharge": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME]}, ${destinationPortResponse.data.data[PORT_COUNTRY_FIELD_NAME]}`,
					"wet_weight": WEIGHT.wet_weight,
					"wet_weight_uom": WEIGHT.wet_weight_uom,
					"country_of_origin": originPortResponse.data.data[PORT_COUNTRY_FIELD_NAME],
					"commodity_name": primaryCommodity,
					"other_comments": formValues.value[COO_OTHER_COMMENTS_FIELD_NAME] ?? '',
					"signatory": SIGNATORY
				}

				let response: any;
				try {
					response = await api.post(CERT_OF_ORIGIN_GENERATOR_PATH, requestData);
				} catch (error) {
					console.error(`[generateCertOfOrigin] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generateCertOfOrigin] invoice response status: ${response.status}`);
					failureReason.value = 'Something went wrong while generating the Cert Of Origin. Please try again.';
					isGeneraingDoc.value = false;
					return;
				}

				const docID = await uploadGeneratedDoc(response.data);

				// Clear the company logo and signature images and pass in doc id
				requestData['doc_name'] = docID;
				requestData['company_logo'] = null;
				requestData['signatory']['signature'] = null;

				emit('input', requestData);
				isGeneraingDoc.value = false;
				// viewPdf(docID);
				downloadPdf(docID);
			} catch(error) {
				console.error('[generateCertOfOrigin] error=', error);
				failureReason.value = error;
				isGeneraingDoc.value = false;
			}
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Cert Of Origin')}`);

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
				name: 'Cert Of Origin',
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
				link.download = filenameDownload ?? 'cert-of-origin.pdf';

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
			if (!documentID) {
				throw new Error('No document ID found, please ensure the document has been generated');
			}

			// api.get(`/assets/ea89c455-e822-499e-8d25-293b2fb1ea21`).catch(error => {
			// 	console.error(`[viewPdf] error: ${error}`);
			// 	throw new Error('Failed to fetch the document, please try again');
			// }).then(response => {
			// 	const newTab = window.open();
			// 	if (!newTab) {
			// 		throw new Error('Failed to open a new tab');
			// 	}
			// 	const pdfData = Buffer.from(response.data, 'binary');
			// 	// Determine the image type
			// 	const contentType = response.headers['content-type'];
			// 	if (!!contentType) {
			// 		// Open the PDF in a new tab with embedded base64 data pdfData.toString('base64')
			// 		newTab.document.write(`<iframe width="100%" height="100%" src="application/pdf;base64,${pdfData.toString('base64')}"></iframe>`);
			// 	}

			// });
			
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

		// function handleChange(value: string): void {
		// 	emit('input', value);
		// }

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

		function validateContractData(contractData: any) {
			if (!contractData) {
				throw new Error('No contract data found, please ensure the selected parcel has an associated contract');
			}
			if (!contractData[CONTRACT_NAME_FIELD_NAME]) {
				throw new Error('No contract name found for the associated contract of the selected parcel');
			}
		}
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>