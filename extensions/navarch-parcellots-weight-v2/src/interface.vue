<template>
	<!-- Darkened area over the UI when loading -->
	<v-overlay 
		:active="interfaceState.value.isLoadingWhileEditingLotsViaApi"
		:clickable="false"
	/>

	<!-- Displayed in the Parcel form -->
	<v-table></v-table>
	<v-button>Add Weight</v-button>

	<!-- Displayed when the Drawer is open to show Weight Lots by Method -->
	<v-drawer></v-drawer>
	<v-dialog></v-dialog>
	<v-dialog></v-dialog>
	<v-dialog></v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref, inject, Ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { v4 as uuidv4 } from 'uuid';

import {
	FOREIGN_KEY_FIELD_NAME, 
	METHOD_FIELD_NAME,
	LOT_NUMBER_FIELD_NAME,

	WEIGHT_LOT_COLLECTION_NAME,
	WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
	WEIGHT_LOT_MOISTURE_FIELD_NAME,
	WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
	WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME,
	WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,

	PARCEL_CONTRACT_FIELD_NAME,
	CONTRACT_COLLECTION_NAME,
	CONTRACT_WEIGHT_UOM_FIELD, 
	CONTRACT_MOISTURE_UOM_FIELD, 
	CONTRACT_METHODS_FIELD,
	UNIT_COLLECTION_NAME,
	UNIT_WET_SYMBOL_FIELD,
	UNIT_DRY_SYMBOL_FIELD,
	UNIT_SYMBOL_FIELD,
} from '../../shared/common/constants';
import { 
	DropdownSelection,
	MethodRanked,
	FetchedWeightLotData,
	Weight,
	MethodDisplayType,
	MethodEnumType,
} from '../../shared/common/types'
import {
	evaluateWeights,
	formatEnumForReadability,
	convertMethodDisplayTypeToMethodRanked,
} from '../../shared/common/utils';

import { WeightLotsTableInterfaceState } from './utility/types';
import {
	validateContractData,
	validateDryWetWeightUom,
} from './utility/utils';

/**
 * TODOs:
 * 1. Reload button for weight lots. Where to put it? In the parcel form or the drawer, or both? How would they interact with each other if both?
 * 2. The one for the 'foreignKey' variable
 * 3. Type object for the Contract Data property in the context type
 * 4. Need a better way of handling methods, there's MethodDisplayString, MethodEnumType, Method enum, and MethodRanked enum now. This is getting confusing. Probably need to do the same thing for invoice type
 * 	- requirements: need a be able to come from the human-readable version from API calls, and be able to be ranked (so Planned or Estimated comes first, then Inturn, then Inturn Final, the Outturn)
 */

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
	},
	emits: ['input'],
	setup(_props, { emit }) {
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Setup
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		const api = useApi();
		const formValues = inject('values', ref<Record<string, any>>({}));

		// Fetches from the weight_results_v2 field first; if null, then fetches from the old-and-soon-to-be-deprecated weight_result field; fallback to generate own UUID once the old field is deprecated and removed
		// For new Parcels, the UUID is generated but will only be 'emitted' to be saved when a Weight is created in the opened drawer and the Save button is clicked for it
		let foreignKey = formValues.value['weight_results_v2'] || formValues.value['weight_result'] || null;

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Watchers for state object changes
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// TODO: temporary while the old-soon-to-be-deprecated field is still in use, this way, both fields are kept in sync
		watch(() => formValues.value['weight_result'], newForeignKey => foreignKey = newForeignKey);
		
		const editedWeightLotIds: Ref<{ [key in 'create' | 'update' | 'delete']: string[] }> = ref({
			create: [],
			update: [],
			delete: [],
		});
		watch(editedWeightLotIds, newEditedIds => {
			// Watching for state changes in the editedWeightLotIds object
			console.log(`[navarch-parcellots-weight-v2:watch:editedWeightLotIds] parcel id=${formValues.value.id}; new edited ids=\n${JSON.stringify(newEditedIds)}`);
		}, {deep: true});

		const weightLotsByMethod: Ref<{ [key in MethodRanked]: Weight | null }> = ref({
			[MethodRanked.Estimated]: null,
			[MethodRanked.Planned]: null,
			[MethodRanked.Inturn]: null,
			[MethodRanked.InturnFinal]: null,
			[MethodRanked.Outturn]: null,
		});
		watch(weightLotsByMethod, newWeightLots => {
			// Watching for state changes in the weightLotsByMethod object
			console.log(`[navarch-parcellots-weight-v2:watch:weightLotsByMethod] parcel id=${formValues.value.id}; new weight lots=\n${JSON.stringify(newWeightLots)}`);
		}, {deep: true});

		// Initialised as empty list but must be set on creation based on Contract Data if it exists (selected in the parcel form or is loaded) in the interface state
		const methodSelection: Ref<DropdownSelection[]> = ref([]);
		watch(methodSelection, newSelection => {
			// Watching for state changes in the methodSelection object
			console.log(`[navarch-parcellots-weight-v2:watch:methodSelection] parcel id=${formValues.value.id}; new method selection=\n${JSON.stringify(newSelection)}`);
		}, {deep: true});

		const interfaceState: Ref<WeightLotsTableInterfaceState> = ref({
			isConfirmSavePopupOpen: false,
			isConfirmDeletePopupOpen: false,
			isConfirmClosePopupOpen: false,

			isLoadingWhileAddingNewWeightByMethod: false,
			isLoadingWhileEditingLotsViaApi: false,

			contractData: null, // Also used as a boolean to check if the contract data is loaded/selected (if a non-null object is assigned) or not (if null)
			editingDisabledReason: null, // Also used as a boolean to check if the Weight Lots interface is disabled (if a 'string' reason is provided) or not (if null)
			weightLotsForDrawerDisplay: null, // Also used as a boolean to check if the drawer is open (if a non-null object is assigned) or closed (if null)
		});
		watch(interfaceState, newState => {
			// Watching for state changes in the interfaceState object
			// interfaceState is an object that records the state of the interface, e.g. if the drawer is open, if the interface is disabled (and the reason it is disabled), etc.
			console.log(`[navarch-parcellots-weight-v2:watch:interfaceState] parcel id=${formValues.value.id}; new state=\n${JSON.stringify(newState)}`);
		}, {deep: true});

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// More setup after refs have been initialised
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

		if (foreignKey === null) {
			// if no foreign key is set (should only happen for new parcels), then generate a new UUID only, no need to fetch for weight lots that do not exist yet
			foreignKey = uuidv4();
		} else {
			api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, {
				params: {
					filter: {
						[FOREIGN_KEY_FIELD_NAME]: { '_eq': foreignKey},
					},
					sort: [LOT_NUMBER_FIELD_NAME],
					fields: [
						LOT_NUMBER_FIELD_NAME,
						METHOD_FIELD_NAME,

						WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
						WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME,

						WEIGHT_LOT_MOISTURE_FIELD_NAME,

						WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
						WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
					]
				},
			}).then(response => {
				const fetchedWeightLotData = response.data.data as FetchedWeightLotData[];
				// reduce the fetched data into the WeightLotsForDrawerDisplay object
				const listOfWeights = evaluateWeights(fetchedWeightLotData);
				weightLotsByMethod.value = listOfWeights.reduce((acc, weight) => {
					acc[convertMethodDisplayTypeToMethodRanked(weight.method)] = weight;
					return acc;
				}, {} as { [key in MethodRanked]: Weight | null });
			}).catch(reason => {
				// TODO: put in some error handling here
			});
		}

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Functional watchers
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		watch(() => formValues.value[PARCEL_CONTRACT_FIELD_NAME], async key => {
			console.log(`[navarch-parcellots-weight-v2:watch:contract field] new contract id=${key} for parcel id=${formValues.value.id}`);
			if (key === null) {
				// If the contract field is cleared, clear the contract data as well
				interfaceState.value.contractData = null;
				interfaceState.value.editingDisabledReason = 'Selecting a contract for this parcel is required to create/edit weight lots';
				return;
			}
			// Expects interfaceState contractData to be set at this point
			// if the contract field is changed, fetch the new contract data based on the new contract id
			await getContractData(key);
			// new contract data might have new methods, so update the selectable method selection, depends on the interfaceState contractData having been set by the getContractData function before this
			setSelectableMethodSelection();
			// if contract data is set, then set the editingDisabledReason to null, if not, then use the same reason as before
			interfaceState.value.editingDisabledReason = !!interfaceState.value.contractData ? null : interfaceState.value.editingDisabledReason;
		}, {immediate: true});

		return { 
			weightLotsByMethod,
			interfaceState,
		};

		async function getContractData(contractId: string) {
			console.log(`[navarch-parcellots-weight-v2:getContractData] start with param contractId=${contractId} for parcel id=${formValues.value.id}`);
			try {
				// console.log(`fetching contract data in weight results interface for contract id: ${contractId}`);

				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [
						CONTRACT_WEIGHT_UOM_FIELD, 
						CONTRACT_MOISTURE_UOM_FIELD, 
						CONTRACT_METHODS_FIELD
					],
				}});
				// console.log(`contract data successfully fetched in weight results interface: ${JSON.stringify(contractResponse.data.data)}`);
				const contractResponseData = contractResponse.data.data; // response.data.data is an object response

				validateContractData(contractResponseData);

				const dryWetWeightUom = await api.get(`/items/${UNIT_COLLECTION_NAME}/${contractResponseData.weight_uom}`, {params: {
					fields: [
						UNIT_WET_SYMBOL_FIELD, 
						UNIT_DRY_SYMBOL_FIELD
					],
				}});

				validateDryWetWeightUom(dryWetWeightUom.data.data);

				interfaceState.value.contractData = {
					wetWeightUom: dryWetWeightUom.data.data[UNIT_WET_SYMBOL_FIELD],
					dryWeightUom: dryWetWeightUom.data.data[UNIT_DRY_SYMBOL_FIELD],
					moistureUom: contractResponseData[CONTRACT_MOISTURE_UOM_FIELD],
					methods: contractResponseData[CONTRACT_METHODS_FIELD],
				};

				console.log(`[navarch-parcellots-weight-v2:getContractData] completed for parcel id=${formValues.value.id}`);

			} catch(reason: any) {
				interfaceState.value.editingDisabledReason = `Contract data could not be fetched due to: ${reason.message}`;
				console.error(`[navarch-parcellots-weight-v2:getContractData] failed for parcel id=${formValues.value.id} with reason: ${reason}`);
			}
		}

		function setSelectableMethodSelection() {
			console.log('[navarch-parcellots-weight-v2:setSelectableMethodSelection] start' + ` for parcel id=${formValues.value.id}`);
			if (!interfaceState.value.contractData) {
				// contractData should be set at this point, but adding this here just in case
				methodSelection.value = [];
				console.log('[navarch-parcellots-weight-v2:setSelectableMethodSelection] completed' + ` for parcel id=${formValues.value.id}`);
				return;
			}

			methodSelection.value = interfaceState.value.contractData.methods.map((method: MethodDisplayType) => {
				// The 'methods' property from the contract should already be a human-friendly text for each of the method
				return {
					value: method,
					text: method,
				};
			});
			
			// Remove any selected methods from the list of methods for this parcel based on the contract
			Object.keys(MethodRanked).forEach((method) => {
				if (weightLotsByMethod.value[MethodRanked[(method as MethodEnumType)]] !== null) {
					// All possible values from 'methods' property from the contract should match all the MethodRanked keys when run through the formatReadableEnum function
					// E.g. 'Inturn Final' from the contract data (hence it is in 'methodSelection' property) should have a corresponding MethodRanked enum InturnFinal
					const indexOfSelectionToRemove = methodSelection.value.findIndex(selection => selection.value === formatEnumForReadability(method));
					methodSelection.value.splice(indexOfSelectionToRemove, 1);
				}
			});

			console.log('[navarch-parcellots-weight-v2:setSelectableMethodSelection] completed' + ` for parcel id=${formValues.value.id}`);
		}

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Save, edit, and delete functions
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		function editExistingWeightLot() {};

		function deleteExistingWeightLot() {};

		function addNewWeightLot() {};

		function saveWeightLotChanges() {};

		function stageAllChanges() {
			// cleans up the editedWeightLotIds, i.e. removes all the ids from 'create', 'update' if they are in 'delete' for example
		}

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Drawer functions
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		// Reactive functions
		// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
		function onKeyDown(item: any, fieldType: 'wet_weight' | 'moisture' | 'dry_weight', event: any) {
			console.log(`[navarch-parcellots-weight-v2:onKeyDown] started`);
			// auto evaluates some values depending on which field is being edited, and also handles focusing on the next field when 'Enter' is pressed
			if (event.code === 'Enter' || event.code === 'NumpadEnter') {
				// focus on the next field

				console.log(`[navarch-parcellots-weight-v2:onKeyDown] completed, focusing on the next field`);
				return;
			}

			// When changes are made to wet weight, moisture or dry weight
			if (!!item['wet_weight'] && !!item['moisture'] && !!item['dry_weight']) {
				// if all three fields have values, then update only one depending on the fieldType that is being changed
			} else if (!!item['wet_weight'] && !!item['moisture'] && !item['dry_weight']) {
				// if wet weight and moisture are set, then calculate dry weight
			} else if (!!item['wet_weight'] && !item['moisture'] && !!item['dry_weight']) {
				// if wet weight and dry weight are set, then calculate moisture
			} else if (!item['wet_weight'] && !!item['moisture'] && !!item['dry_weight']) {
				// if moisture and dry weight are set, then calculate wet weight
			}
			
			console.log(`[navarch-parcellots-weight-v2:onKeyDown] completed, auto evaluation performed`);
		};
		
	},
});
</script>
