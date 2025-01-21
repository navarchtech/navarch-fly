<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generatePdf()"
			:loading="isGeneraingDoc"
		>Generate Loadport-Disport Doc</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadPdf()"
		>Download Loadport-Disport Doc
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

/**
 * Assumptions: 
 * - Can only deal with parcels whose assay and weight results have Inturn and Outturn methods
 * - All data from each parcel must be converted to use the same dry weight uom, assay uom, and final weight uom (will use the first parcel's uoms it finds for now for all 3)
 */

type Assay = {
	method: "Outturn" | "Inturn" | "Inturn Final" | "Estimated" | "Planned";
	commodity: string;

	// TODO: how to get uom for assay? Ans: from the contract
	assay_uom: string;
	total_metal: number;
	final_assay: number;
	total_dry_weight: number;
}

type AssayLot = {
    lot_number: number;
	assay_uom: string;

	final_assay: string;
	dry_weight: string;

	commodity: string;
	method: "Outturn" | "Inturn" | "Inturn Final" | "Estimated" | "Planned";
}

type AssayComposite = {

	assay_uom: string;

	final_assay: string;
	dry_weight: string;

	commodity: string;
	// TODO: come back to this and check if this can be simply Ref<MethodEnum>
	method: "Outturn" | "Inturn" | "Inturn Final" | "Estimated" | "Planned";
}

type Weight = {
	wet_weight?: number;
	wet_weight_uom?: string;
	
	// moisture is only measured in %, so no need to specify uom
	moisture?: number;
	// moisture_uom?: string;

	dry_weight?: number;
	dry_weight_uom?: string;
}

type WeightLot = {
	method: "Outturn" | "Inturn" | "Inturn Final" | "Estimated" | "Planned";

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

type Parcel = {
	id: string;
	shipment_code: string;
	vessel: string;
	destination: string;
	actual_shipment_date: string;
	weight_result: string;
	assay_results: string;
	// contract: string;
}

type ParcelForRequest = {
	id: string;
	name: string;
	vessel: string;
	port: string;
	shipment_date: string;
	dry_weight: {
		loadport: number;
		disport: number;
		variance: number;
		variance_percent: number;
	};
	grade: {
		loadport: number;
		disport: number;
		variance: number;
		variance_percent: number;
	};
	metal: {
		loadport: number;
		disport: number;
		variance: number;
		variance_percent: number;
	};
	metal_uom: string;
	gain_loss: string;
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
		// assay uom to be fetched and assigned in generateRequestBodyParcel()
		const ASSAY_UOM = ref('');
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		const LOADPORT_DISPORT_DOC_GENERATOR_PATH = '/generate/loadport-disport-compare';

		// loadport disport form must have these fields
		const LOADPORT_DISPORT_METAL_FIELD_NAME = 'metal';
		const LOADPORT_DISPORT_START_DATE_FIELD_NAME = 'start_date';
		const LOADPORT_DISPORT_END_DATE_FIELD_NAME = 'end_date';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_LOGO_FIELD_NAME = 'logo';

		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';
		
		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_SHIPMENT_CODE_FIELD_NAME = 'shipment_code';
		const PARCEL_VESSEL_FIELD_NAME = 'vessel';
		const PARCEL_DESTINATION_FIELD_NAME = 'destination';
		const PARCEL_ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const PARCEL_WEIGHT_RESULTS_FIELD_NAME = 'weight_result';

		const VESSEL_COLLECTION_NAME = 'navarch_vessel';
		const VESSEL_NAME_FIELD_NAME = 'name';

		const PORT_COLLECTION_NAME = 'navarch_world_port';
		const PORT_NAME_FIELD_NAME = 'port_name';
		const PORT_COUNTRY_FIELD_NAME = 'country';
		
		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_COMMODITY_FIELD_NAME = 'commodity';
		const ASSAY_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME = 'dry_weight_uom';
		const ASSAY_LOT_FINAL_ASSAY_FIELD_NAME = 'final_assay';
		const ASSAY_LOT_ASSAY_UOM_FIELD_NAME = 'assay_uom';
		const ASSAY_LOT_LOT_NUMBER_FIELD_NAME = 'lot_number';

		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME = 'price_per_uom';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_CONTRACT_CONTRACT_FIELD_NAME = 'contract';

		const ASSAY_UNIT_COLLECTION_NAME = 'navarch_assay_unit';
		const ASSAY_UNIT_UNIT_FIELD_NAME = 'unit';
		const ASSAY_UNIT_CONVERSION_TO_PPB_FIELD_NAME = 'conversion_to_ppb';
		const ASSAY_UNIT_COMPOSITION_FIELD_NAME = 'composition';

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol';
		const UNIT_DRY_SYMBOL_FIELD_NAME = 'dry_symbol';
		const UNIT_UNIT_FIELD_NAME = 'unit';
		const UNIT_CONVERSION_TO_GRAM_FIELD_NAME = 'conversionToGram';
		
		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_WEIGHT_UOM_FIELD = 'weight_uom';

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
			const { id, user_created, date_created, user_updated, date_updated, loadport_disport_doc, ...requestBody } = formValues.value;
			console.log(`[loadport disport::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_loadport_disport', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[loadport disport::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate loadport disport with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_loadport_disport/${copyResponse.data.data.id}`);
		}

		async function generatePdf() {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				isGeneraingDoc.value = true;
				const selectedMetal = formValues.value[LOADPORT_DISPORT_METAL_FIELD_NAME];
				const START_DATE = formValues.value[LOADPORT_DISPORT_START_DATE_FIELD_NAME];
				const END_DATE = formValues.value[LOADPORT_DISPORT_END_DATE_FIELD_NAME];

				if (!selectedMetal) {
					failureReason.value = 'Metal not selected';
					isGeneraingDoc.value = false;
					return;
				}
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

				const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}/${selectedMetal}`, {params: {
					fields: [COMMODITY_CODE_FIELD_NAME, COMMODITY_NAME_FIELD_NAME],
				}});

				// localhost:8055/items/navarch_parcel?limit=25&filter[_and][0][_and][0][date_created][_between][0]=2022-05-31&filter[_and][0][_and][0][date_created][_between][1]=2023-09-01
				const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}?filter[_and][0][_and][0][${PARCEL_BL_DATE_FIELD_NAME}][_between][0]=${START_DATE}&filter[_and][0][_and][0][${PARCEL_BL_DATE_FIELD_NAME}][_between][1]=${END_DATE}`, {
					params: {
						fields: [
							ID_FIELD_NAME,
							PARCEL_SHIPMENT_CODE_FIELD_NAME,
							PARCEL_VESSEL_FIELD_NAME,
							PARCEL_DESTINATION_FIELD_NAME,
							PARCEL_BL_DATE_FIELD_NAME,
							PARCEL_ASSAY_RESULTS_FIELD_NAME, 
							PARCEL_WEIGHT_RESULTS_FIELD_NAME, 
							PARCEL_CONTRACT_FIELD_NAME, 
						]
					}
				});	

				if (parcelResponce.data.data.length === 0) {
					failureReason.value = `No parcels found with actual shipment date in the date range ${START_DATE} to ${END_DATE}`;
					isGeneraingDoc.value = false;
					return;
				}

				// Need to get the UOM used to measure the weight of the metal selected, using the contract of the first parcel found
				// TODO: assumes the first parcel's contract will have the value for the UOM used to measure the weight of the metal selected. Will not necessarily be the case, need to handle it
				const contractId = parcelResponce.data.data[0][PARCEL_CONTRACT_FIELD_NAME];

				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [
						CONTRACT_WEIGHT_UOM_FIELD
					],
				}});

				console.log(`[generateLoadportDisportComparisonDoc] contract=${JSON.stringify(contractResponse.data.data)} for contract Id=${contractId} and parcel id=${parcelResponce.data.data[0][ID_FIELD_NAME]}`);
				const dryWeightUom = await api.get(`/items/${UNIT_COLLECTION_NAME}/${contractResponse.data.data.weight_uom}`, {params: {
					fields: [ 
						UNIT_DRY_SYMBOL_FIELD_NAME,
						UNIT_UNIT_FIELD_NAME,
					],
				}});
				const dryWeightUomSymbol: string = dryWeightUom.data.data[UNIT_DRY_SYMBOL_FIELD_NAME] ?? '';
				// Take the first letters of dryWeightUom.data.data[UNIT_UNIT_FIELD_NAME] as separated by space and capitalise it, add 's' after for plurality
				const dryWeightUomName = (dryWeightUom.data.data[UNIT_UNIT_FIELD_NAME]?.split(' ').map(word => word[0].toUpperCase() + word.substring(1)).join(' ') + 's') ?? '';

				const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${COMM_IN_CONTRACT_CONTRACT_FIELD_NAME}]=${contractId}&filter[${COMM_IN_CONTRACT_COMMODITY_FIELD_NAME}]=${selectedMetal}`, {params: {
					fields: [
						COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME,
					],
				}});

				if (commodityInContractResponse.data.data.length === 0 || !commodityInContractResponse.data.data[0][COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]) {
					failureReason.value = `Commodity ${selectedMetal} not found in contract ${contractId} or does not have a Base Price Per UOM set`;
					isGeneraingDoc.value = false;
					return;
				}

				console.log(`[generateLoadportDisportComparisonDoc] commodity in contract response=${JSON.stringify(commodityInContractResponse.data.data)} for contract Id=${contractId} and parcel id=${parcelResponce.data.data[0][ID_FIELD_NAME]}`)
				const pricePerUomResponse = await api.get(`/items/${UNIT_COLLECTION_NAME}/${commodityInContractResponse.data.data[0][COMM_IN_CONTRACT_PRICE_PER_UOM_FIELD_NAME]}`, {params: {
					fields: [UNIT_SYMBOL_FIELD_NAME],
				}});
				const finalMetalWeightUom = pricePerUomResponse.data.data[UNIT_SYMBOL_FIELD_NAME];

				const PARCELS: ParcelForRequest[] = [];
				for (const parcel of (parcelResponce.data.data as Parcel[])) {
					const parcelForRequest = await generateRequestBodyParcel(parcel, commodityResponse.data.data[COMMODITY_CODE_FIELD_NAME], finalMetalWeightUom, dryWeightUomSymbol);
					PARCELS.push(parcelForRequest);
				}

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

				const requestData = {
					"folder_id": await getFolderID(),
					"company_logo": companyLogoData,
					"start_date": formatDate(new Date(START_DATE)),
					"end_date": formatDate(new Date(END_DATE)),
					"metal": commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME],
					"assay_uom": ASSAY_UOM.value,
					"dry_weight_uom": dryWeightUomSymbol.toUpperCase(),
					"dry_weight_uom_name": dryWeightUomName,
					"parcels": PARCELS,
					// "parcels": [
					// 	{
					// 		"id": "219",
					// 		"name": "TB-349-DJF",
					// 		"vessel": "Edwine Oldendorff",
					// 		"port": "Huangpu New Port",
					// 		"shipment_date": "20 Jan 23",
					// 		"dry_weight": {
					// 			"loadport": 11002.49,
					// 			"disport": 11016.59,
					// 			"variance": 14.10,
					// 			"variance_percent": 0.13
					// 		},
					// 		"grade": {
					// 			"loadport": 47.00,
					// 			"disport": 44.77,
					// 			"variance": -2.23,
					// 			"variance_percent": -4.97
					// 		},
					// 		"metal": {
					// 			"loadport": 5171.2,
					// 			"disport": 4932.6,
					// 			"variance": -238.6,
					// 			"variance_percent": -4.84
					// 		},
					// 		"metal_uom": "mt",
					// 		"gain_loss": "Loss"
					// 	},
					// 	{
					// 		"id": "212",
					// 		"name": "TB-342-OXL",
					// 		"vessel": "Dry Oldy",
					// 		"port": "Lianyungang",
					// 		"shipment_date": "25 Jan 23",
					// 		"dry_weight": {
					// 			"loadport": 8967.63,
					// 			"disport": 9037.00,
					// 			"variance": 69.37,
					// 			"variance_percent": 0.77
					// 		},
					// 		"grade": {
					// 			"loadport": 48.00,
					// 			"disport": 45.13,
					// 			"variance": -2.87,
					// 			"variance_percent": -6.36
					// 		},
					// 		"metal": {
					// 			"loadport": 4304.5,
					// 			"disport": 4078.4,
					// 			"variance": -226.1,
					// 			"variance_percent": -5.54
					// 		},
					// 		"metal_uom": "mt",
					// 		"gain_loss": "Loss"
					// 	},
					// 	{
					// 		"id": "215",
					// 		"name": "TB-253-OFH",
					// 		"vessel": "Edwine Oldendorff",
					// 		"port": "Huangpu New Port",
					// 		"shipment_date": "30 Jan 23",
					// 		"dry_weight": {
					// 			"loadport": 9051.64,
					// 			"disport": 9117.97,
					// 			"variance": 66.33,
					// 			"variance_percent": 0.73
					// 		},
					// 		"grade": {
					// 			"loadport": 46.00,
					// 			"disport": 45.90,
					// 			"variance": -0.10,
					// 			"variance_percent": -0.23
					// 		},
					// 		"metal": {
					// 			"loadport": 4163.8,
					// 			"disport": 4184.8,
					// 			"variance": 21.0,
					// 			"variance_percent": 0.50
					// 		},
					// 		"metal_uom": "mt",
					// 		"gain_loss": "Gain"
					// 	}
					// ]
				}

				let response: any;
				try {
					response = await api.post(LOADPORT_DISPORT_DOC_GENERATOR_PATH, requestData);
				} catch (error) {
					console.error(`[generateLoadportDisportComparisonDoc] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}
				
				if (response.status !== 200) {
					console.log(`[generateLoadportDisportComparisonDoc] response status: ${response.status}`);
					failureReason.value = response.data;
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
				console.error('[generateProvWeightAndAssay] error=', error);
				failureReason.value = error;
				isGeneraingDoc.value = false;
			}
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
				link.download = filenameDownload ?? 'loadport-disport.pdf';

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

		async function generateRequestBodyParcel(parcel: Parcel, commodityCode: string, metalUom: string, dryWeightUom: string): Promise<ParcelForRequest> {
			const assayForeignKey = parcel[PARCEL_ASSAY_RESULTS_FIELD_NAME];

			// /items/navarch_assay_lot?limit=25&filter[_and][0][_or][0][method][_eq]=Inturn&filter[_and][0][_or][1][_and][0][lot_number][_nnull]=true&filter[_and][0][_or][1][_and][1][method][_eq]=Outturn
			const assayLotResponse = await api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${ASSAY_LOT_COMMODITY_FIELD_NAME}]=${commodityCode}&filter[${FOREIGN_KEY_FIELD_NAME}]=${assayForeignKey}&filter[_and][0][_or][0][method][_eq]=Inturn&filter[_and][0][_or][1][_and][0][lot_number][_nnull]=true&filter[_and][0][_or][1][_and][1][method][_eq]=Outturn`, {
				params: {
					fields: [
						ASSAY_LOT_COMMODITY_FIELD_NAME, 
						METHOD_FIELD_NAME,
						ASSAY_LOT_FINAL_ASSAY_FIELD_NAME, 
						ASSAY_LOT_LOT_NUMBER_FIELD_NAME,
						ASSAY_LOT_ASSAY_UOM_FIELD_NAME,
						ASSAY_LOT_DRY_WEIGHT_FIELD_NAME,
						ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME
					],
				}
			});

			if (ASSAY_UOM.value === '') {
				ASSAY_UOM.value = assayLotResponse.data.data[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME];
			}

			const assays = evaluateAssayData(assayLotResponse.data.data as AssayLot[]);

			// const weightLotResponse = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${weightForeignKey}&filter[${METHOD_FIELD_NAME}]=Inturn&filter[${METHOD_FIELD_NAME}]=Outturn`, {params: {
			// 	fields: [ 
			// 		WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
			// 		WEIGHT_LOT_WET_WEIGHT_FIELD_NAME, 
			// 		METHOD_FIELD_NAME,
			// 		WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME, 
			// 		WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME
			// 	],
			// }});

			// const weights = evaluateWeights(weightLotResponse.data.data as WeightLot[]);

			const vesselId = parcel[PARCEL_VESSEL_FIELD_NAME];
			let vesselResponse;
			if (!!vesselId) {
				vesselResponse = await api.get(`/items/${VESSEL_COLLECTION_NAME}/${vesselId}`, {params: {
					fields: [VESSEL_NAME_FIELD_NAME],
				}});
			}

			const destinationPortResponse = await api.get(`/items/${PORT_COLLECTION_NAME}/${parcel[PARCEL_DESTINATION_FIELD_NAME]}`, {params: {
				fields: [
					PORT_NAME_FIELD_NAME,
					PORT_COUNTRY_FIELD_NAME,
				],
			}});

			const dryWeightVariance = evaluateVarianceAndPercentage(assays.inturn?.total_dry_weight, assays.outturn?.total_dry_weight);
			const gradeVariance = evaluateVarianceAndPercentage(assays.inturn?.final_assay, assays.outturn?.final_assay);
			const metalVariance = evaluateVarianceAndPercentage(assays.inturn?.total_metal, assays.outturn?.total_metal);

			const dryWeightConversionFactor = await getWeightUnitConversionValue(assayLotResponse.data.data[0][ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME], dryWeightUom);
			const assayConversionFactor = await getAssayUnitConversionValue(assayLotResponse.data.data[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME], ASSAY_UOM.value);
			const finalMetalConversionFactor = await getConversionValuesForContainedMetal(metalUom, assayLotResponse.data.data[0][ASSAY_LOT_DRY_WEIGHT_UOM_FIELD_NAME], assayLotResponse.data.data[0][ASSAY_LOT_ASSAY_UOM_FIELD_NAME]);

			return {
				"id": parcel.id,
				"name": parcel.shipment_code,
				"vessel": `${vesselResponse?.data?.data[VESSEL_NAME_FIELD_NAME] ?? 'No vessel name found'}`,
				"port": `${destinationPortResponse.data.data[PORT_NAME_FIELD_NAME] ?? 'No port found'}`,
				"shipment_date": formatShortDate(new Date(parcel.actual_shipment_date)),
				"dry_weight": {
					"loadport": (assays.inturn?.total_dry_weight ?? 0) * dryWeightConversionFactor,
					"disport": (assays.outturn?.total_dry_weight ?? 0) * dryWeightConversionFactor,
					"variance": dryWeightVariance.variance,
					"variance_percent": dryWeightVariance.variance_percent,
				},
				"grade": {
					"loadport": (assays.inturn?.final_assay ?? 0) * assayConversionFactor,
					"disport": (assays.outturn?.final_assay ?? 0) * assayConversionFactor,
					"variance": gradeVariance.variance,
					"variance_percent": gradeVariance.variance_percent,
				},
				"metal": {
					"loadport": (assays.inturn?.total_metal ?? 0) * finalMetalConversionFactor,
					"disport": (assays.outturn?.total_metal ?? 0) * finalMetalConversionFactor,
					"variance": metalVariance.variance,
					"variance_percent": metalVariance.variance_percent,
				},
				"metal_uom": metalUom,
				"gain_loss": metalVariance.variance_percent > 0 ? "Gain" : "Loss",
			}
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Loadport-Disport Comparison')}`);

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
				name: 'Loadport-Disport Comparison',
			});

			return response.data.data.id;
		}

		function evaluateVarianceAndPercentage(loadport: number | undefined | null, disport: number | undefined | null): { variance: number, variance_percent: number } {
			if (
				(loadport === undefined || loadport === null)
			) {
				throw new Error('Loadport (Inturn) assays must be defined as composite assays, at least one parcel with actual shipment date in the date range does not meet this criteria');
			}
			if (
				(disport === undefined || disport === null)
			) {
				throw new Error('Disport (Outturn) assays must be defined as assay lots, at least one parcel with actual shipment date in the date range does not meet this criteria');
			}
			const variance = disport - loadport;
			const variance_percent = variance / loadport * 100;
			return {
				variance,
				variance_percent,
			}
		}

		function evaluateAssayData(lotsOrComposite: (AssayLot |AssayComposite)[]): {
			outturn: Assay | null,
			inturn: Assay | null,
		} {
			// Assumptions: all assay lots/composite assays have the same commodity item
			const assayValues: {
				outturn: Assay | null,
				inturn: Assay | null,
			} = {
				outturn: null,
				inturn: null,
			}
			if (!lotsOrComposite) {
				return assayValues;
			}
			const groupedAssays = groupAssaysByMethodAndCommodity(lotsOrComposite);
			let assay: Assay | null = null;
			for(const groupedAssay of groupedAssays){
				if (groupedAssay.length === 1 && !isNotComposite(groupedAssay[0])) {
					assay = evaluateAssayDataForComposite(groupedAssay[0] as AssayComposite);
				} else {
					assay = evaluateAssayDataForLots(groupedAssay);
				}
				if (assay != null) {
					if (assay.method === 'Inturn') {
						assayValues.inturn = assay;
					} else if (assay.method === 'Outturn') {
						assayValues.outturn = assay;
					}
				}
			}
			return assayValues;
		}

		function evaluateAssayDataForComposite(composite: AssayComposite): Assay | null {
			if (!composite) {
				return null;
			}
			const parsedTotalDryWeight = parseOptionalNumber(composite.dry_weight);
			const parsedFinalAssay = parseOptionalNumber(composite.final_assay);
			const assay = {
				method: composite.method,
				commodity: composite.commodity,
				assay_uom: composite.assay_uom,
				total_metal: parsedTotalDryWeight * parsedFinalAssay,
				final_assay: parsedFinalAssay,
				total_dry_weight: parsedTotalDryWeight,
			}
			return assay;
		}

		function isNotNullAssayLot(lotToCheck: AssayLot | null | undefined): lotToCheck is AssayLot {
			return !!lotToCheck;
		}

		function evaluateAssayDataForLots(assayLots: (AssayLot | AssayComposite)[]): Assay | null {
			if (!assayLots) {
				return null;
			}
			const filteredAssayLots = (assayLots.filter(isNotComposite) as AssayLot[]).filter(isNotNullAssayLot);
			if (filteredAssayLots.length === 0) {
				return null;
			}

			const firstLot = filteredAssayLots[0] as AssayLot;

			let assay = {
				method: firstLot.method,
				commodity: firstLot.commodity,
				// Assay UoM should be the same for all assay lots with the same commodity and method as defined in the contract, will assume firstLot.assay_uom is the same for all lots here
				assay_uom: firstLot.assay_uom,
				final_assay: 0,
				total_metal: 0,
				total_dry_weight: 0,
			}

			filteredAssayLots.forEach(lot => {
				assay.total_metal = parseOptionalNumber(assay.total_metal) + parseOptionalNumber(lot.final_assay)*parseOptionalNumber(lot.dry_weight);
				assay.total_dry_weight = parseOptionalNumber(assay.total_dry_weight) + parseOptionalNumber(lot.dry_weight);
			});
			if (assay.total_dry_weight === 0) {
				throw new Error(`Total dry weight of assay lots for commodity ${assay.commodity} and method ${assay.method} is 0 for one of the parcels within the date range`);
			}
			assay.final_assay = parseOptionalNumber(assay.total_metal) / assay.total_dry_weight;

			return assay;
		}

		function parseOptionalNumber(value: any, defaultValue: number = 0): number {
			if (value === undefined || value === null || isNaN(value)) {
				return defaultValue;
			}
			return parseFloat(value);
		}

		function groupAssaysByMethodAndCommodity(lotsOrComposite: (AssayLot | AssayComposite)[]): (AssayLot | AssayComposite)[][] {
			const group = {
				'Inturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				// 'Inturn Final': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				'Outturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
			};
			
			lotsOrComposite.forEach(lot => {
				if (!group[lot.method]) {
					// Do not do anything if lot is not of method Inturn or Outturn, perhaps may need to be able to handle Inturn Final one day?
					return;
				}
				if (!group[lot.method][lot.commodity]) {
					group[lot.method][lot.commodity] = [lot];
				} else {
					// Shouldn't be null/undefined
					group[lot.method][lot.commodity]?.push(lot);
				}
			});
			return [
				...Object.values(group['Inturn']),
				// ...Object.values(group['Inturn Final']),
				...Object.values(group['Outturn']),
			]
		}

		function isNotComposite(lotToCheck: AssayLot | AssayComposite | null | undefined): boolean {
			if (!lotToCheck) {
				return false;
			}
			return !!(('lot_number' in lotToCheck) && !!lotToCheck.lot_number);
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
			const year = date.getFullYear();
			return `${day} ${monthNames[monthIndex]} ${year}`;
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
