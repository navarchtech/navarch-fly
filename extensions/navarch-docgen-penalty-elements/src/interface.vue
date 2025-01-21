<template>
	<!-- <input :value="value" @input="handleChange($event.target.value)" /> -->
	<!-- create a button only interface for Directus-->
	<div v-if="!value">
		<v-button
			@click="() => generatePdf()"
			:loading="isGeneraingDoc"
		>Generate Penalty Elements Doc</v-button>
		<v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice>
	</div>
	<div v-else>
		<v-button
			@click="() => downloadPdf()"
		>Download Penalty Elements Doc
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

enum InvoiceType {
	'Advance',
	'Second Advance',
	'Third Advance',
	'Fourth Advance',
	'Provisional',
	'Second Provisional',
	'Third Provisional',
	'Fourth Provisional',
	'Final',
}

type PenaltyFromInvoice = {
	commodity: string;
	analytical_assay: string;
	assay_uom: string;
	final_penalty_rate: string;
	penalty_per_uom: string;
	final_penalty: string;
}

type Commodity = {
	name: string;
	code: string;
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
		/**
		 * Assumptions:
		 * - penalty section from the Invoices have done the proper unit conversions if needed for the final penalty amount, 
		 * 		- so will only need to convert the dry weight for that invoice and the penalty rate for that element
		 */
		const failureReason: Ref<string> = ref('');
		const isGeneraingDoc: Ref<boolean> = ref(false);
		const isCopying: Ref<boolean> = ref(false);
		const DRY_WEIGHT_UOM = ref('');
		const PENALTY_RATE_UOM = ref('');
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		const PENALTY_ELEMENTS_DOC_GENERATOR_API = '/generate/penalty-elements';

		const PENALTY_ELEMENTS_START_DATE_FIELD_NAME = 'start_date';
		const PENALTY_ELEMENTS_END_DATE_FIELD_NAME = 'end_date';
		const PENALTY_ELEMENTS_FILTER_DATE_FIELD_NAME = 'filter_date';
		const PENALTY_ELEMENTS_INVOICE_TYPE_FIELD_NAME = 'invoice_type';

		const COMPANY_COLLECTION_NAME = 'navarch_company';
		const COMPANY_LOGO_FIELD_NAME = 'logo';

		// const COMM_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		// const COMM_IN_CONTRACT_MINE_FIELD_NAME = 'mine';
		// const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		// const COMM_IN_CONTRACT_CONTRACT_FIELD_NAME = 'contract';
		
		const ID_FIELD_NAME = 'id';
		const FOREIGN_KEY_FIELD_NAME ="foreign_key";
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const METHOD_FIELD_NAME = 'method';
		
		const INVOICE_COLLECTION_NAME = 'navarch_invoices';
		const INVOICE_ID_FIELD_NAME = 'id';
		const INVOICE_PARCEL_FIELD_NAME = 'parcel';
		const INVOICE_INV_TYPE_FIELD_NAME = 'invoice_type';
		const INVOICE_INV_DATE_FIELD_NAME = 'invoice_date';
		const INVOICE_INVOICE_FIELD_NAME = 'invoice';

		const PARCEL_COLLECTION_NAME = 'navarch_parcel';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		// const PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME = 'actual_shipment_date';
		// const PARCEL_INVOICE_DATE_FIELD_NAME = 'invoice_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME = 'parcel_finalisation_date';
		const PARCEL_CONTRACT_FIELD_NAME = 'contract';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_MINE_FIELD = 'mine';
		
		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';
		const COMMODITY_ID_FIELD_NAME = 'id';

		const COUNTERPARTY_COLLECTION_NAME = 'navarch_counterparty';
		const COUNTERPARTY_NAME_FIELD_NAME = 'name';
		const COUNTERPARTY_CODENAME_FIELD_NAME = 'codename';

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol';
		const UNIT_CONVERSION_TO_GRAM_FIELD_NAME = 'conversionToGram';

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
			const { id, user_created, date_created, user_updated, date_updated, penalty_elements, ...requestBody } = formValues.value;
			console.log(`[penalty elements::copy] requestBody=${JSON.stringify(requestBody)}`);
			const copyResponse = await api.post('/items/navarch_penalty_elements', requestBody);

			if (copyResponse.status !== 200) {
				console.log(`[penalty elements::copy] copy response status: ${copyResponse.status}`);
				failureReason.value = `Failed to duplicate penalty elements with status ${copyResponse.status}`;
				return;
			}
			isCopying.value = false;

			window.open(`/admin/content/navarch_penalty_elements/${copyResponse.data.data.id}`);
		}

		async function generatePdf() {
			failureReason.value = '';
			isGeneraingDoc.value = true;
			try {
				const START_DATE = formValues.value[PENALTY_ELEMENTS_START_DATE_FIELD_NAME];
				const END_DATE = formValues.value[PENALTY_ELEMENTS_END_DATE_FIELD_NAME];
				const FILTER_DATE = formValues.value[PENALTY_ELEMENTS_FILTER_DATE_FIELD_NAME];
				const ISSUED_INVOICE_TYPE = formValues.value[PENALTY_ELEMENTS_INVOICE_TYPE_FIELD_NAME];

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
				if (!ISSUED_INVOICE_TYPE) {
					failureReason.value = 'Invoice type not selected';
					isGeneraingDoc.value = false;
					return;
				}

				let filterDate = '';
				switch(FILTER_DATE) {
					case 'Arrival Date':
						filterDate = PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME;
						break;
					// case 'Shipment Date':
					// 	filterDate = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
					// 	break;
					case 'Invoice Date':
						filterDate = INVOICE_INV_DATE_FIELD_NAME;
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

				console.log(`[generatePenaltyElementsDoc] filter date=${filterDate}`);
				const invTypeReqFilter: { [key: string]: any} = {
					[INVOICE_INVOICE_FIELD_NAME]: {
						_nnull: true
					}
				};
				if (filterDate === INVOICE_INV_DATE_FIELD_NAME) {
					invTypeReqFilter[INVOICE_INV_DATE_FIELD_NAME] = {
						_between: [START_DATE,END_DATE]
					}
				} else {
					// fetches all parcels within the selected filter date range, and sorts them in descending order according to the Invoice Date field if the Invoice Type is Latest Issued Invoice (or ascending order if the invoice type is First Issued Invoice) so the latest (or first) one can be picked out. Filters out any parcels with null Invoice Date
					// const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}?filter[_and][0][_and][0][${filterDate}][_between][0]=${START_DATE}&filter[_and][0][_and][0][${filterDate}][_between][1]=${END_DATE}&filter[_and][0][_and][1][${PARCEL_INVOICE_DATE_FIELD_NAME}][_nnull]=true&sort=${ISSUED_INVOICE_TYPE === 'First Issued Invoice' ? '' : '-'}${PARCEL_INVOICE_DATE_FIELD_NAME}`, {
					const parcelResponce = await api.get(`/items/${PARCEL_COLLECTION_NAME}`, {
						params: {
							filter: {
								_and: [
									{ [filterDate]: { _between: [START_DATE,END_DATE] } }
								]
							},
							fields: [
								ID_FIELD_NAME,
								// PARCEL_INVOICE_DATE_FIELD_NAME,
							]
						}
					});

					if (parcelResponce.status !== 200) {
						console.error(`[generateLoadportDisportComparisonDoc] parcelResponce status: ${parcelResponce.status}`);
						failureReason.value = 'Failed to fetch parcels';
						isGeneraingDoc.value = false;
						return;
					}

					if (parcelResponce.data.data.length === 0) {
						failureReason.value = `No parcels found within the selected date range of ${START_DATE} to ${END_DATE} with a non-null Invoice Date`;
						isGeneraingDoc.value = false;
						return;
					}

					// the first parcel is the one with the latest (or first) invoice date dependeing on the selected Issued Invoice Type, the API call to Parcel table was made with a sort order
					const parcelId = parcelResponce.data.data[0][ID_FIELD_NAME];
					invTypeReqFilter[INVOICE_PARCEL_FIELD_NAME] = {
						_in: parcelId
					}
				}

				// get all invoice objects for parcel with parcelId that have an invoice doc generated (i.e. Invoice field is not null)
				// const invoiceResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}?filter[${INVOICE_PARCEL_FIELD_NAME}]=${parcelId}&filter[_and][0][${INVOICE_INVOICE_FIELD_NAME}][_nnull]=true`, {params: {
				const invoiceResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {params: {
					filter: invTypeReqFilter,
					fields: [
						// INVOICE_ID_FIELD_NAME,
						INVOICE_PARCEL_FIELD_NAME,
						INVOICE_INV_TYPE_FIELD_NAME,
						// INVOICE_INVOICE_FIELD_NAME
					],
				}});

				// group invoice type into a list by parcel
				const invoiceTypesByParcel = invoiceResponse.data.data.map((invoice: any) => {
					return {
						parcel: invoice[INVOICE_PARCEL_FIELD_NAME],
						invoiceType: invoice[INVOICE_INV_TYPE_FIELD_NAME],
					}
				}).reduce((prev: Record<string, string[]>, curr: {parcel: string, invoiceType: string}) => {
					if (!prev[curr.parcel]) {
						prev[curr.parcel] = [];
					}
					prev[curr.parcel].push(curr.invoiceType);
					return prev;
				}, {});
				let invoiceTypeParcelCombo = {};
				if (ISSUED_INVOICE_TYPE === 'First Issued Invoice') {
					// get object with the lowest invoice type for each parcel based on InvoiceType enum from invoiceTypesByParcel
					invoiceTypeParcelCombo = Object.keys(invoiceTypesByParcel).reduce((prev: Record<string, string>, curr: string) => {
						const invoiceType = invoiceTypesByParcel[curr].reduce((prev: InvoiceType, curr: string) => {
							return InvoiceType[curr] < prev ? InvoiceType[curr] : prev;
						}, InvoiceType.Final);
						prev[curr] = InvoiceType[invoiceType];
						return prev;
					}, {});
				} else if (ISSUED_INVOICE_TYPE === 'Latest Issued Invoice') {
					// get object with the highest invoice type for each parcel based on InvoiceType enum from invoiceTypesByParcel
					invoiceTypeParcelCombo = Object.keys(invoiceTypesByParcel).reduce((prev: Record<string, string>, curr: string) => {
						const invoiceType = invoiceTypesByParcel[curr].reduce((prev: InvoiceType, curr: string) => {
							return InvoiceType[curr] > prev ? InvoiceType[curr] : prev;
						}, InvoiceType.Advance);
						prev[curr] = InvoiceType[invoiceType];
						return prev;
					}, {});
				} else {
					failureReason.value = 'Invalid invoice type';
					isGeneraingDoc.value = false;
					return;
				}
				console.log(`[generatePenaltyElementsDoc] invoice type parcel combo=${JSON.stringify(invoiceTypeParcelCombo)}`);

				// generate filter for invoice api call
				const invoiceDataFilter = {
					_or: Object.keys(invoiceTypeParcelCombo).map(parcelId => ({
							_and: [
								{
									[INVOICE_PARCEL_FIELD_NAME]: {
										_eq: parcelId
									}
								},
								{
									[INVOICE_INV_TYPE_FIELD_NAME]: {
										_eq: invoiceTypeParcelCombo[parcelId]
									}
								},
								{
									[INVOICE_INVOICE_FIELD_NAME]: {
										_nnull: true
									}
								}
							]
						})
					)
				}

				console.log(`[generatePenaltyElementsDoc] invoice data filter=${JSON.stringify(invoiceDataFilter)}`)

				// get all Invoices for the parcels with parcelIds and invoiceType
				// const invoiceGetApi = `/items/${INVOICE_COLLECTION_NAME}?filter[_and][0][${INVOICE_PARCEL_FIELD_NAME}][_in]=${parcelIds.join(',')}&filter[_and][1][${INVOICE_INV_TYPE_FIELD_NAME}]=${InvoiceType[invoiceType]}&filter[_and][1][${INVOICE_INVOICE_FIELD_NAME}][_nnull]=true&sort=-date_updated`.replace(/ /g, '%20');
				const invoicesResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {params: {
					filter: invoiceDataFilter,
					fields: [
						INVOICE_ID_FIELD_NAME,
						INVOICE_PARCEL_FIELD_NAME,
						INVOICE_INV_TYPE_FIELD_NAME,
						INVOICE_INVOICE_FIELD_NAME
					],
				}});

				console.log(`[generatePenaltyElementsDoc] invoice ids fetched=${invoicesResponse.data.data.map((invoice: any) => invoice[INVOICE_ID_FIELD_NAME]).join(', ')}`);

				if (invoicesResponse.status !== 200) {
					console.error(`[generateLoadportDisportComparisonDoc] invoicesResponse status: ${invoicesResponse.status}`);
					failureReason.value = 'Failed to fetch invoices';
					isGeneraingDoc.value = false;
					return;
				}

				if (invoicesResponse.data.data.length === 0) {
					failureReason.value = `No invoices found for parcels within the selected date range`;
					isGeneraingDoc.value = false;
					return;
				}

				// // TODO: ensure that the assumption that the latest revised invoice for a given Parcel/Invoice Type combo will also be the latest updated invoice is correct
				// // dedupe invoicesResponse.data.data by 'parcel' and 'invoice_type', invoicesResponse should have been sorted by date_updated in descending order so the latest revised invoice for each parcel and invoice type should be the first one
				// const dedupedInvoices = invoicesResponse.data.data.filter((invoice: any, index: number, self: any[]) => {
				// 	const parcel = invoice[INVOICE_PARCEL_FIELD_NAME];
				// 	const invoiceType = invoice[INVOICE_INV_TYPE_FIELD_NAME];
				// 	const currentParcelInvoiceType = `${parcel}_${invoiceType}`;
				// 	const firstIndex = self.findIndex((invoice: any) => {
				// 		const parcel = invoice[INVOICE_PARCEL_FIELD_NAME];
				// 		const invoiceType = invoice[INVOICE_INV_TYPE_FIELD_NAME];
				// 		const parcelInvoiceType = `${parcel}_${invoiceType}`;
				// 		return parcelInvoiceType === currentParcelInvoiceType;
				// 	});
				// 	return index === firstIndex;
				// });

				// extract from dedupedInvoices all the penalty commodities, dedupe after
				const penaltyCommodities = invoicesResponse.data.data.reduce((prev: string[], curr: any) => {

					const invoice = curr[INVOICE_INVOICE_FIELD_NAME];
					if (DRY_WEIGHT_UOM.value === '') {
						// also setting the ref value for dry weight uom
						DRY_WEIGHT_UOM.value = invoice.dry_weight_uom;
					}
					const invoicePenaltiesObject = invoice.penalties;
					if (!invoicePenaltiesObject || !invoicePenaltiesObject.penalties || invoicePenaltiesObject.penalties.length === 0) {
						return prev;
					}
					if (PENALTY_RATE_UOM.value === '') {
						// also setting the ref value for penalty amount per uom
						console.debug(`[generatePenaltyElementsDoc] penalties=${JSON.stringify(invoicePenaltiesObject)}`)
						PENALTY_RATE_UOM.value = `${invoice.currency}/${invoicePenaltiesObject.penalties[0].penalty_per_uom}`;
					}
					const invoicePenaltyCommodities = invoicePenaltiesObject.penalties.map((penalty: any) => penalty.commodity);
					return [...prev, ...invoicePenaltyCommodities];
				}, []).filter((commodity: string, index: number, self: string[]) => self.indexOf(commodity) === index);

				console.log(`[generatePenaltyElementsDoc] penalty commodities=${penaltyCommodities.join(', ')}`);

				const filterString = penaltyCommodities.map((commodity, index) => `filter[_or][${index}][${COMMODITY_NAME_FIELD_NAME}]=${commodity}`).join('&').replace(/ /g, '%20');
				const commodityMappingResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}?${filterString}`, {
					params: {
						fields: [ COMMODITY_NAME_FIELD_NAME , COMMODITY_CODE_FIELD_NAME, COMMODITY_ID_FIELD_NAME ]
					}
				});
				console.log(`commodity mapping response: ${JSON.stringify(commodityMappingResponse.data.data)}`);
				const commodityNameToCodeMapping = commodityMappingResponse.data.data.reduce((accumulator: Record<string, {code: string, id: string}>, commodity: Commodity) => {
					accumulator[commodity[COMMODITY_NAME_FIELD_NAME]] = {
						code: commodity[COMMODITY_CODE_FIELD_NAME],
						id: commodity[COMMODITY_ID_FIELD_NAME],
					};
					return accumulator;
				}, {});

				const PARCELS: any[] = [];
				for (const invoice of invoicesResponse.data.data) {
					const invoicePenaltyObject = invoice[INVOICE_INVOICE_FIELD_NAME].penalties;
					if (!invoicePenaltyObject || !invoicePenaltyObject.penalties) {
						continue;
					}
					const penalties: PenaltyFromInvoice[] = invoicePenaltyObject.penalties;
					const counterpartyResponse = await api.get(`/items/${COUNTERPARTY_COLLECTION_NAME}?filter[${COUNTERPARTY_NAME_FIELD_NAME}]=${invoice[INVOICE_INVOICE_FIELD_NAME].buyer}`, {params: {
						fields: [COUNTERPARTY_CODENAME_FIELD_NAME],
					}});
					const counterpartyCode = counterpartyResponse.data.data[0][COUNTERPARTY_CODENAME_FIELD_NAME];
					const reformattedDryWeight = (invoice[INVOICE_INVOICE_FIELD_NAME].dry_weight as string).replace(/,/g, '');
					const dryWeightConversionFactor = await getWeightUnitConversionValue(invoice[INVOICE_INVOICE_FIELD_NAME].dry_weight_uom, DRY_WEIGHT_UOM.value);
					console.log(`[generatePenaltyElementsDoc] dry weight conversion factor=${dryWeightConversionFactor}`);
					PARCELS.push({
						"id": invoice[INVOICE_PARCEL_FIELD_NAME],
						"name": invoice[INVOICE_INVOICE_FIELD_NAME].shipment_code,
						"vessel": invoice[INVOICE_INVOICE_FIELD_NAME].vessel,
						"invoice_type": invoice.invoice_type,
						"dry_weight": parseFloat(reformattedDryWeight) * dryWeightConversionFactor,
						"penalties": await Promise.all(penalties.map(async (penalty: PenaltyFromInvoice) => await generatePenalty(penalty, counterpartyCode, invoice[INVOICE_PARCEL_FIELD_NAME], commodityNameToCodeMapping)))
					});
				}

				const CURRENCY = invoicesResponse.data.data[0][INVOICE_INVOICE_FIELD_NAME].currency;

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
					"invoice_type": ISSUED_INVOICE_TYPE,
					"parcels": PARCELS,
					// "parcels": [
					// 	{
					// 		"id": 512,
					// 		"name": "TB-439-NRT",
					// 		"vessel": "Edwine Oldendorff",
					// 		"invoice_type": "Second Provisional",
					// 		"dry_weight": 10279.17,
					// 		"penalties": [
					// 			{
					// 				"mine": "TB Mine",
					// 				"commodity_code": "Pb",
					// 				"counterparty": "TB",
					// 				"assay": 7.8150,
					// 				"assay_uom": "%",
					// 				"penalty_rate": 9.63,
					// 				"penalty_amount": 98988.42
					// 			},
					// 			{
					// 				"mine": "TB Mine",
					// 				"commodity_code": "SiO2",
					// 				"counterparty": "DRY",
					// 				"assay": 7.2000,
					// 				"assay_uom": "%",
					// 				"penalty_rate": 8.40,
					// 				"penalty_amount": 86345.04
					// 			}
					// 		]
					// 	},
					// 	{
					// 		"id": 568,
					// 		"name": "TB-449-NRT",
					// 		"vessel": "La Guimorais",
					// 		"invoice_type": "Second Provisional",
					// 		"dry_weight": 10996.28,
					// 		"penalties": [
					// 			{
					// 				"mine": "TB Mine",
					// 				"commodity_code": "Pb",
					// 				"counterparty": "TH",
					// 				"assay": 7.9650,
					// 				"assay_uom": "%",
					// 				"penalty_rate": 5.95,
					// 				"penalty_amount": 65400.38
					// 			},
					// 			{
					// 				"mine": "TB Mine",
					// 				"commodity_code": "Cl+F",
					// 				"counterparty": "DRY",
					// 				"assay": 704.5000,
					// 				"assay_uom": "ppm",
					// 				"penalty_rate": 3.07,
					// 				"penalty_amount": 33731.09
					// 			},
					// 			{
					// 				"mine": "TB Mine",
					// 				"commodity_code": "SiO2",
					// 				"counterparty": "JAS",
					// 				"assay": 7.4050,
					// 				"assay_uom": "%",
					// 				"penalty_rate": 6.61,
					// 				"penalty_amount": 72657.92
					// 			}
					// 		]
					// 	}
					// ],
					"dry_weight_uom": DRY_WEIGHT_UOM.value?.toUpperCase(),
					"penalty_rate_uom": PENALTY_RATE_UOM.value,
					"currency": CURRENCY
				}

				let response: any;
				try {
					response = await api.post(PENALTY_ELEMENTS_DOC_GENERATOR_API, requestBody);
				} catch (error) {
					console.error(`[generatePenaltyElementsDoc] error: ${error}`);
					throw new Error(JSON.stringify(error.response.data));
				}

				if (response.status !== 200) {
					console.log(`[generatePenaltyElementsDoc] response status: ${response.status}`);
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
				console.error('[generatePenaltyElements] error=', error);
				failureReason.value = error;
				isGeneraingDoc.value = false;
			}
		}

		async function getFolderID() {
			const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI('Penalty Elements')}`);

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
				name: 'Penalty Elements',
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
				link.download = filenameDownload ?? 'penalty-elements.pdf';

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

		async function generatePenalty(penalty: PenaltyFromInvoice, counterparty: string, parcelId: string, commodityMap: Record<string, {code: string, id: string}>) {
			const parcelResponse = await api.get(`/items/${PARCEL_COLLECTION_NAME}/${parcelId}`, {params: {
				fields: [PARCEL_CONTRACT_FIELD_NAME],
			}});

			const contractId = parcelResponse.data.data[PARCEL_CONTRACT_FIELD_NAME];
			if (!contractId) {
				throw new Error(`[generatePenalty] no contract found for parcel with id ${parcelId}`);
			}
			const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
				fields: [CONTRACT_MINE_FIELD],
			}});

			if (!contractResponse.data.data[CONTRACT_MINE_FIELD]) {
				throw new Error(`No mine found for contract with id ${contractId}`);
			}

			const commonPenaltyPerUomForDoc = PENALTY_RATE_UOM.value.split('/')[1];
			const penaltyRateConversionFactor = await getWeightUnitConversionValue(penalty.penalty_per_uom, commonPenaltyPerUomForDoc);

			return {
				"mine": contractResponse.data.data[CONTRACT_MINE_FIELD],
				"commodity_code": commodityMap[penalty.commodity]['code'],
				"counterparty": counterparty,
				"assay": parseFloat(penalty.analytical_assay.replace(/,/g, '')),
				"assay_uom": penalty.assay_uom,
				"penalty_rate": parseFloat(penalty.final_penalty_rate.replace(/,/g, '')) / penaltyRateConversionFactor, // since the uom is currency per weight unit, we divide instead of multiply
				"penalty_amount": parseFloat(penalty.final_penalty.replace(/,/g, ''))
			}
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
	},
});
</script>

<style lang="scss" scoped>
.margin-top-16px {
	margin-top: 16px;
}
</style>
