<template>
	<div>
		<v-overlay
			:active="isEditingLotsViaApi"
			:clickable="false"
		/>
		<v-table
			class="weight-table"
			:headers="weightTableHeaders"
			:items="weights"
			:rowHeight="30"
			@click:row="event => rowClickHandler(event)"
			fixedHeader
			inline
		>
			<template #[`item.wet_weight`]="{ item }">
				<div>
					{{ `${formatNumber(item.wet_weight)}${isNullOrUndefined(item.wet_weight) ? '' : item.wet_weight_uom}` }}
				</div>
			</template>
			<template #[`item.moisture`]="{ item }">
				<div>
					{{ formatNumber(item.moisture) }}
				</div>
			</template>
			<template #[`item.dry_weight`]="{ item }">
				<div>
					{{ `${formatNumber(item.dry_weight)}${isNullOrUndefined(item.dry_weight) ? '' : item.dry_weight_uom}` }}
				</div>
			</template>
		</v-table>
		<v-button
			@click="() => addNewWeightByMethod()"
			class="margin-top-16px"
			:disabled="isEditingDisabled || isContractNotFound"
			v-tooltip.bottom="(isEditingDisabled || isContractNotFound) ? (disableEditWeightLotButtonReason ?? 'Editing has been disabled') : null"
		>Add Weight</v-button>
		<v-drawer
			v-model="isOpen"
			@toggle="openConfirmCloseDrawerOverly" 
			@cancel="openConfirmCloseDrawerOverly"
			icon="scale"
			title="Edit Weights"
			subtitle="Weight Lots"
		>
			<template #actions>
				<v-button rounded :disabled="(isEditingDisabled || isContractNotFound)" v-tooltip.bottom="(isEditingDisabled || isContractNotFound) ? (disableEditWeightLotButtonReason ?? 'Editing has been disabled') : null" @click="openConfirmSaveOverlay" icon><v-icon name="check" /></v-button>
				<v-button class="v-button-red-on-hover" rounded @click="openConfirmDeleteWeightOverlay" :disabled="(isEditingDisabled || isContractNotFound)" v-tooltip.bottom="(isEditingDisabled || isContractNotFound) ? (disableEditWeightLotButtonReason ?? 'Editing has been disabled') : null" icon><v-icon name="delete" /></v-button>
			</template>
			<div class="drawer-content">
				<div class="input-label">{{`Weight Result${!!sharedMethodForLots ? ` for ${sharedMethodForLots}` : ''}`}}</div>
				<v-table
					class="weight-table"
					:headers="weightTableHeaders"
					:items="selectedWeightForDrawerDisplay"
					:rowHeight="30"
					fixedHeader
					inline
				>
					<template #[`item.wet_weight`]="{ item }">
						<div>
							{{ `${formatNumber(item.wet_weight)}${isNullOrUndefined(item.wet_weight) ? '' : item.wet_weight_uom}` }}
						</div>
					</template>
					<template #[`item.moisture`]="{ item }">
						<div>
							{{ formatNumber(item.moisture) }}
						</div>
					</template>
					<template #[`item.dry_weight`]="{ item }">
						<div>
							{{ `${formatNumber(item.dry_weight)}${isNullOrUndefined(item.dry_weight) ? '' : item.dry_weight_uom}` }}
						</div>
					</template>
				</v-table>
				<fieldset :disabled="(isEditingDisabled || isContractNotFound)">
					<div class="input-label">Method</div>
					<v-select
						v-model="sharedMethodForLots"
						:items="methodSelection"
						:disabled="!isAddingNewWeightByMethod"
					/>
					<div class="input-label">Weight Lots</div>
					<v-table
						class="weight-table"
						:headers="weightLotTableHeaders"
						:items="weightLotsToDisplay"
						:rowHeight="30"
						fixedHeader
						inline>
							<template #[`header.wet_weight`]="{ header }">
								<div>
									{{ `${header.text} (${wetWeightUnitSelection})` }}
								</div>
							</template>
							<template #[`header.dry_weight`]="{ header }">
								<div>
									{{ `${header.text} (${dryWeightUnitSelection})` }}
								</div>
							</template>
							<template #[`item.delete`]="{ item }">
								<v-icon :class="colourDeleteIcon(item.id)" :name="deleteIcon(item.id)" @click="() => deleteButtonHandler(item.id)" v-tooltip.top="deleteButtonTooltip(item.id)" />
							</template>
							<template #[`item.wet_weight`]="{ item }">
								<v-input class="weight_cell" v-model="weightLotsToDisplay[item.lot_number - 1].wet_weight" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'wet_weight', event)" :nullable="true" :id="`weightlots-1-${item.lot_number}`" />
							</template>
							<template #[`item.moisture`]="{ item }">
								<v-input class="weight_cell" v-model="weightLotsToDisplay[item.lot_number - 1].moisture" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'moisture', event)" :nullable="true" :id="`weightlots-2-${item.lot_number}`" />
							</template>
							<template #[`item.dry_weight`]="{ item }">
								<v-input class="weight_cell" v-model="weightLotsToDisplay[item.lot_number - 1].dry_weight" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'dry_weight', event)" :nullable="true" :id="`weightlots-3-${item.lot_number}`" />
							</template>
					</v-table>
					<v-button 
						class="margin-top-16px"
						:disabled="(isEditingDisabled || isContractNotFound) || sharedMethodForLots === undefined" 
						v-tooltip.bottom="(isEditingDisabled || isContractNotFound) ? (disableEditWeightLotButtonReason ?? 'Editing has been disabled') : (sharedMethodForLots === undefined ? 'Cannot add new lot without a method selected' : null)" 
						@click="addNewWeightLot"
					>
						Add New Lot
					</v-button>
				</fieldset>
				<v-notice v-if="!!saveOperationCannotBePerformedReason">
					{{ saveOperationCannotBePerformedReason }}
				</v-notice>
			</div>
		</v-drawer>
		<v-dialog v-model="confirmCloseDrawerOverlay">
			<v-card>
				<v-card-title>Unsaved changes</v-card-title>
				<v-card-text>Are you sure you want to leave this page?</v-card-text>
				<v-card-actions>
					<v-button secondary @click="confirmCloseDrawer">Discard Changes</v-button>
					<v-button @click="closeConfirmCloseDrawerOverlay">Keep Editing</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
		<v-dialog v-model="confirmSaveOverlay">
			<v-card>
				<v-card-title>New changes made</v-card-title>
				<v-card-text>The changes will be saved even if other changes to the Parcel is not saved. Are you sure you want to save?</v-card-text>
				<v-card-actions>
					<v-button secondary @click="closeConfirmSaveOverlay">Keep Editing</v-button>
					<v-button :loading="isEditingLotsViaApi" @click="confirmSave">Save Changes</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
		<v-dialog v-model="confirmDeleteWeightOverlay">
			<v-card>
				<v-card-title>{{`Delete ${!!sharedMethodForLots ? `${sharedMethodForLots} ` : ''}weights`}}</v-card-title>
				<v-card-text>This action is permanent and can not be undone. Are you sure you would like to proceed?</v-card-text>
				<v-card-actions>
					<v-button secondary @click="closeConfirmDeleteWeightOverlay">Keep Editing</v-button>
					<v-button class="v-button-red" :loading="isEditingLotsViaApi" @click="confirmDeleteWeight">Delete</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, inject, Ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
	TableHeader,
	ContractData,
	Weight,
	WeightLot,
	UpdatableSharedLotProperties,
	AggregatableWeightLotFields,
	SharedLotPropertyFields
 } from './components/types';
import { MethodEnum } from '../../navarch-weight-table/src/components/types';

/**
 * TOOD:
 * programmitcally program css to highlight
 * button for delete
 * group table by method using v-list-group
 * pull commodities data from contract 
 * modal to confirm action when closing without saving, and saving
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

		/**
		 * TODO:
		 * - handle changed weight units in the contract when there are already weight lot items saved with the old unit???
		 * 
		 */

		const weightTableHeaders = ref<TableHeader[]>([
			{
				text: `Method`,
				value: 'method',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Wet Weight',
				value: 'wet_weight',
				sortable: false,
				width: 150,
				align: 'left',
			},
			// {
			// 	text: 'Wet Weight UoM',
			// 	value: 'wet_weight_uom',
			// 	sortable: false,
			// 	width: 150,
			// 	align: 'left',
			// },
			{
				text: 'Moisture (%)',
				value: 'moisture',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Dry Weight',
				value: 'dry_weight',
				sortable: false,
				width: 150,
				align: 'left',
			},
			// {
			// 	text: 'Dry Weight UoM',
			// 	value: 'dry_weight_uom',
			// 	sortable: false,
			// 	width: 150,
			// 	align: 'left',
			// }
		]);
		const weightLotTableHeaders = ref<TableHeader[]>([
			{
				text: `To Delete`,
				value: 'delete',
				sortable: false,
				width: 60,
				align: 'left',
			},
			{
				text: `Lot`,
				value: 'lot_number',
				sortable: false,
				width: 60,
				align: 'left',
			},
			{
				text: 'Wet Weight',
				value: 'wet_weight',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Moisture (%)',
				value: 'moisture',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Dry Weight',
				value: 'dry_weight',
				sortable: false,
				width: 150,
				align: 'left',
			},
		]);

		const contractData = ref<ContractData | null>(null);

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const CONTRACT_FIELD_NAME = 'contract';
		const FOREIGN_KEY_FIELD_NAME = 'foreign_key';
		const LOT_NUMBER_FIELD_NAME = 'lot_number';
		const PARCEL_FINALISED_FIELD_NAME = 'parcel_finalised';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_WEIGHT_UOM_FIELD = 'weight_uom';
		const CONTRACT_MOISTURE_UOM_FIELD = 'moisture_uom';
		const CONTRACT_METHODS_FIELD = 'methods';

		const INVALID_ID = 'INVALID_ID';
		const DESELECT_METHOD = '-- Deselect method --';
		const SELECT_METHOD = '-- Select a method --';

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD = 'symbol';
		const UNIT_WET_SYMBOL_FIELD = 'wet_symbol';
		const UNIT_DRY_SYMBOL_FIELD = 'dry_symbol';

		const weights: Ref<Weight[]> = ref([]);
		// a ref to store the index of the selected  from 'weights' ref array
		const selectedWeightIndex: Ref<number> = ref(-1);
		// an array to store the weight lots to display
		const weightLotsToDisplay: Ref<WeightLot[]> = ref([]);
		// an array to store the ids of weight lots to update
		const weightLotsToUpdate: Ref<string[]> = ref([]);
		// an array to store the ids of weight lots to create
		const weightLotsToCreate: Ref<string[]> = ref([]);
		// an array to store the ids of weight lots to delete
		const weightLotsToDelete: Ref<string[]> = ref([]);

		const sharedMethodForLots: Ref<string | undefined> = ref(undefined);

		const selectedWeightForDrawerDisplay: Ref<Weight[]> = ref([]);

		const isAddingNewWeightByMethod = ref(false);

		// Some features are disabled if no contract is selected for this parcel form, e.g. Weight creation
		const isContractNotFound: Ref<boolean> = ref(!contractData.value);
		const isEditingDisabled: Ref<boolean> = ref(false);
		const disableEditWeightLotButtonReason: Ref<string | null> = ref(null);

		const confirmCloseDrawerOverlay = ref(false);
		
		const confirmSaveOverlay = ref(false);

		const confirmDeleteWeightOverlay = ref(false);

		const isEditingLotsViaApi = ref(false);

		const saveOperationCannotBePerformedReason: Ref<string | null> = ref(null);
		const NO_OF_FOCUSABLE_INPUT_FIELDS_FOR_LOTS_TABLE = 3;
			
		const isOpen = ref(false);
		let onKeyDownTimer: any;
		
		/**
		 * GET FOREIGN KEY ID LINKING THIS PARCEL ITEM TO MANY weight LOTS
		 */
		const formValues = inject('values', ref<Record<string, any>>({}));
		console.log(`[setup] weight lots table form values=${JSON.stringify(formValues.value)}`);
		let foreign_key = formValues.value['weight_result'] || formValues.value['weight_lot'] || formValues.value['weight_results'] || formValues.value['weight_lots'];
		console.log(`[setup] weight lots table foreign key=${foreign_key}`);
		if (!foreign_key) {
			foreign_key = uuidv4();
			console.log(`[setup] key generated for weight lots=${foreign_key}`);
			// Should I use props.value instead of 'foreign_key' variable for the value of this interface?
			// emit('input', foreign_key);
		};

		const api = useApi();
		
		/**
		 * Get units for selection and also setup api object
		 */
		const wetWeightUnitSelection: Ref<string | undefined> = ref(contractData.value?.wetWeightUOM);
		const dryWeightUnitSelection: Ref<string | undefined> = ref(contractData.value?.dryWeightUOM);
		const weightUnits: Ref<Selection[]> = ref([]);
		getUnitsSelection().then(value => {
			console.log(`[getUnitsSelection]`)
			weightUnits.value = value;
		});

		// TODO: can't seem to set the return value of getMethodsFromContract() to Selection[], not type casting it for now, can probably be fixed once we use API calls to fetch data from the actual contract
		const allMethodSelection: Ref = ref([]);
		const methodSelection: Ref = ref([]);

		watch(sharedMethodForLots, (newValue) => {
			if (!!newValue && !!methodSelection.value[0]) {
			console.log(`[setup::watcher] method selected, Deselection option added`)
				methodSelection.value[0].text = DESELECT_METHOD
			} else if (!!methodSelection.value[0]) {
			console.log(`[setup::watcher] method selected, Selection option added`)
				methodSelection.value[0].text = SELECT_METHOD
			}
		})

		const selectedContractKey: Ref<string | undefined> = ref(undefined);
		
		// add 'immediate: true' option to run the callback in this watcher on first render
		watch(() => formValues.value[CONTRACT_FIELD_NAME], async (key) => {
				console.log(`[setup weight lots] change in contract field in the parcel form detected with a new id value=${key}`);
				selectedContractKey.value = key;
				await getContractData(key);
				assignMethodSelectionRef();
				disableEditWeightLotButtonReason.value = null;
			}, {immediate: true}
			// }
		);

		watch(contractData, (newValue) => {
			console.log(`[setup weight lots] contract data change detected`)
			if (!!newValue) {
				wetWeightUnitSelection.value = newValue.wetWeightUOM;
				dryWeightUnitSelection.value = newValue.dryWeightUOM;
			}
			isContractNotFound.value = !newValue;
		});

		// add 'immediate: true' option to run the callback in this watcher on first render
		watch(() => formValues.value[PARCEL_FINALISED_FIELD_NAME], async (isParcelFinalised) => {
				console.log(`[setup weight lots] change in parcel finalised field in the parcel form detected with a new value=${isParcelFinalised}`);
				if (isParcelFinalised) {
					disableEditWeightLotButtonReason.value = 'Cannot edit weight lot data to a finalised parcel';
					isEditingDisabled.value = true;
				} else {
					disableEditWeightLotButtonReason.value = null;
					isEditingDisabled.value = false;
				}
			}, {immediate: true}
		);

		// fetch weight lots based on the foreign key
		// sort weight lots into weight by method and calculate aggregate values
		api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${foreign_key}&sort[]=${LOT_NUMBER_FIELD_NAME}`).then(async response => {
			console.log(`[getWeightLots] weight lots fetched with id=${foreign_key}`);
			weights.value = evaluateWeights(response.data.data as WeightLot[]);
		}).catch(reason => console.error(`[getWeightLots] fetching the weight lots with id=${foreign_key} went wrong due to=${reason}`));

		// logic to update, delete, and create weight lots
		// weight should already have three weights for each of the methods, no adding or deleting

		// watch([wetWeightUnitSelection, dryWeightUnitSelection], stageUomBatchUpdate);

		return { 
			weightTableHeaders, 
			weightLotTableHeaders,

			weightUnits,
			wetWeightUnitSelection,
			dryWeightUnitSelection,
			methodSelection,
			sharedMethodForLots,
			selectedWeightForDrawerDisplay,

			weights,
			weightLotsToDisplay,
			weightLotsToDelete,
			weightLotsToUpdate,
			weightLotsToCreate,

			isOpen,
			isAddingNewWeightByMethod,
			isEditingDisabled,
			isContractNotFound,
			disableEditWeightLotButtonReason,
			isEditingLotsViaApi,

			confirmCloseDrawerOverlay,
			openConfirmCloseDrawerOverly,
			closeConfirmCloseDrawerOverlay,
			confirmCloseDrawer,
			confirmSaveOverlay,
			openConfirmSaveOverlay,
			closeConfirmSaveOverlay,
			confirmSave,
			saveOperationCannotBePerformedReason,
			confirmDeleteWeightOverlay,
			openConfirmDeleteWeightOverlay,
			closeConfirmDeleteWeightOverlay,
			confirmDeleteWeight,

			rowClickHandler,
			addNewWeightByMethod,
			addNewWeightLot,
			deleteButtonHandler,
			deleteButtonTooltip,
			onKeyDown,
			save,
			toggleDrawer,

			deleteIcon,
			colourDeleteIcon,
			formatNumber,
			isNullOrUndefined,
		};

		/**
		 * Get functions
		 */

		async function getItems(collection: string, fieldsToFetch: string[]) {
			console.log('[getItems]');
			let response = await api.get(`/items/${collection}`, {params: {
				fields: fieldsToFetch,
			}});
			return response.data.data;
		}

		async function getUnitsSelection(): Promise<Selection[]> {
			console.log('[getUnitsSelection]');
			let response = await getItems(UNIT_COLLECTION_NAME, [UNIT_SYMBOL_FIELD]);
			return response.map(item => ({text: item[UNIT_SYMBOL_FIELD], value: item[UNIT_SYMBOL_FIELD]}));
		}

		async function getContractData(contractId: string) {
			console.log(`[getContractData] contract id=${contractId}`);
			if (!contractId) {
				// A contract has not been selected yet for this parcel item, assign null to contractData. Don't just do nothing in case the user deselected the contract, the old contract data needs to be cleared.
				contractData.value = null;
				console.log(`[getContractData] contract data has been cleared or is not selected`)
				return;
			}
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

				contractData.value = {
					wetWeightUOM: dryWetWeightUom.data.data[UNIT_WET_SYMBOL_FIELD],
					dryWeightUOM: dryWetWeightUom.data.data[UNIT_DRY_SYMBOL_FIELD],
					moistureUOM: contractResponseData[CONTRACT_MOISTURE_UOM_FIELD],
					methods: contractResponseData[CONTRACT_METHODS_FIELD],
				};

				console.log(`[getContractData] contract data with id=${contractId} successfully fetched with methods=${contractData.value[CONTRACT_METHODS_FIELD]}, moisture uom=${contractResponseData[CONTRACT_MOISTURE_UOM_FIELD]}, wet weight uom=${dryWetWeightUom.data.data[UNIT_WET_SYMBOL_FIELD]}, dry weight uom=${dryWetWeightUom.data.data[UNIT_DRY_SYMBOL_FIELD]}`);

			} catch(reason: any) {
				disableEditWeightLotButtonReason.value = `Contract data could not be fetched due to: ${reason.message}`;
				console.error(`[getContractData] fetching the contract data went wrong due to: ${reason}`);
			}
		}

		function validateDryWetWeightUom(dryWetWeightUomResponse: any) {
			console.log(`[validateDryWetWeightUom]`)
			if (!dryWetWeightUomResponse) {
				throw new Error(`Weight uom response is empty, please ensure a valid weight UOM has been selected in the contract`);
				// return false;
			}

			// check if wet_symbol field exists
			if (!dryWetWeightUomResponse.wet_symbol) {
				throw new Error(`Contract field 'Weight UOM' may have an invalid 'Wet Symbol' field value of ${dryWetWeightUomResponse.wet_symbol}, please ensure a valid UOM with a proper Wet Symbol is selected`);
			}

			// check if dry_symbol field exists
			if (!dryWetWeightUomResponse.dry_symbol) {
				throw new Error(`Contract field 'Weight UOM' may have an invalid 'Dry Symbol' field value of ${dryWetWeightUomResponse.dry_symbol}, please ensure a valid UOM with a proper Dry Symbol is selected`);
			}
			console.log(`[validateDryWetWeightUom] fetched uom for dry/wet weights are valid`)
		}

		function validateContractData(contractDataResponse: any) {
			console.log(`[validateContractData]`)
			if (!contractDataResponse) {
				throw new Error(`Contract data response is empty, please ensure the selected contract for this parcel still exists`);
				// return false;
			}

			// check if weight_uom field exists
			if (!contractDataResponse[CONTRACT_WEIGHT_UOM_FIELD]) {
				throw new Error(`Contract field 'Weight UOM' is empty`);
			}

			// check if weight_uom field exists
			if (!contractDataResponse[CONTRACT_MOISTURE_UOM_FIELD]) {
				throw new Error(`Contract field 'Moisture UOM' is empty`);
			}

			// check if methods field exists and is of type Array of Strings
			if (!contractDataResponse[CONTRACT_MOISTURE_UOM_FIELD] || 
				!Array.isArray(contractDataResponse[CONTRACT_METHODS_FIELD])
			) {
				throw new Error(`Contract field 'Methods' is empty or not a list`);
			}
			console.log(`[validateContractData] contract data validated`)
		}

		function assignMethodSelectionRef() {
			console.log('[assignMethodSelectionRef]');
			if (!contractData.value) {
				console.error('[assignMethodSelectionRef] contract data is not defined')
				allMethodSelection.value = [];
				return;
			}
			const unselectedOption = {text: SELECT_METHOD, value: undefined};
			allMethodSelection.value = [unselectedOption, ...contractData.value.methods.map(method => ({text: method, value: method}))];
			console.log(`[assignMethodSelectionRef] methods from contract=${contractData.value.methods.join(', ')}`);
			methodSelection.value = filterUnusedMethods();
		}

		/**
		 * Event handlers
		 */
		function rowClickHandler(event) {
			const clickedItem = event.item as Weight;
			console.log(`[rowClickHandler] weight lots with method=${clickedItem.method} selected`);
			const clickedItemIndex = weights.value.findIndex(item => item.method === clickedItem.method);
			selectedWeightIndex.value = clickedItemIndex;
			// console.log(`clicked item: ${JSON.stringify(clickedItem)}`);
			weightLotsToDisplay.value = cloneLots(clickedItem.lots);

			sharedMethodForLots.value = clickedItem.method;
			dryWeightUnitSelection.value = clickedItem.dry_weight_uom;
			wetWeightUnitSelection.value = clickedItem.wet_weight_uom;

			selectedWeightForDrawerDisplay.value = [clickedItem];

			toggleDrawer();
			console.log('[rowClickHandler] open drawer');
		}

		function addNewWeightByMethod() {
			console.log('[addNewWeightByMethod]');
			if (!contractData.value) {
				console.error('[addNewWeightByMethod] contract data is not defined. The add button should have been disabled')
				return [];
			}
			isAddingNewWeightByMethod.value = true;
			methodSelection.value = filterUnusedMethods();
			// console.log(`methodSelection: ${JSON.stringify(methodSelection.value)}`);

			dryWeightUnitSelection.value = contractData.value.dryWeightUOM;
			wetWeightUnitSelection.value = contractData.value.wetWeightUOM;

			selectedWeightForDrawerDisplay.value = [{} as Weight];

			toggleDrawer();
			console.log('[addNewWeightByMethod] open drawer');
		}

		function toggleDrawer() {
			console.log('[toggleDrawer]');
			isOpen.value = !isOpen.value;
			if (!isOpen.value) {
				weightLotsToDisplay.value = [];
				weightLotsToCreate.value = [];
				weightLotsToUpdate.value = [];
				weightLotsToDelete.value = [];

				sharedMethodForLots.value = undefined;

				dryWeightUnitSelection.value = undefined;
				wetWeightUnitSelection.value = undefined;

				isAddingNewWeightByMethod.value = false;

				selectedWeightForDrawerDisplay.value = [];
				saveOperationCannotBePerformedReason.value = null;
				console.log('[toggleDrawer] reset all values and close drawer');
			} else {
				console.log('[toggleDrawer] open drawer');
			}
		}

		function deleteButtonHandler(id: string) {
			console.log(`[deleteButtonHandler] id=${id}`);
			// add id into weightLotsToDelete if it's not already there, otherwise remove it
			const index = weightLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				weightLotsToDelete.value.push(id);
				console.log(`[deleteButtonHandler] id=${id} pushed into weight lots to delete`);
			} else {
				weightLotsToDelete.value.splice(index, 1);
				console.log(`[deleteButtonHandler] id=${id} removed from weight lots to delete`);
			}
		}

		function deleteButtonTooltip(id: string) {
			// console.log('[deleteButtonTooltip]');
			const index = weightLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				return 'Remove Lot'
			}
			return 'Undo Removed Lot'
		}

		function onKeyDown(item: WeightLot, type: 'wet_weight' | 'moisture' | 'dry_weight', event: any) {
			// This is another key press handler for 'Enter' key to move to the next lot row
			// Need to test if this works on Mac/Linux
			if (event.code === 'Enter' || event.code === 'NumpadEnter') {
				const currentElementId = (event.target || event.srcElement)?.id
				if (!currentElementId) {
					console.error('currentElementId is not defined');
					return;
				}
				// do regex check here for pattern assay-(\w)+-(\d)+ exact match for the entire string
				if (!/weightlots-(\w)+-(\d)+/.test(currentElementId)) {
					console.error(`current element id=${currentElementId} is not in the correct format`);
					return;
				}
				const [ weightLotsPrefix, fieldNumberIdString, lotNumberString] = currentElementId.split('-');
				const lotNumber = parseInt(lotNumberString);
				const fieldNumberId = parseInt(fieldNumberIdString);
				let nextElementId = `${weightLotsPrefix}-`;
				if (lotNumber < weightLotsToDisplay.value.length) {
					nextElementId += `${fieldNumberId}-${lotNumber + 1}`;
				} else {
					const isLastNumericalFieldColumn = fieldNumberId === NO_OF_FOCUSABLE_INPUT_FIELDS_FOR_LOTS_TABLE;
					nextElementId += `${isLastNumericalFieldColumn ? fieldNumberId : fieldNumberId + 1}-${isLastNumericalFieldColumn ? lotNumber : 1}`;
				}
				document.getElementById(nextElementId)?.focus();
				return;
			}

			console.log(`[onKeyDown] item=${item.id}`);
			if (!!onKeyDownTimer) {
				clearTimeout(onKeyDownTimer);
			}
			onKeyDownTimer = setTimeout(() => {
				// stage lots to update
				console.log(`lot value is staged for update`);
				if (!!item.dry_weight && !!item.wet_weight && !!item.moisture) {
					switch(type) {
						case 'wet_weight':
							item.moisture = roundToDecimalPlaces(((item.wet_weight - item.dry_weight) / item.wet_weight) * 100);
							break;
						case 'moisture':
							item.dry_weight = roundToDecimalPlaces(item.wet_weight * (1 - (item.moisture / 100)));
							break;
						case 'dry_weight':
							item.moisture = roundToDecimalPlaces(((item.wet_weight - item.dry_weight) / item.wet_weight) * 100);
							break;
					}
					const displayLotIndex =  weightLotsToDisplay.value.findIndex(lot => lot.id === item.id);
					weightLotsToDisplay.value[displayLotIndex] = item;

					const index = weightLotsToUpdate.value.findIndex(lotId => lotId === item.id);
					if (index === -1) {
						weightLotsToUpdate.value.push(item.id ?? INVALID_ID);
					}
				} else if (!!item.dry_weight && !!item.wet_weight && !item.moisture) {
					// it will not enter here when dry weight and wet weight is 0, which does make sense for the business because we shouldn't get 0 for both
					// if the lot is not already in the weightLotsToUpdate array, add it
					item.moisture = roundToDecimalPlaces(((item.wet_weight - item.dry_weight) / item.wet_weight) * 100);
					const displayLotIndex =  weightLotsToDisplay.value.findIndex(lot => lot.id === item.id);
					weightLotsToDisplay.value[displayLotIndex] = item;

					const index = weightLotsToUpdate.value.findIndex(lotId => lotId === item.id);
					if (index === -1) {
						weightLotsToUpdate.value.push(item.id ?? INVALID_ID);
					}
				} else if (!!item.dry_weight && !item.wet_weight && !!item.moisture) {
					// it will not enter here when dry weight and wet weight is 0, which does make sense for the business because we shouldn't get 0 for both
					// if the lot is not already in the weightLotsToUpdate array, add it
					item.wet_weight = roundToDecimalPlaces(item.dry_weight / (1 - (item.moisture / 100)));
					const displayLotIndex =  weightLotsToDisplay.value.findIndex(lot => lot.id === item.id);
					weightLotsToDisplay.value[displayLotIndex] = item;

					const index = weightLotsToUpdate.value.findIndex(lotId => lotId === item.id);
					if (index === -1) {
						weightLotsToUpdate.value.push(item.id ?? INVALID_ID);
					}
				} else if (!item.dry_weight && !!item.wet_weight && !!item.moisture) {
					// it will not enter here when dry weight and wet weight is 0, which does make sense for the business because we shouldn't get 0 for both
					// if the lot is not already in the weightLotsToUpdate array, add it
					item.dry_weight = roundToDecimalPlaces(item.wet_weight * (1 - (item.moisture / 100)));
					const displayLotIndex =  weightLotsToDisplay.value.findIndex(lot => lot.id === item.id);
					weightLotsToDisplay.value[displayLotIndex] = item;

					const index = weightLotsToUpdate.value.findIndex(lotId => lotId === item.id);
					if (index === -1) {
						weightLotsToUpdate.value.push(item.id ?? INVALID_ID);
					}
				}
				// console.log(`onKeyDown::selected weights after update: ${JSON.stringify(weights.value[selectedWeightIndex.value].lots)}`)
				console.log(`[onKeyDown] item=${JSON.stringify(item)} staged for update`)
			}, 500);
		}

		function addNewWeightLot() {
			console.log(`[addNewWeightLot] is adding a new weight by method=${isAddingNewWeightByMethod.value}`);
			// add a new weight lot
			// reference the code from addNewWeightLot
			const generatedUuid = uuidv4();

			let method;
			// isAddingNewWeightByMethod and (selectedWeightIndex.value !== -1) should be mutually exclusive
			// selectedWeightIndex.value equals -1 when the Add New Weight Lot button is present to be clicked (when the drawer is opened) only when adding a new weight by method because 'weights' ref does not yet have lots for the-soon-to-be-added method
			if (isAddingNewWeightByMethod.value) {
				method = sharedMethodForLots.value;
			} else if (selectedWeightIndex.value !== -1) {
				method = weights.value[selectedWeightIndex.value].method;
			} 
			const newLot = {
				id: generatedUuid,
				foreign_key: foreign_key,
				lot_number: weightLotsToDisplay.value.length + 1,
				method: method,
				dry_weight_uom: dryWeightUnitSelection.value,
				wet_weight_uom: wetWeightUnitSelection.value,
			} as WeightLot
			// console.log(`Adding new lot ${newLot} with generated id=${generatedUuid}`);
			weightLotsToDisplay.value.push(newLot);
			weightLotsToCreate.value.push(generatedUuid);
			// console.log(`Adding new row to weight lots and now has ${weightLotsToDisplay.value.length} rows`);
			console.log(`[addNewWeightLot] new lot generated with id=${generatedUuid}, lot number=${newLot.lot_number} and method=${newLot.method} staged for creation`);
		}
		
		function openConfirmCloseDrawerOverly() {
			console.log('[openConfirmCloseDrawerOverly]');
			const changesPresent = weightLotsToUpdate.value.length > 0 || weightLotsToDelete.value.length > 0 || weightLotsToCreate.value.length > 0;
			if (changesPresent){
				console.log(`[openConfirmCloseDrawerOverly] changes present`);
				confirmCloseDrawerOverlay.value = true;
			} else {
				console.log(`[openConfirmCloseDrawerOverly] no changes detected, closing drawer without confirmation popup`);
				confirmCloseDrawer();
			}
		}

		function closeConfirmCloseDrawerOverlay() {
			console.log('[closeConfirmCloseDrawerOverlay]');
			confirmCloseDrawerOverlay.value = false;
		}
		
		function confirmCloseDrawer() {
			console.log('[confirmCloseDrawer]');
			closeConfirmCloseDrawerOverlay();
			toggleDrawer();
			isEditingLotsViaApi.value = false;
		}

		function openConfirmSaveOverlay() {
			console.log('[openConfirmSaveOverlay]');
			const changesPresent = weightLotsToUpdate.value.length > 0 || weightLotsToDelete.value.length > 0 || weightLotsToCreate.value.length > 0;
			if (changesPresent){
				confirmSave();

				// The original behaviour was to show the confirm save overlay if there are changes made to the assay lots, not needed anymore
				// confirmSaveOverlay.value = true;
			} else {
				saveOperationCannotBePerformedReason.value = 'Please add new weight lots or make changes to existing weight lots before saving';
			}
		}

		function closeConfirmSaveOverlay() {
			console.log('[closeConfirmSaveOverlay]');
			confirmSaveOverlay.value = false;
		}

		async function confirmSave() {
			console.log('[confirmSave]');
			try {
				console.log('[confirmSave] is saving weight lot(s)')
				isEditingLotsViaApi.value = true;
				await save();
			} catch (error) {
				console.error(`[confirmSave] error=${error}`);
			} finally {
				console.log('[confirmSave] finished saving weight lot(s)')
				closeConfirmSaveOverlay();
				isEditingLotsViaApi.value = false;
			}
		}

		function openConfirmDeleteWeightOverlay() {
			console.log('[openConfirmDeleteWeightOverlay]');
			confirmDeleteWeightOverlay.value = true;
		}

		function closeConfirmDeleteWeightOverlay() {
			console.log('[closeConfirmDeleteWeightOverlay]');
			confirmDeleteWeightOverlay.value = false;
		}

		async function confirmDeleteWeight() {
			console.log('[confirmDeleteWeight]');
			try {
				console.log('[confirmDeleteWeight] is deleting weight lot(s)')
				isEditingLotsViaApi.value = true;
				await deleteWeight();
			} catch (error) {
				console.error(`[confirmDeleteWeight] error=${error}`);
			} finally {
				console.log('[confirmDeleteWeight] finished deleting weight lot(s)')
				closeConfirmDeleteWeightOverlay();
				isEditingLotsViaApi.value = false;
			}
		}


		/**
		 * Helper functions
		 */

		function isNullOrUndefined(value: any) {
			return value === null || value === undefined;
		}

		function cloneLots(lots: WeightLot[]): WeightLot[] {
			console.log('[cloneLots]');
			return [...lots].map(lot => ({...lot}));
		}

		function evaluateWeights(lots: WeightLot[]): Weight[] {
			console.log('[evaluateWeights]');
			const methodList = Object.values(MethodEnum) as string[];
			const weightData: { 
				'Planned'?: WeightLot[],
				'Estimated'?: WeightLot[],
				'Inturn'?: WeightLot[],
				'Inturn Final'?: WeightLot[],
				'Outturn'?: WeightLot[],
			 } = {};
			for(const lot of lots) {
				if (!methodList.includes(lot.method)) {
					console.error(`lot ${lot.id} has invalid method ${lot.method}`)
					continue;
				}
				if (!weightData[lot.method]) {
					console.log(`adding method ${lot.method} to weightData object`)
					weightData[lot.method] = [];
				}
				// the property names in 'weightData' match the string values of corresponding MethodEnum enums
				console.log(`adding lot ${lot.id} to weightData.${lot.method} array`)
				weightData[lot.method.toString()].push(lot);
			}
			const weights: Weight[] = [];
			for(const method of methodList) {
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
			console.log(`[evaluateWeightData] method=${weightLots[0].method}`)
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
			console.log(`[evaluateAggregateValue] lots method=${lots[0].method}`);
			const aggregateValue = lots.reduce((accumulator, currentValue) => accumulator + parseFloat(currentValue[field.toString()] ?? '0'), 0)
			console.log(`[evaluateAggregateValue] aggregate value=${aggregateValue}`);
			return aggregateValue;
		}

		function getFirstValueAsSharedValue(lots: WeightLot[], field: SharedLotPropertyFields) {
			console.log('[getFirstValueAsSharedValue]');
			if (lots.length === 0) {
				return undefined;
			}
			console.log(`[getFirstValueAsSharedValue] ${field.toString()}=${lots[0][field.toString()]}`);
			// the string values of SharedLotPropertyFields match the corresponding property names in WeightLot
			return lots[0][field.toString()];
		}

		function filterUnusedMethods() {
			console.log('[filterUnusedMethods]');
			const usedMethods = weights.value.map(weight => weight.method) as (string | undefined)[];
			// console.log(`usedMethods=${usedMethods}; allMethodSelection=${JSON.stringify(allMethodSelection.value)}`);
			const unusedMethods = [...allMethodSelection.value.filter(method => !usedMethods.includes(method.value))];
			console.log(`[filterUnusedMethods] unused methods=${unusedMethods.join(', ')}`);
			return unusedMethods;
		}

		function roundToDecimalPlaces(number: number, decimalPlaces: number = 4) {
			return Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
		}

		function formatNumber(number: any, decimalPlaces: number = 4, showZero: boolean = true) {
			// console.log(`[formatNumber] with number value=${number}`);
			if (isNaN(number) || number === null) {
				return '-';
			}
			// round off number to decimalPlaces decimal places
			const roundedNumber = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
			// console.log(`[formatNumber] with roundedNumber value=${roundedNumber}`)
			// convert number to string and split into array of integer and decimal parts
			const [integerPart, decimalPart] = roundedNumber.toString().split('.');
			// console.log(`[formatNumber] with integerPart value=${integerPart} and decimalPart value=${decimalPart}`)
			if (!integerPart) {
				return '';
			}
			// convert integer part to string with digit group separator
			const formattedIntegerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
			// console.log(`[formatNumber] with formattedIntegerPart value=${formattedIntegerPart}`)
			if (!decimalPart && !showZero) {
				// if there is no decimal part, return formatted integer part
				return formattedIntegerPart;
			}

			// fill with zeroes to the right of decimal point to specified number of decimal places, if decimal part is not defined, let it start with an empty string and be padded
			const formattedDecimalPart = (decimalPart ?? '').padEnd(decimalPlaces, '0');
			// console.log(`[formatNumber] with formattedDecimalPart value=${formattedDecimalPart}`)


			// // convert decimal part to string with specified number of decimal places
			return `${formattedIntegerPart}.${formattedDecimalPart}`;
		}

		/**
		 * Save functions
		 */

		async function save() {
			console.log('[save]');
			// ensure that the changes for update, create, and delete will not have overlap.
			syncStagedChanges();

			// Update existing weight lots first
			if (weightLotsToUpdate.value.length > 0) {
				console.log(`[save] weightLotsToUpdate=${weightLotsToUpdate.value.length}; ${JSON.stringify(weightLotsToUpdate.value)}`);
				await updateWeightLots();
			}

			// Then create the new weight lots
			if (weightLotsToCreate.value.length > 0) {
				console.log(`[save] weightLotsToCreate=${weightLotsToCreate.value.length}; ${JSON.stringify(weightLotsToCreate.value)}`);
				await createWeightLots();
			}

			// Finally delete any existing weight lots and update the Lot Number field for all lots
			if (weightLotsToDelete.value.length > 0) {
				console.log(`[save] weightLotsToDelete=${weightLotsToDelete.value.length}; ${JSON.stringify(weightLotsToDelete.value)}`);
				await deleteWeightLots();
			}

			weights.value[selectedWeightIndex.value].lots = weightLotsToDisplay.value;
			// TODO: perhaps find a better way to recalculate the weight data for specific methods instead of recalculating them for all methods and only using one of them
			// Be careful with selectedWeightIndex because when weight lots are being created for a new method, selectedWeightIndex is assigned in createWeightLots(), especially if we want to display weights by method in a specific order of methods.
			weights.value[selectedWeightIndex.value] = evaluateWeightData(weights.value[selectedWeightIndex.value].lots as WeightLot[]) as Weight;
			weights.value = weights.value.filter(weight => !!weight);

			console.log('[save] saving operation completed');

			// only emit input event when there is actual weight lots being saved
			if (formValues.value['weight_result'] === undefined || formValues.value['weight_result'] === null){
				console.log(`[save] emitting input event with weight lot foreign_key=${foreign_key}`)
				emit('input', foreign_key);
			}

			toggleDrawer();
		}

		async function updateWeightLots() {
			console.log(`[updateWeightLots] weight lots to update with ids=${JSON.stringify(weightLotsToUpdate.value)}`);
			// update the weight lots

			// handle normal value-changed update
			// handle changing lot numbers when deletion is involved
			// handle batch updates 

			if (weightLotsToUpdate.value.length === 0) {
				return;
			}

			const lotsToUpdate = weightLotsToUpdate.value.map(id => weightLotsToDisplay.value.find(lot => lot.id === id) as WeightLot);
			try {
				// TODO: check if we can actually do patch update like this
				// Does appear to work with Postman
				const response = await api.patch(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, lotsToUpdate);
				console.log(`[updateWeightLots] ${response.data.data.length} weight lots updated`);
				for(const lot of response.data.data) {
					const updatedLotIndex = weightLotsToDisplay.value.findIndex(weightLot => weightLot.id === lot.id);
					// weights.value[selectedWeightIndex.value].lots[updatedLotIndex] = lot as WeightLot;
					weightLotsToDisplay.value[updatedLotIndex] = lot as WeightLot;
				}
				// TODO: remove setting 'weights' in the save functions, do it in the main save function, weightLotsToDisplay is the source of truth during the save process
				// weights.value[selectedWeightIndex.value].lots = weightLotsToDisplay.value;
				// console.log(`weight lots updated=${JSON.stringify(weights.value[selectedWeightIndex.value].lots)}`);
				console.log(`[updateWeightLots] Weight lots updated`);
			} catch (reason) {
				console.error(`[updateWeightLots] patching for lots=${weightLotsToUpdate.value} failed with reason: '${reason}'`)
			}
		}

		async function createWeightLots() {
			console.log(`[createWeightLots] weight lots created=${JSON.stringify(weightLotsToCreate.value)} with weight lots key=${foreign_key}`);
			// create the weight lots
			
			if (weightLotsToCreate.value.length <= 0) {
				console.log('[createWeightLots] No weight lots to create with weight lots key=${foreign_key}');
				return;
			}
			if (!sharedMethodForLots.value) {
				console.error('[createWeightLots] No shared method for lots with weight lots key=${foreign_key}');
				return;
			}

			console.log(`[createWeightLots] weight lots to display=${JSON.stringify(weightLotsToDisplay.value)}`)

			const lotsToCreate = weightLotsToDisplay.value
				.filter(lot => weightLotsToCreate.value.includes(lot.id ?? INVALID_ID))
				.map(lot => ({
					...lot,
					dry_weight_uom: dryWeightUnitSelection.value,
					wet_weight_uom: wetWeightUnitSelection.value
				}));
			console.log(`lotsToCreate=${JSON.stringify(lotsToCreate)}`);
			try {
				const response = await api.post(`/items/${WEIGHT_LOT_COLLECTION_NAME}?sort[]=${LOT_NUMBER_FIELD_NAME}`, lotsToCreate);
				if (response.status !== 200) {
					throw new Error(`[createWeightLots] response status=${response.status} is not 200`);
				}
				// console.log('Weight lots created');
				console.log(`[createWeightLots] ${response.data.data.length} lots successfully created with weight lots key=${foreign_key}`);
				for (const lot of (response.data.data as WeightLot[])) {
					const createdItemIndexForLotsToDisplay = weightLotsToDisplay.value.findIndex(displayLot => displayLot.id === undefined);
					weightLotsToDisplay.value[createdItemIndexForLotsToDisplay] = lot;
				}
				// TODO: isAddingNewWeightByMethod and (selectedWeightIndex.value !== -1) are mutually exclusive, but bugs may happen, somehow make them more robust
				if (isAddingNewWeightByMethod.value) {
					// console.log('new weight by method added');
					console.log(`[createWeightLots] new weight by method added, method=${sharedMethodForLots.value} with weight lots key=${foreign_key}`)
					weights.value.push({
						method: sharedMethodForLots.value,
						lots: weightLotsToDisplay.value
					});
					// Be very careful with this especially when we are rearranging the commodities in 'weights' array based on the method
					selectedWeightIndex.value = weights.value.length - 1;
				} else if (selectedWeightIndex.value !== -1) {
					console.log(`[createWeightLots] weight lots created for existing method=${sharedMethodForLots.value} with weight lots key=${foreign_key}`)
					weights.value[selectedWeightIndex.value].lots = weightLotsToDisplay.value;
				}
				console.log(`[createWeightLots] weight lots created=${JSON.stringify(weightLotsToCreate.value)} with weight lots key=${foreign_key}`);
			} catch (error) {
				console.error('[createWeightLots] Error creating weight lots', error);
			}
		}

		async function deleteWeightLots() {
			console.log('[deleteWeightLots]');
			// delete the weight lots
			if (weightLotsToDelete.value.length <= 0) {
				console.log('[deleteWeightLots] No weight lots to delete');
				return;
			}

			try {
				const response = await api.delete(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, {
					data: weightLotsToDelete.value
				});
				if (response.status !== 204) {
					throw new Error(`response status=${response.status} is not 204`);
				}
				// console.log('Weight lots deleted');

				// remove deleted weight lots from weight lots to display and return a copy of the updated weight lots
				const filteredWeightLots = weightLotsToDisplay.value.filter(lot => !weightLotsToDelete.value.includes(lot.id ?? INVALID_ID));
				// weights.value[selectedWeightIndex.value].lots = weightLotsToDisplay.value;
				// console.log(`weight lots deleted=${JSON.stringify(weights.value[selectedWeightIndex.value].lots)}`);

				console.log(`[deleteWeightLots] weight lots deleted with ids=${JSON.stringify(filteredWeightLots)}`);
				
				const updateLotNumbersData = filteredWeightLots.map((lot, index) => ({
					id: lot.id,
					lot_number: index + 1
				}));
				console.log(`[deleteWeightLots] updating lot numbers with data=${JSON.stringify(updateLotNumbersData)}`);
				const updateLotNumbersResponse = await api.patch(`/items/${WEIGHT_LOT_COLLECTION_NAME}?sort[]=${LOT_NUMBER_FIELD_NAME}`, updateLotNumbersData);
				weightLotsToDisplay.value = updateLotNumbersResponse.data.data;
				console.log(`[deleteWeightLots] weight lots deleted with ids=${JSON.stringify(weightLotsToDelete.value)} and updated lot numbers with response=${JSON.stringify(updateLotNumbersResponse.data.data)}`);
			} catch (error) {
				console.error(`[deleteWeightLots] deletion of lots with ids=${JSON.stringify(weightLotsToDelete.value)} failed with reason='${error}'`);
			}
		}

		async function deleteWeight() {
			console.log('[deleteWeight]');
			// perform http request to delete the assay based on the selectedWeightIndex.value
			const weightIds = weightLotsToDisplay.value.map(lot => lot.id);

			const response = await api.delete(`/items/${WEIGHT_LOT_COLLECTION_NAME}`, {
				data: weightIds.filter(id => id !== undefined)
			});
			if (response.status !== 204) {
				throw new Error(`response status=${response.status} is not 204`);
			}
			// console.log(`Weight successfully deleted with response status=${response.status}`);
			weights.value.splice(selectedWeightIndex.value, 1);
			console.log(`[deleteWeight] weight lots successfully deleted with ids=${weightIds} for method=${sharedMethodForLots.value}`)
			toggleDrawer();
		}

		/**
		 * Sync staged changes to weight lots to create, update and delete before performing save operation
		 */
		function syncStagedChanges() {
			console.log('[syncStagedChanges]');
			// // all weight lots should be marked for update if there is one lot to be deleted to update their lot numbers
			// updateLotNumbersWhenThereAreLotsToDelete();
			// remove similar id values in both delete and create weight lots array
			removeDeletedIdsFromCreateList();
			// remove ids in update weight lots array if they are already present in create/delete weight lots array
			removeCreatedIdsFromUpdateList();
			removeDeletedIdsFromUpdateList();
			console.log('[syncStagedChanges] staged changes synced');
		}

		// A function to remove ids from weightLotsToCreate if they are in weightLotsToDelete
		function removeDeletedIdsFromCreateList() {
			console.log('[removeDeletedIdsFromCreateList]');
			weightLotsToDelete.value.forEach(id => {
				const index = weightLotsToCreate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					weightLotsToCreate.value.splice(index, 1);
					console.log(`[removeDeletedIdsFromCreateList] removed lot with id=${id}`);
				}
			});
		}

		// A function to remove lots from weightLotsToUpdate if they have ids that are in weightLotsToDelete
		function removeDeletedIdsFromUpdateList() {
			console.log('[removeDeletedIdsFromUpdateList]');
			weightLotsToDelete.value.forEach(id => {
				const index = weightLotsToUpdate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					weightLotsToUpdate.value.splice(index, 1);
					console.log(`[removeDeletedIdsFromUpdateList] removed lot with id=${id}`);
				}
			});
		}

		// A function to remove lots from weightLotsToUpdate if they have ids that are in weightLotsToCreate
		function removeCreatedIdsFromUpdateList() {
			console.log('[removeCreatedIdsFromUpdateList]');
			weightLotsToCreate.value.forEach(id => {
				const index = weightLotsToUpdate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					weightLotsToUpdate.value.splice(index, 1);
					console.log(`[removeCreatedIdsFromUpdateList] removed lot with id=${id}`);
				}
			});
		}

		/**
		 * Display changes
		 */
		function highlightCellToLightSalmon(highlight: boolean) {
			// console.log('[highlightCellToLightSalmon]');
			if (highlight) {
				return 'weight_cell_highlighted';
			}
			return 'weight_cell';
		}

		function deleteIcon(id: string) {
			// console.log('[deleteIcon]');
			const index = weightLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				return 'close';
			}
			return 'settings_backup_restore';
		}

		function colourDeleteIcon(id: string) {
			// console.log('[colourDeleteIcon]');
			const index = weightLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				return 'v-icon-delete-button-small-foreground-subdued';
			}
			return 'v-icon-delete-button-small-red';
		}
	},
});
</script>

<style lang="scss" scoped>
.weight-table {
	.table-row {
		height: 30px;
	}
	.weight_cell {
		width: 100%;
	}
	.header_cell_with_input {
		height: 60px;
	}
}

.margin-top-16px {
	margin-top: 16px;
}

.v-icon-white {
	--v-icon-color: #ffffff;
}
.v-icon-purple {
	--v-icon-color: #8866FF;
}

.v-icon-delete-button-small-foreground-subdued {
	--v-icon-size: 18px;
	--v-icon-color: var(--foreground-subdued);
	// --v-icon-color-hover: var(--red) !important; // does not override
}
.v-icon-delete-button-small-red {
	--v-icon-size: 18px;
	--v-icon-color: var(--red);
}

.v-button-red-on-hover {
	--v-button-color: var(--white);
	--v-button-background-color: var(--background-normal);
	--v-button-color-hover: var(--white);
	--v-button-background-color-hover: var(--red);
}

.v-button-red {
	--v-button-color: var(--white);
	--v-button-background-color: var(--danger);
	--v-button-color-hover: var(--white);
	--v-button-background-color-hover: var(--danger-125);
}

.drawer-content {
	padding: 0 32px 40px;
}

.weight-drawer {
	max-width: 1500px !important;
}

// Copied from the CSS for Directus input labels
.input-label {
    color: #f0f6fc;
    font-weight: 600;
    font-size: 16px;
    font-family: "Inter", -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-style: normal;
    line-height: 19px;
	margin-bottom: 8px;

	// Value of 20px is from the grid padding between input fields in Directus
	padding-top: 20px;
}
</style>
