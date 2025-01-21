<template>
	<v-sheet>
		<!-- <div>{{ qpMonthsDisplay }}</div>
		<div>{{ qpCommodities }}</div> -->
		<div v-if="!isContractSelected">Please select a contract first.</div>
		<div v-else>
			<v-list>
				<v-list-item class="list-item" v-for="commodity in qpCommodities" :key="commodity.commodity_id">
					<div class="list-item-component left">{{ `${commodity.commodity_name} (${qpMonthsDisplay[commodity.commodity_code] ?? '--'}): ` }}</div>
					<v-select
						class="list-item-component middle"
						v-model="commodity.qp_selected"
						:items="qpSelection[commodity.commodity_code] ?? DEFAULT_NA_SELECTION"
						:disabled="commodity.declared"
						v-tooltip.bottom="!!commodity.declared ? 'Cannot change Quotational Period if Declared.' : null"
					/>
					<v-checkbox
						class="list-item-component right"
						v-model="commodity.declared" 
						icon-on="check_box"
						icon-off="check_box_outline_blank"
						label='Declared'
						:disabled="commodity.qp_selected === null"
						v-tooltip.bottom="!!commodity.qp_selected ? null : 'Please select a Quotational Period first.'"
					/>
				</v-list-item>
			</v-list>
		</div>
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
import { QpCommodity, QuotationalPeriod, Selection } from './components/type';

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
		const isContractSelected: Ref<boolean> = ref(false);
		// A Ref of an object with key value pairs
		const qpCommodities: Ref<{ [key: string]: QpCommodity }> = ref(props.value ?? {});
		const qpSelection: Ref<{ [key: string]: Selection[] }> = ref({});
		// This is a default for initial render of the interface when the contract data is still being fetched when the form is opened and the qpSelection isn't formed yet, it should be rendered quick enough for the user to never see this, it's just for the computer to not throw an error
		const DEFAULT_NA_SELECTION = [{ text: 'N/A', value: null }];
		const qpMonthsDisplay: Ref<{ [key: string]: string }> = ref({});
		const commodityCodeList: Ref<string[]> = ref([]);

		const PARCEL_CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME = 'actual_arrival_date';
		const PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME = 'estimate_arrival_date';

		const PARCEL_BL_DATE_FIELD_NAME = 'bl_date';
		const PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME = 'estimated_shipment_date';

		const GENERIC_ID_FIELD_NAME = 'id';
		
		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMMODITY_IN_CONTRACT_RELATIONAL_FILED_NAME = 'contract';
		const COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMMODITY_IN_CONTRACT_PRIMARY_COMMODITY_FIELD_NAME = 'primary_commodity';
		const COMMODITY_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME = 'payable_commodity';
		const COMMODITY_IN_CONTRACT_QP_FIELD_NAME = 'quotational_periods';

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		/**
		 * GET FOREIGN KEY ID LINKING THIS PARCEL ITEM TO MANY ASSAY LOTS
		 */
		const formValues = inject('values', ref<Record<string, any>>({}));
		isContractSelected.value = !!formValues.value[PARCEL_CONTRACT_FIELD_NAME];

		watch(() => formValues.value[PARCEL_CONTRACT_FIELD_NAME], async (newContractIdValue) => {
			if (!!newContractIdValue) {
				loadQpSelectionField(newContractIdValue);
			} else {
				isContractSelected.value = false;
				emit('input', null)
			}
		}, { immediate: true });

		// have a stored list of contract data it depends on, if something changes, allow a reload button to clear it out and change the data?
		// even simpler, just have a reload button to allow users to refetch contract data and update the selection based on that, can be easily replicated for Assay and Weight lot tables

		watch(qpCommodities, (newQpCommodities) => {
			console.log('[watch] changes detected for the QP settings for the commodities');
			// console.log(`[watch] qpCommodities=${JSON.stringify(newQpCommodities)}`);
			// emit('input', null); // For some reason, emitting with newQpCommodities alone will not trigger it to enable the Save button, but emitting a null first will

			// emit('input', newQpCommodities);
			// const clonedQpCommodities = JSON.parse(JSON.stringify(newQpCommodities));
			// emit('input', clonedQpCommodities); // Using cloned object will not trigger the Save button to be enabled
			// // Using a hardcoded object will trigger the Save button to be enabled but only for Silver, not Zinc???
			// emit('input', {"Zn":{"commodity_name":"Zinc","commodity_code":"Zn","commodity_id":1299,"declared":false,"qp_selected":"3 MOAS","qp_selections":[{"text":"1 MOAS (default)","value":"1 MOAS"},{"text":"3 MOAS","value":"3 MOAS"}]},"Ag":{"commodity_name":"Silver","commodity_code":"Ag","commodity_id":19,"declared":false,"qp_selected":"4 MOAS","qp_selections":[{"text":"5 MOAS","value":"5 MOAS"},{"text":"4 MOAS","value":"4 MOAS"},{"text":"2 MAMA (default)","value":"2 MAMA"}]}});
			Object.values(newQpCommodities).forEach((commodity) => {
				// console.log(`[watch] commodity=${JSON.stringify(commodity)} vs old commodity=${JSON.stringify(oldQpCommodities[commodity.commodity_code])}`)
				// if (commodity.qp_selected !== oldQpCommodities[commodity.commodity_code]?.qp_selected) {

					// TODO: when the watcher is set to deep:true, it the old and new value will be the same, so it will not trigger the evaluateQpMonth function, need to find a better solution so we're not resetting the estimated QP Month every time for all commodities
					if (commodity.qp_selected === null) return;
					let date;
					const [ period, code] = commodity.qp_selected.split(' ');
					switch (code) {
						case 'MOS':
						case 'MOAS':
							date = formValues.value[PARCEL_BL_DATE_FIELD_NAME] ?? formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
							break;
						case 'MAMA':
							date = formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] ?? formValues.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME];
							break;
						case 'MOSS':
							date = formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME];
							break;
					}
					console.log(`[watch] date=${date}`)
					evaluateQpMonth(commodity.commodity_code, parseInt(period), date);
				// }
			})
			emit('input', JSON.stringify(newQpCommodities)); // for some reason, it needs to be stringified or it won't enable the Save button in Parcel form
		}, { deep: true });

		watch(() => formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME], (newEstimatedShipmentDate) => {
			Object.values(qpCommodities.value).forEach((commodity) => {
				if (commodity.qp_selected) {
					const [ period, code] = commodity.qp_selected.split(' ');
					if (
						(formValues.value[PARCEL_BL_DATE_FIELD_NAME] === null &&
						(code === 'MOAS' || code === 'MOS')) || 
						code === 'MOSS'
					) evaluateQpMonth(commodity.commodity_code, parseInt(period), newEstimatedShipmentDate);
				}
			});
		}, { immediate: true });

		watch(() => formValues.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME], (newEstimatedArrivalDate) => {
			Object.values(qpCommodities.value).forEach((commodity) => {
				if (commodity.qp_selected) {
					const [ period, code] = commodity.qp_selected.split(' ');
					if (
						formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] === null &&
						code === 'MAMA'
					) evaluateQpMonth(commodity.commodity_code, parseInt(period), newEstimatedArrivalDate);
				}
			});
		}, { immediate: true });

		watch(() => formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME], (newActualArrivalDate) => {
			Object.values(qpCommodities.value).forEach((commodity) => {
				if (commodity.qp_selected) {
					const [ period, code] = commodity.qp_selected.split(' ');
					if (
						formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] !== null &&
						code === 'MAMA'
					) {
						evaluateQpMonth(commodity.commodity_code, parseInt(period), newActualArrivalDate);
					} else if (
						formValues.value[PARCEL_ACTUAL_ARRIVAL_DATE_FIELD_NAME] === null &&
						code === 'MAMA'
					) {
						evaluateQpMonth(commodity.commodity_code, parseInt(period), formValues.value[PARCEL_ESTIMATED_ARRIVAL_DATE_FIELD_NAME]);
					}
				}
			});
		}, { immediate: true });

		watch(() => formValues.value[PARCEL_BL_DATE_FIELD_NAME], (newBlDate) => {
			Object.values(qpCommodities.value).forEach((commodity) => {
				if (commodity.qp_selected) {
					const [ period, code] = commodity.qp_selected.split(' ');
					if (
						(formValues.value[PARCEL_BL_DATE_FIELD_NAME] !== null &&
						(code === 'MOAS' || code === 'MOS'))
					) {
						evaluateQpMonth(commodity.commodity_code, parseInt(period), newBlDate);
					} else if (
						(formValues.value[PARCEL_BL_DATE_FIELD_NAME] === null &&
						(code === 'MOAS' || code === 'MOS'))
					) {
						evaluateQpMonth(commodity.commodity_code, parseInt(period), formValues.value[PARCEL_ESTIMATED_SHIPMENT_DATE_FIELD_NAME]);
					}
				}
			});
		}, { immediate: true });

		return {
			isContractSelected,
			qpCommodities,
			qpSelection,
			DEFAULT_NA_SELECTION,
			commodityCodeList,
			qpMonthsDisplay,
		};

		async function loadQpSelectionField(contractId) {
			isContractSelected.value = true;
			const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}`, {
				params: {
				filter: {
					_and: [
						{
							[COMMODITY_IN_CONTRACT_RELATIONAL_FILED_NAME]: {
								_eq: contractId
							}
						},
						{
							_or: [
								{[COMMODITY_IN_CONTRACT_PRIMARY_COMMODITY_FIELD_NAME]: {
									_eq: true
								}},
								{[COMMODITY_IN_CONTRACT_PAYABLE_COMMODITY_FIELD_NAME]: {
									_eq: true
								}}
							]
						}
					]
				},
					fields: [
						COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME,
						COMMODITY_IN_CONTRACT_QP_FIELD_NAME
					],
				}
			});
			console.log(`[loadQpSelectionField] fetched commodity in contract data=${JSON.stringify(commodityInContractResponse.data.data)}`)
			const listOfCommodityIds = commodityInContractResponse.data.data.map((commodityInContract: any) => commodityInContract[COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME]);
			const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}`, {
				params: {
					filter: {
						[GENERIC_ID_FIELD_NAME]: {
							_in: listOfCommodityIds
						}
					},
					fields: [
						GENERIC_ID_FIELD_NAME,
						COMMODITY_NAME_FIELD_NAME,
						COMMODITY_CODE_FIELD_NAME
					]
				}
			});
			console.log(`[loadQpSelectionField] fetched commodity data=${JSON.stringify(commodityResponse.data.data)}`)

			// list all commodity codes from the selected contract
			commodityCodeList.value = commodityResponse.data.data.map((commodity: any) => commodity[COMMODITY_CODE_FIELD_NAME]);

			// create a map of commodity id to commodity name and code
			const commodityMap = commodityResponse.data.data.reduce((acc: { [key: string]: any }, commodity: any) => {
				acc[commodity[GENERIC_ID_FIELD_NAME]] = {
					name: commodity[COMMODITY_NAME_FIELD_NAME],
					code: commodity[COMMODITY_CODE_FIELD_NAME]
				};
				return acc;
			}, {});

			// use commodityMap to map commodity code to QpCommodity object
			if (Object.keys(qpCommodities.value).length === 0) {
				// When the QP Selection field is first loaded in a new Parcel form and is unpopulated
				qpCommodities.value = commodityInContractResponse.data.data.reduce((acc: { [key: string]: QpCommodity }, commodityInContract: any) => {
					const commodityId = commodityInContract[COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME];
					const commodity = commodityMap[commodityId];
					const QPs = commodityInContract[COMMODITY_IN_CONTRACT_QP_FIELD_NAME] as QuotationalPeriod[];
					const defaultQp = QPs.find((qp) => !!qp.default);
					acc[commodity.code] = {
						commodity_name: commodity.name,
						commodity_code: commodity.code,
						commodity_id: commodityId,
						declared: false, // TODO: also need to use the fetched value for this if it exists
						qp_selected: !!defaultQp ? `${defaultQp.qp_period} ${defaultQp.qp_code}` : null, // TODO: change to use the selected value from the database if it exists; props.value?
					};

					// Also take the chance to populate the qpSelection object
					qpSelection.value[commodity.code] = QPs.map((qp) => ({ 
						text: `${qp.qp_period} ${qp.qp_code}${!!qp.default ? ' (default)' : ''}`, 
						value: `${qp.qp_period} ${qp.qp_code}`,
					}));

					return acc;
				}, {});
			} else {
				// When the QP Selection field is reloaded in an existing Parcel form where it has a saved value
				qpSelection.value = commodityInContractResponse.data.data.reduce((acc: { [key: string]: QpCommodity }, commodityInContract: any) => {
					const commodityId = commodityInContract[COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME];
					const commodity = commodityMap[commodityId];
					acc[commodity.code] = commodityInContract[COMMODITY_IN_CONTRACT_QP_FIELD_NAME].map((qp) => ({ 
						text: `${qp.qp_period} ${qp.qp_code}${!!qp.default ? ' (default)' : ''}`, 
						value: `${qp.qp_period} ${qp.qp_code}`,
					}));

					return acc;
				}, {});
			}
			console.log(`[loadQpSelectionField] qpCommodities=${JSON.stringify(qpCommodities.value)}, and qpSelection=${JSON.stringify(qpSelection.value)}`)

			// emit('input', qpCommodities.value);
		}

		function evaluateQpMonth(commodityCode: string, qpPeriod: number, date: string | null | undefined) {
			if (!qpPeriod || !date) {
				console.log(`[evaluateQpMonth] invalid qpPeriod=${qpPeriod} or date=${date}`);
				return;
			}
			console.log(`[evaluateQpMonth] commodityCode=${commodityCode}, qpPeriod=${qpPeriod}, date=${date}`)
			const dateObj = new Date(date);
			// const newDate = new Date(dateObj.setMonth(dateObj.getMonth() + qpPeriod)); // this shithead here will go weird when accounting for daylight savings in Melbourne when the ref date is 31 March 2024 (Sun)
			// const newMonth = newDate.getMonth();
			const originalMonth = dateObj.getMonth();
			const newMonth = (originalMonth + qpPeriod) % 12;
			const newYear = originalMonth <= newMonth ? dateObj.getFullYear() : dateObj.getFullYear() + 1;
			// convert newMonth to Jan, Feb, Mar, etc.
			const monthNames = [
				"Jan", "Feb", "Mar",
				"Apr", "May", "Jun", "Jul",
				"Aug", "Sep", "Oct",
				"Nov", "Dec"
			];
			const update = { [commodityCode]: `${monthNames[newMonth]} ${newYear}`};
			qpMonthsDisplay.value = { ...qpMonthsDisplay.value, ...update };
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
