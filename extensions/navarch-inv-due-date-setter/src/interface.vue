<template>
	<v-sheet>
		<!-- <div>{{ dueDatesByInvoiceType }}</div>
		<div>{{ invoiceTypeList }}</div>
		<div>{{ dateTimeMenu }}</div> -->
		<div v-if="!isContractSelected">Please first select a contract.</div>
		<div v-else-if="!!isContractSelected && !!invoiceTypeList && !!dueDatesByInvoiceType">
			<v-list>
				<v-list-item class="list-item" v-for="dueDateItem in dueDatesByInvoiceType" :key="dueDateItem.inv_type">
					<div 
						class="list-item-component left"
						v-tooltip.bottom="dueDateDecriptionsByInvoiceTypeBasedOnContract[dueDateItem.inv_type]"
					>{{ `${dueDateItem.inv_type} (${dueDatesByInvoiceTypeBasedOnContract[dueDateItem.inv_type]})` }}</div>
					<v-menu ref="dateTimeMenu" :close-on-content-click="false" attached :disabled="dueDateItem.locked" full-height seamless>
						<template #activator="{ toggle, active }">
							<v-input
								:active="active"
								clickable
								readonly
								:model-value="displayDate(dueDateItem.due_date)"
								:disabled="dueDateItem.locked"
								:placeholder="dueDateItem.due_date"
								@click="toggle"
							>
								<template v-if="!dueDateItem.locked" #append>
									<v-icon
										:name="dueDateItem.due_date ? 'clear' : 'today'"
										:class="{ active, 'clear-icon': !!dueDateItem.due_date, 'today-icon': !dueDateItem.due_date }"
										v-on="{ click: dueDateItem.due_date ? () => unsetValue(dueDateItem.inv_type) : null }"
									/>
								</template>
							</v-input>
						</template>

						<v-date-picker
							type="date"
							:disabled="dueDateItem.locked"
							:include-seconds="false"
							:use-24="false"
							:model-value="value"
							@update:model-value="updateDueDate(dueDateItem.inv_type, $event)"
							@close="dateTimeMenu?.deactivate"
						/>
					</v-menu>
					<!-- <v-input
						ref="inputEl"
						type="text"
						:pattern="''"
						:value="dueDateItem.due_date"
						:style="{ width: `${(dueDateItem.due_date?.toString().length || 2) + 1 + 'ch'}` }"
						placeholder="--"
						@input="updateDueDate(dueDateItem.inv_type, $event?.target?.value)"
					/>
					<v-menu
						ref="dateTimeMenu"
						:close-on-content-click="false"
						:show-arrow="true"
						placement="bottom-start"
						seamless
						full-height
					>
						<template #activator="{ toggle }">
							<v-icon class="preview" name="event" small @click="toggle" />
						</template>
						<div class="date-input">
							<v-date-picker
								type="text"
								:model-value="dueDateItem.due_date"
								@update:model-value="(newDate) => updateDueDate(dueDateItem.inv_type, newDate)"
								@close="dateTimeMenu?.deactivate"
							/>
						</div>
					</v-menu> -->
					<!-- <interface-datetime /> -->
					<!-- <v-menu>
						<template #activator="{ toggle, active }">
							<v-input :active="active" clickable readonly @click="toggle" />
						</template>

						<v-date-picker :style="{ width: '50rem'}" />
					</v-menu> -->
					<!-- <v-menu 
						:location="location"
						:style="{ maxHeight: 'none', width: '30rem'}"
					>
						<template #activator="{ toggle }">
							<v-input
								aria-readonly="true"
								@click="toggle"
							/>
						</template>

						<v-date-picker 
							v-model="dueDateItem.due_date"
							:style="{ width: '30rem'}"
							:include-seconds="true"
						/>
					</v-menu> -->
					<!-- <v-date-picker v-model="dueDateItem.due_date"></v-date-picker> -->
					<!-- <v-menu>
						<template v-slot:activator="{ on, attrs }">
							<v-text-field
							v-model="dueDateItem.due_date"
							label="Select Date"
							readonly
							v-bind="attrs"
							v-on="on"
							></v-text-field>
						</template>

						<v-date-picker v-model="dueDateItem.due_date" @input="menuSingle = false"></v-date-picker>
					</v-menu> -->
					<!-- <v-date-picker
						class="list-item-component middle"
						v-model="dueDatesByInvoiceType[invType].due_date"
						:disabled="dueDatesByInvoiceType[invType].locked"
						v-tooltip.bottom="!!dueDatesByInvoiceType[invType].locked ? 'Cannot update due date if locked.' : null"
					/> -->
					<v-checkbox
						class="list-item-component right"
						v-model="dueDateItem.locked" 
						icon-on="check_box"
						icon-off="check_box_outline_blank"
						label='Locked'
						:disabled="dueDateItem.due_date === null"
						v-tooltip.bottom="!!dueDateItem.due_date ? null : 'Please set a due date first.'"
					/>
				</v-list-item>
			</v-list>
		</div>
		<!-- <v-notice v-if="!!failureReason">
			{{ failureReason }}
		</v-notice> -->
	</v-sheet>
</template>

<script lang="ts">
import { 
	defineComponent, 
	Ref, 
	ref, 
	inject, 
	watch 
} from 'vue';
import { useApi } from '@directus/extensions-sdk';

import { 
	DueDateItem,
	PaymentAdviceConfig,
	QpCommodity,
} from './components/type';
import { INVOICE_TYPE_ORDER } from './components/constants';

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
		const dateTimeMenu = ref();
		const isContractSelected: Ref<boolean> = ref(false);
		const failureReason: Ref<string> = ref('');
		const invoiceTypeList: Ref<string[]> = ref([]);
		const paymentAdviceConfigByInvoiceType: Ref<{ [key: string]: number }> = ref({});
		const dueDateDecriptionsByInvoiceTypeBasedOnContract: Ref<{ [key: string]: string }> = ref({});
		const dueDatesByInvoiceTypeBasedOnContract: Ref<{ [key: string]: string }> = ref({});
		const latestQpMonthSelectionForFinalInvoiceType: Ref<{ qp: string | null, date: Date |null }> = ref({ qp: null, date: null });
		const datesToWatchInParcelForm: Ref<{ [key: string]: string[] }> = ref({});
		const dueDatesByInvoiceType: Ref<{ [key: string]: DueDateItem }> = ref(props.value ?? {});
		// const menu = ref({});
		// const menuSingle = ref(false);

		const PARCEL_CONTRACT_FIELD_NAME = 'contract';

		const INVOICE_COLLECTION_NAME = 'navarch_invoices';
		const INVOICE_INV_DATE_FIELD_NAME = 'invoice_date';

		const CONTRACT_PAY_INFO_COLLECTION_NAME = 'navarch_contract_payment_information';
		const CONTRACT_PAY_INFO_RELATED_CONTRACT_FIELD_NAME = 'related_contract';
		const CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME = 'invoice_type';
		const CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAYS_FIELD_NAME = 'pa_days';
		const CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME = 'pa_day_type';
		const CONTRACT_PAY_INFO_PAYMENT_ADVICE_REF_DAY_FIELD_NAME = 'pa_ref_day';

		const PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME = 'estimate_arrival_date';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';
		const PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME = 'parcel_finalisation_date';
		const PARCEL_QP_SELECTION_FIELD_NAME = 'qp_selection';

		const formValues = inject('values', ref<Record<string, any>>({}));
		
		watch(() => formValues.value[PARCEL_CONTRACT_FIELD_NAME], async (newContractIdValue) => {
			isContractSelected.value = !!formValues.value[PARCEL_CONTRACT_FIELD_NAME];
			if (!!newContractIdValue) {
				await loadInvoiceTypeList(newContractIdValue);
				updateDueDateByInvTypeWithNewList();
				updateEstimatedDueDatesBasedOnContract(); // is async
				// console.log(`Due dates by invoice type: ${JSON.stringify(dueDatesByInvoiceType.value)}`);
				// console.log(`Invoice types: ${JSON.stringify(invoiceTypeList.value)}`);
			} else {
				emit('input', null)
			}
		}, { immediate: true });

		watch(dueDatesByInvoiceType, (newDueDatesByInvoiceType) => {
			console.log('[watch] due dates by invoice updated')
			emit('input', JSON.stringify(newDueDatesByInvoiceType));
		}, { deep: true });


		// Watchers for the date fields in the parcel form, probably not the best way to do this but it works for now
		watch(() => formValues.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME], async () => {
			if (Object.keys(datesToWatchInParcelForm.value).includes(PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME)) {
				updateEstimatedDueDatesBasedOnContract(datesToWatchInParcelForm.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME]);
			}
		});

		watch(() => formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME], async () => {
			if (Object.keys(datesToWatchInParcelForm.value).includes(PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME)) {
				updateEstimatedDueDatesBasedOnContract(datesToWatchInParcelForm.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME]);
			}
		});

		watch(() => formValues.value[PARCEL_BL_DATE_FIELD_NAME], async () => {
			if (Object.keys(datesToWatchInParcelForm.value).includes(PARCEL_BL_DATE_FIELD_NAME)) {
				updateEstimatedDueDatesBasedOnContract(datesToWatchInParcelForm.value[PARCEL_BL_DATE_FIELD_NAME]);
			}
		});

		watch(() => formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME], async () => {
			console.log(`[watch] ${PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME} updated`)
			console.log(`[watch] datesToWatchInParcelForm: ${JSON.stringify(datesToWatchInParcelForm.value)}`)
			if (Object.keys(datesToWatchInParcelForm.value).includes(PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME)) {
				console.log(`[watch] ${PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME} included in dates to watch`)
				updateEstimatedDueDatesBasedOnContract(datesToWatchInParcelForm.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME]);
			}
		});

		watch(() => formValues.value[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME], async () => {
			if (Object.keys(datesToWatchInParcelForm.value).includes(PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME)) {
				updateEstimatedDueDatesBasedOnContract(datesToWatchInParcelForm.value[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME]);
			}
		});

		watch(() => formValues.value[PARCEL_QP_SELECTION_FIELD_NAME], (newQpSelection) => {
			console.log(`[watch] ${PARCEL_QP_SELECTION_FIELD_NAME} updated to ${JSON.stringify(newQpSelection)} with type ${typeof newQpSelection}`)
			// TODO: no idea why tf but it gets triggered a second time with a string value, first time it's a proper object though
			updateEstimatedDueDatesBasedOnContract(['Final']); // then update the estimated Final invoice due date based on latestQpMonthSelectionForFinalInvoiceType
		}, { deep: true });

		// const items = ref([
		// 	{ title: 'Click Me' },
		// 	{ title: 'Click Me' },
		// 	{ title: 'Click Me' },
		// 	{ title: 'Click Me 2' },
		// ]);

		// const locations = ref([
		// 	'top',
		// 	'bottom',
		// 	'start',
		// 	'end',
		// 	'center',
		// ]);
		// const location= ref('end');
		
		return { 
			// items,
			// location,
			// locations,
			invoiceTypeList,
			dueDatesByInvoiceType,

			dueDateDecriptionsByInvoiceTypeBasedOnContract,
			dueDatesByInvoiceTypeBasedOnContract,

			isContractSelected,
			failureReason,
			// menu,
			// menuSingle,
			dateTimeMenu,
			updateDueDate,
			unsetValue,
			displayDate,
			formatDate,
		};

		function displayDate(date: string | null) {
			// display date in format like December 19th, 2024
			const dateObj = date ? new Date(date) : null;
			return !!dateObj ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
		}

		function unsetValue(invType:string) {
			dueDatesByInvoiceType.value[invType].due_date = null;
			// e.preventDefault();
			// e.stopPropagation();
			// emit('input', null);
		}

		function updateDueDate(invType: string, newDueDate: string | null) {
			dueDatesByInvoiceType.value[invType].due_date = newDueDate;
		}

		async function loadInvoiceTypeList(contractId: string) {
			console.log('[loadInvoiceTypeList]')
			try {
				const response = await api.get(`/items/${CONTRACT_PAY_INFO_COLLECTION_NAME}`, {
					params: {
						filter: {
							[CONTRACT_PAY_INFO_RELATED_CONTRACT_FIELD_NAME]: { _eq: contractId },
						},
						fields: [ 
							CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME,
							CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAYS_FIELD_NAME,
							CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME,
							CONTRACT_PAY_INFO_PAYMENT_ADVICE_REF_DAY_FIELD_NAME,
						],
					},
				})
				invoiceTypeList.value = response.data.data
					.map((item: any) => item[CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME])
					.filter((invType: string) => Object.keys(INVOICE_TYPE_ORDER).includes(invType))
					.sort((a: string, b: string) => INVOICE_TYPE_ORDER[a] - INVOICE_TYPE_ORDER[b]);
				const datesToWatch: {[key: string]: string[]} = {};
				// TODO: need to optimise usage of this function, it is called multiple times
				findAndSetLatestQpMonthAndGetLastDayOfTheMonth(formValues.value[PARCEL_QP_SELECTION_FIELD_NAME], formValues.value); // must run this before latestQpMonthSelectionForFinalInvoiceType is fetched from
				paymentAdviceConfigByInvoiceType.value = response.data.data.reduce((acc: { [key: string]: PaymentAdviceConfig }, item: any) => {
					// also add to a list of dates to watch for in the parcel form
					const refDateParcelFormName = item[CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME] === 'Final' ?
						qpSelectionToParcelDateField(latestQpMonthSelectionForFinalInvoiceType.value.qp) :
						paRefDayDescriptorToParcelDateField(item[CONTRACT_PAY_INFO_PAYMENT_ADVICE_REF_DAY_FIELD_NAME]);
					
					if (datesToWatch[refDateParcelFormName] instanceof Array) {
						datesToWatch[refDateParcelFormName].push(item[CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME] as string);
					} else {
						datesToWatch[refDateParcelFormName] = [item[CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME] as string];
					}
					acc[item[CONTRACT_PAY_INFO_INV_TYPE_FIELD_NAME]] = {
						days: item[CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAYS_FIELD_NAME],
						day_type: item[CONTRACT_PAY_INFO_PAYMENT_ADVICE_DAY_TYPE_FIELD_NAME],
						ref_day: item[CONTRACT_PAY_INFO_PAYMENT_ADVICE_REF_DAY_FIELD_NAME],
					};
					return acc;
				}, {});
				console.log(`[loadInvoiceTypeList] paymentAdviceConfigByInvoiceType: ${JSON.stringify(paymentAdviceConfigByInvoiceType.value)}`);
				datesToWatchInParcelForm.value = datesToWatch;
			} catch (error) {
				console.error(error);
			};
			console.log('[loadInvoiceTypeList] done')
		}

		function paRefDayDescriptorToParcelDateField(paRefDayDescriptor: any) {
			switch (paRefDayDescriptor) {
				case 'Arrival Date':
					return PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME;
				case 'B/L Date':
					return PARCEL_BL_DATE_FIELD_NAME;
				case 'Invoice Date':
					return INVOICE_INV_DATE_FIELD_NAME;
				case 'Estimated Shipment Date':
					return PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME;
				case 'Parcel Finalisation':
					return PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME;
				default:
					return 'invalid';
			}
		}

		function qpSelectionToParcelDateField(qpSelection: string | null) {
			if (qpSelection === null) {
				return 'invalid';
			}
			const qpSelectionParsed = qpSelection.split(' ');
			const qpSelectionCode = qpSelectionParsed[1];
			switch (qpSelectionCode) {
				case 'MAMA':
					return PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME;
				case 'MOSS':
					return PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME;
				case 'MOS':
				case 'MOAS':
					return PARCEL_BL_DATE_FIELD_NAME;
				default:
					return 'invalid';
			}
		}

		function updateDueDateByInvTypeWithNewList() {
			const newDueDatesByInvoiceType: { [key: string]: DueDateItem } = {};
			// const newMenuStatuses: { [key: string]: boolean } = {};
			const oldInvoiceTypeListAsSaved = Object.keys(dueDatesByInvoiceType.value);
			// check that the old invoice type list and the new invoice type list are the same
			// if they are not, then we need to update the due dates by invoice type
			// if they are the same, then we can just keep the due dates by invoice type as is
			if (invoiceTypeList.value.length === oldInvoiceTypeListAsSaved.length) {
				// check that the invoice types are the same
				const isSame = invoiceTypeList.value.every((invType) => oldInvoiceTypeListAsSaved.includes(invType));
				if (isSame) {
					return;
				}
			}

			invoiceTypeList.value.forEach((invoiceType) => {
				// newMenuStatuses[invoiceType] = false;
				if (dueDatesByInvoiceType.value[invoiceType]) {
					newDueDatesByInvoiceType[invoiceType] = dueDatesByInvoiceType.value[invoiceType];
				} else {
					newDueDatesByInvoiceType[invoiceType] = {
						due_date: null,
						locked: false,
						inv_type: invoiceType,
					};
				}
			});
			dueDatesByInvoiceType.value = newDueDatesByInvoiceType;
			// menu.value = newMenuStatuses;
		}

		async function updateEstimatedDueDatesBasedOnContract(updateOnlyInvTypes?: string[]) {
			console.log('[updateEstimatedDueDatesBasedOnContract]' + (updateOnlyInvTypes ? ` updateOnlyInvTypes: ${JSON.stringify(updateOnlyInvTypes)}` : ''));
			// should run after updateDueDateByInvTypeWithNewList() is run so the latest invoice type list is used
			// also assumes paymentAdviceConfigByInvoiceType is already set and up to date, should only update this whenever the contract is changed
			for (const invType of (updateOnlyInvTypes !== undefined ? updateOnlyInvTypes : invoiceTypeList.value)) {
				if (invType === 'Final') {
					// keep this up to date for Final invoice due date estimation
					findAndSetLatestQpMonthAndGetLastDayOfTheMonth(formValues.value[PARCEL_QP_SELECTION_FIELD_NAME], formValues.value);
				}
				validatePaymentAdvice(
					invType,
					paymentAdviceConfigByInvoiceType.value[invType]['days'],
					paymentAdviceConfigByInvoiceType.value[invType]['day_type'],
					paymentAdviceConfigByInvoiceType.value[invType]['ref_day'],
				);

				const paymentAdvice = {
					invoice_type: invType,
					days: paymentAdviceConfigByInvoiceType.value[invType]['days'],
					day_type: paymentAdviceConfigByInvoiceType.value[invType]['day_type'],
					ref_day: invType === 'Final' ? undefined : paymentAdviceConfigByInvoiceType.value[invType]['ref_day'],
				}
				let readablePaymentAdviceRefDayType = '';
				let refDayAsString;
				if (invType !== 'Final') {
					switch (paymentAdvice['ref_day']) {
						case 'Arrival Date':
							readablePaymentAdviceRefDayType = 'Actual/Estimated Arrival Date from the Parcel form';
							refDayAsString = formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? formValues.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
							break;
						case 'B/L Date':
							readablePaymentAdviceRefDayType = 'B/L Date (or Estimated Shipment Date) from the Parcel form';
							refDayAsString = formValues.value[PARCEL_BL_DATE_FIELD_NAME] ?? formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
							break;
						case 'Invoice Date':
							readablePaymentAdviceRefDayType = 'Invoice Date from the Invoice form';
							const invoiceResponse = await api.get(`/items/${INVOICE_COLLECTION_NAME}`, {
								params: {
									filter: {
										parcel: { _eq: formValues.value.id},
										invoice_type: { _eq: invType },
									},
									sort: '-invoice_date',
									fields: [INVOICE_INV_DATE_FIELD_NAME],
								},
							});
							refDayAsString = invoiceResponse.data.data.length > 0 ? invoiceResponse.data.data[0][INVOICE_INV_DATE_FIELD_NAME] : undefined;
							break;
						// case 'Actual Shipment Date':
						// 	paymentAdviceRefDayType = PARCEL_ACTUAL_SHIPMENT_DATE_FIELD_NAME;
						// 	readablePaymentAdviceRefDayType = 'Actual Shipment Date';
						// 	break;
						case 'Estimated Shipment Date':
							readablePaymentAdviceRefDayType = 'Estimated Shipment Date from the Parcel form';
							refDayAsString = formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
							break;
						case 'Parcel Finalisation':
							if (formValues.value[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === undefined || formValues.value[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME] === null) {
								throw new Error(`[generateInvoice] Parcel has not been finalised, please fill in the the parcel finalisation date in the parcel form.`);
							}
							readablePaymentAdviceRefDayType = 'Parcel Finalisation Date from the Parcel form';
							refDayAsString = formValues.value[PARCEL_PARCEL_FINALISATION_DATE_FIELD_NAME];
							break;
						default:
							throw new Error(`Invalid reference day for payment advice: ${paymentAdvice['ref_day']}; please contact Navarch for support`);
					}
				} else {
					readablePaymentAdviceRefDayType = 'last day of the last QP Month';
				}

				// TODO: for future suggestion for user to set the ref date if it is not set in the Parcel form
				if (invType !== 'Final' && isNullOrUndefined(refDayAsString)) {
					// only Final invoice can have no set refDayAsString since it will use the latest QP Month end date later on when getting the redDate
					throw new Error(`Reference day for payment advice ${readablePaymentAdviceRefDayType} is empty in parcel`);
				}
				console.log(`[updateEstimatedDueDatesBasedOnContract] invType: ${invType}, readablePaymentAdviceRefDayType: ${readablePaymentAdviceRefDayType}, refDayAsString: ${refDayAsString}`);
				// TODO: Evaluating final reference date is too hard right now and requires using the selected QP Selection for Final
				const refDate: Date | null = invType === 'Final' ?
					latestQpMonthSelectionForFinalInvoiceType.value.date : // this must have findAndSetLatestQpMonthAndGetLastDayOfTheMonth run synchronously before this
					new Date(refDayAsString);

				const dayRange = parseInt(paymentAdvice['days']);
				const dayType = paymentAdvice['day_type'];
				if (refDate === null || !isValidDate(refDate)) {
					dueDateDecriptionsByInvoiceTypeBasedOnContract.value[invType] = `${dayRange} ${dayType} ${dayRange < 0 ? 'before' : 'after'} ${readablePaymentAdviceRefDayType} based on contract`;
					dueDatesByInvoiceTypeBasedOnContract.value[invType] = 'N/A';
					continue;
				}
				console.log(`[updateEstimatedDueDatesBasedOnContract] invType: ${invType}, dayRange: ${dayRange}, dayType: ${dayType}, refDate: ${refDate}`);
				let dueDate: Date;
				switch (dayType) {
					case 'Business Day(s)':
						dueDate = addBusinesDays(refDate, dayRange);
						break;
					case 'Calendar Day(s)':
						dueDate = new Date(refDate.valueOf());
						// round up or down depending on the hours of due date to account for daylight savings (date may be based on locale)
						if (dueDate.getHours() >= 12) {
							dueDate.setDate(dueDate.getDate() + dayRange + 1);
						} else {
							dueDate.setDate(dueDate.getDate() + dayRange);
						}
						break;
					default:
						throw new Error(`Invalid day_type for payment advice ${dayType}`);
				}

				console.log(`[updateEstimatedDueDatesBasedOnContract] invType: ${invType}, dueDate: ${dueDate}`);
				dueDateDecriptionsByInvoiceTypeBasedOnContract.value[invType] = `${dayRange} ${dayType} ${dayRange < 0 ? 'before' : 'after'} ${readablePaymentAdviceRefDayType} (${formatDate(refDate)}) based on contract`;
				dueDatesByInvoiceTypeBasedOnContract.value[invType] = formatDate(dueDate);
			}
		}

		function findAndSetLatestQpMonthAndGetLastDayOfTheMonth(qpSelectionByCommodityCode: { [key: string]: QpCommodity }, parcelData) {
			console.log(`[findAndSetLatestQpMonthAndGetLastDayOfTheMonth] qpSelectionByCommodityCode: ${JSON.stringify(qpSelectionByCommodityCode)}`);
			if (typeof qpSelectionByCommodityCode === 'string') {
				qpSelectionByCommodityCode = JSON.parse(qpSelectionByCommodityCode) as { [key: string]: QpCommodity }; // TODO: no idea why qpSelection gets saved again as a string but it does, check the todo in the watcher for the qp_selection field, this should be removed once the bug is fixed
			}
			const qpSelections = Object.values(qpSelectionByCommodityCode);
			const listOfQpSelectedMonthDates = qpSelections
				.map(qpSelection => ({
					qp: qpSelection.qp_selected,
					date: getLastDayOfQpMonthForQpSelection(qpSelection, parcelData)
				}))
				.filter(qp => isValidDate(qp.date))
				.sort((a, b) => (b.date as Date).valueOf() - (a.date as Date).valueOf());

			console.log(`[findAndSetLatestQpMonthAndGetLastDayOfTheMonth] unfiltered: ${JSON.stringify(qpSelections
				.map(qpSelection => ({
					qp: qpSelection.qp_selected,
					date: getLastDayOfQpMonthForQpSelection(qpSelection, parcelData)
				})))}}`);

			console.log(`[findAndSetLatestQpMonthAndGetLastDayOfTheMonth] unsorted: ${JSON.stringify(
				qpSelections
					.map(qpSelection => ({
						qp: qpSelection.qp_selected,
						date: getLastDayOfQpMonthForQpSelection(qpSelection, parcelData)
					}))
					.filter(qp => isValidDate(qp.date))
				)}`);

			console.log(`[findAndSetLatestQpMonthAndGetLastDayOfTheMonth] listOfQpSelectedMonthDates: ${JSON.stringify(listOfQpSelectedMonthDates)}}`);
			if (listOfQpSelectedMonthDates.length === 0) {
				latestQpMonthSelectionForFinalInvoiceType.value = {
					qp: null,
					date: null,
				};
			} else {
				latestQpMonthSelectionForFinalInvoiceType.value = listOfQpSelectedMonthDates[0];
				console.log(`[findAndSetLatestQpMonthAndGetLastDayOfTheMonth] latestQpMonthSelectionForFinalInvoiceType: ${JSON.stringify(latestQpMonthSelectionForFinalInvoiceType.value)}`);
			}
		}

		function getLastDayOfQpMonthForQpSelection(qpCommodity: QpCommodity, parcelData, isDeclaredMandatory: boolean = false) {
			if (isDeclaredMandatory && !qpCommodity.declared) {
				return null;
			}
			const qpSelectionString = qpCommodity?.qp_selected;
			if (!qpSelectionString) {
				return null;
			}

			const qpSelectionParsed = qpSelectionString.split(' ');
			const qpSelection = {
				qp_period: parseInt(qpSelectionParsed[0]),
				qp_code: qpSelectionParsed[1]
			}

			let refDay: Date;
			let readableRefDayType: string;
			switch(qpSelection.qp_code) {
				case 'MAMA':
					refDay = new Date(parcelData[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME]);
					readableRefDayType = 'Actual/Estimated Arrival Date';
					break;
				case 'MOSS':
					refDay = new Date(parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME]);
					readableRefDayType = 'Estimated Shipment Date';
					break;
				case 'MOS':
				case 'MOAS':
					refDay = new Date(parcelData[PARCEL_BL_DATE_FIELD_NAME] ?? parcelData[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME]);
					readableRefDayType = 'B/L Date (or Estimated Shipment Date)';
					break;
				default:
					throw new Error(`Unsupported QP code ${qpSelection.qp_code} in the contract commodities, please ensure all commodity QP codes are MAMA, MOS, MOSS, or MOAS`);
			}

			console.log(`[getLastDayOfQpMonthForQpSelection] qpSelection: ${JSON.stringify(qpSelection)}, refDay: ${refDay}, readableRefDayType: ${readableRefDayType}`);
			return getLastDateOfMonthPlusMonths(refDay, qpSelection.qp_period);
		}

		function addBusinesDays(date: Date, days: number, inclusive: boolean = false) {
			const newDate = new Date(date.valueOf());
			let businessDaysLeft = days - (inclusive ? 1 : 0);
			let minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = true;
			while(isNonTradingDay(newDate)) {
				// if the reference date is a non-trading day
				newDate.setDate(newDate.getDate() + 1);
				if (minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay) {
					businessDaysLeft -= 1;
					minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = false
				}
			}

			while (businessDaysLeft > 0) {
				// minus one business day at a time
				newDate.setDate(newDate.getDate() + 1);
				if (!isNonTradingDay(newDate)) {
					businessDaysLeft -= 1;
				}
			}
			
			if (newDate.getHours() >= 12) {
				// round up depending on hours due to daylight savings (Dates may be based on locale)
				newDate.setDate(newDate.getDate() + 1);
			}

			while (isNonTradingDay(newDate)) {
				// for when the end date is a non-trading day
				newDate.setDate(newDate.getDate() + 1);
			}
			
			return newDate;
		}

		function isNonTradingDay(date: Date) {
			return date.getDay() === 0 || date.getDay() === 6;
		}

		function isNullOrUndefined(value: any) {
			return value === null || value === undefined;
		}

		// function to get the last date of the month of a given date plus a number of months
		function getLastDateOfMonthPlusMonths(date: Date, months: number) {
			const newDate = new Date(date.valueOf());
			// gets the '0th day' of the month after the target month to get the last day of the target month
			newDate.setMonth(newDate.getMonth() + months + 1, 0);
			return newDate;
		}

		function validatePaymentAdvice(invType, days, dayType, refDate) {
			if (!invType) {
				throw new Error('Please ensure the payment advice is properly set in the contract for all invoice types');
			}

			if (!days) {
				throw new Error(`Please ensure that the number of days is set for the ${invType} payment advice of the associated contract`);
			}

			if (!dayType) {
				throw new Error(`Please ensure that the day type is set for the ${invType} payment advice of the associated contract`);
			}

			if (invType !== 'Final' && !refDate) {
				throw new Error(`Please ensure that the reference date is set for the ${invType} payment advice of the associated contract`);
			}
		}

		function isValidDate(d) {
			return d instanceof Date && !isNaN(d.getTime());
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
.list-item {
	margin-bottom: 10px;
}

.list-item-component {
  float: left;
}
.left {
  width: 30%;
}

.middle {
  width: 40%;
}

.right {
  width: 30%;
  padding-left: 20px;
}

/* Clear floats after the columns */
.list-item:after {
  content: "";
  display: table;
  clear: both;
}
</style>
