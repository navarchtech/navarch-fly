<template>
	<div>
		<!-- <div>{{ assays }}</div> -->
		<!-- <input :value="foreign_key"> -->
		<v-overlay
			:active="isEditingLotsViaApi"
			:clickable="false"
		/>
		<v-detail v-if="!isPlannedAssaysEmpty" label="Planned">
			<v-table
				class="assay-table"
				:headers="assayTableHeaders"
				:items="plannedAssays"
				:rowHeight="30"
				@click:row="event => rowClickHandler(event)"
				fixedHeader
				inline
			>
				<template #[`item.seller_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.buyer_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.difference`]="{ item }">
					<div>
						{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.splitting_limit`]="{ item }">
					<div>
						{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.to_umpire`]="{ item }">
					<div v-if="item.to_umpire">
						<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
					</div>
				</template>
				<template #[`item.umpire_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.final_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
			</v-table>
		</v-detail>
		<v-detail v-if="!isEstimateAssaysEmpty" label="Estimate">
			<v-table
				class="assay-table"
				:headers="assayTableHeaders"
				:items="estimateAssays"
				:rowHeight="30"
				@click:row="event => rowClickHandler(event)"
				fixedHeader
				inline
			>
				<template #[`item.seller_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.buyer_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.difference`]="{ item }">
					<div>
						{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.splitting_limit`]="{ item }">
					<div>
						{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.to_umpire`]="{ item }">
					<div v-if="item.to_umpire">
						<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
					</div>
				</template>
				<template #[`item.umpire_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.final_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
			</v-table>
		</v-detail>
		<v-detail v-if="!isInturnAssaysEmpty" label="Inturn">
			<v-table
				class="assay-table"
				:headers="assayTableHeaders"
				:items="inturnAssays"
				:rowHeight="30"
				@click:row="event => rowClickHandler(event)"
				fixedHeader
				inline
			>
				<template #[`item.seller_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.buyer_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.difference`]="{ item }">
					<div>
						{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.splitting_limit`]="{ item }">
					<div>
						{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.to_umpire`]="{ item }">
					<div v-if="item.to_umpire">
						<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
					</div>
				</template>
				<template #[`item.umpire_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.final_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
			</v-table>
		</v-detail>
		<v-detail v-if="!isInturnFinalAssaysEmpty" label="Inturn Final">
			<v-table
				class="assay-table"
				:headers="assayTableHeaders"
				:items="inturnFinalAssays"
				:rowHeight="30"
				@click:row="event => rowClickHandler(event)"
				fixedHeader
				inline
			>
				<template #[`item.seller_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.buyer_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.difference`]="{ item }">
					<div>
						{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.splitting_limit`]="{ item }">
					<div>
						{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.to_umpire`]="{ item }">
					<div v-if="item.to_umpire">
						<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
					</div>
				</template>
				<template #[`item.umpire_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.final_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
			</v-table>
		</v-detail>
		<v-detail v-if="!isOutturnAssaysEmpty" label="Outturn">
			<v-table
				class="assay-table"
				:headers="assayTableHeaders"
				:items="outturnAssays"
				:rowHeight="30"
				@click:row="event => rowClickHandler(event)"
				fixedHeader
				inline
			>
				<template #[`item.seller_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.buyer_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.difference`]="{ item }">
					<div>
						{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.splitting_limit`]="{ item }">
					<div>
						{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.to_umpire`]="{ item }">
					<div v-if="item.to_umpire">
						<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
					</div>
				</template>
				<template #[`item.umpire_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
				<template #[`item.final_assay`]="{ item }">
					<div>
						{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
					</div>
				</template>
			</v-table>
		</v-detail>
		<v-drawer 
			v-model="isOpen" 
			@toggle="openConfirmCloseDrawerOverly" 
			@cancel="openConfirmCloseDrawerOverly"
			icon="gavel"
			title="Edit Assay"
			:subtitle="isComposite ? 'Composite Assay' : 'Assay Lots'"
		>
			<template #actions>
				<v-button rounded @click="openConfirmSaveOverlay" :disabled="isEditingDisabled || isContractNotFound" v-tooltip.bottom="isEditingDisabled || isContractNotFound ? (disableEditAssayButtonReason ?? 'Editing has been disabled') : null" icon><v-icon name="check" /></v-button>
				<v-button class="v-button-red-on-hover" rounded @click="openConfirmDeleteAssayOverlay" :disabled="isEditingDisabled || isContractNotFound" v-tooltip.bottom="isEditingDisabled || isContractNotFound ? (disableEditAssayButtonReason ?? 'Editing has been disabled') : null" icon><v-icon name="delete" /></v-button>
			</template>
			<div class="drawer-content">
				<v-notice v-if="!!saveOperationCannotBePerformedReason">
					{{ saveOperationCannotBePerformedReason }}
				</v-notice>
				<div class="same-line">
					<v-checkbox 
						v-model="isComposite" 
						icon-on="check_box"
						icon-off="check_box_outline_blank"
						:label=null
						:disabled="(
							!itemMethod ||
							!itemDryWeightUnit ||
							!itemAssayUoM ||
							!itemSplittingLimit) || 
							(isCompositeToggleDisabled && !isAddingNewAssay)" 
						v-tooltip.bottom="
							(!itemMethod ||
							!itemDryWeightUnit ||
							!itemAssayUoM ||
							!itemSplittingLimit) ? 'Please select a method and commodity first' : ((isCompositeToggleDisabled && !isAddingNewAssay) ? (disableEditAssayButtonReason ?? 'Assay lot cannot be converted to composite assay') : null)"
					/>
					<div class="is-composite-checkbox-label">Is Composite</div>
				</div>
				<div v-if="!isComposite">
					<div class="input-label">{{`Assay Result for ${selectedAssayForDrawerDisplay[0].commodity_name} (${itemMethod})`}}</div>
					<v-table
						class="assay-table"
						:headers="assayTableHeaders"
						:items="selectedAssayForDrawerDisplay"
						:rowHeight="30"
						fixedHeader
						inline
					>
						<template #[`item.seller_assay`]="{ item }">
							<div>
								{{ `${formatNumber(item.seller_assay)}${isNullOrUndefined(item.seller_assay) ? '' : item.assay_uom}` }}
							</div>
						</template>
						<template #[`item.buyer_assay`]="{ item }">
							<div>
								{{ `${formatNumber(item.buyer_assay)}${isNullOrUndefined(item.buyer_assay) ? '' : item.assay_uom}` }}
							</div>
						</template>
						<template #[`item.difference`]="{ item }">
							<div>
								{{ `${formatNumber(item.difference)}${isNullOrUndefined(item.difference) ? '' : item.assay_uom}` }}
							</div>
						</template>
						<template #[`item.splitting_limit`]="{ item }">
							<div>
								{{ `${formatNumber(item.splitting_limit)}${isNullOrUndefined(item.splitting_limit) ? '' : item.assay_uom}` }}
							</div>
						</template>
						<template #[`item.to_umpire`]="{ item }">
							<div v-if="item.to_umpire">
								<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
							</div>
						</template>
						<template #[`item.umpire_assay`]="{ item }">
							<div>
								{{ `${formatNumber(item.umpire_assay)}${isNullOrUndefined(item.umpire_assay) ? '' : item.assay_uom}` }}
							</div>
						</template>
						<template #[`item.final_assay`]="{ item }">
							<div>
								{{ `${formatNumber(item.final_assay)}${isNullOrUndefined(item.final_assay) ? '' : item.assay_uom}` }}
							</div>
						</template>
					</v-table>
				</div>
				<fieldset :disabled="isEditingDisabled || isContractNotFound">
					<!-- Just disabling adding a new assay by saving lot items, must first create a composite item that is then converted to lots, can be changed in the future -->
					<!-- when a selected assay is made up of assay lots, it should not be convertible back to composite -->
					<div class="input-label">Method</div>
					<v-select
						v-model="itemMethod"
						:items="methodSelection"
						:disabled="!isAddingNewAssay"
					/>
					<div class="input-label">Commodity</div>
					<v-select
						v-model="itemCommodity"
						:items="commoditySelection"
						:disabled="!isAddingNewAssay"
					/>
					<div class="input-label">Assay UoM</div>
					<v-select
						v-model="itemAssayUoM"
						:items="assayUnits"
						:disabled="true"
					/>
					<div class="input-label">Splitting limit</div>
					<v-input
						v-model="itemSplittingLimit"
						type="number"
						@input="() => stageSplittingLimitBatchUpdate()"
						:disabled="true"
					/>
					<div v-if="isComposite">
						<div class="input-label">Weight</div>
						<v-input
							v-model="compositeItemWeight"
							type="number"
							:disabled="true"
						/>
						<v-button 
							class="margin-top-16px"
							@click="syncWeightLots" 
							:loading="isSyncingWeightLots"
							:disabled="isAddingNewAssay || !itemMethod" 
							v-tooltip.bottom="isAddingNewAssay ? 'Weight lots are up to date when creating a new assay' : (!itemMethod ? 'Please select a method first' : null)" 
						>
							Sync Weight Lots
						</v-button>
						<div class="input-label">Unit of Measure (Weight)</div>
						<v-select
							v-model="itemDryWeightUnit"
							:items="units"
							:disabled="true"
						/>
						<div class="input-label">Seller Assay</div>
						<v-input
							v-model="compositeItemSellerAssay"
							type="number"
						/>
						<div class="input-label">Buyer Assay</div>
						<v-input
							v-model="compositeItemBuyerAssay"
							type="number"
						/>
						<div class="input-label">Difference</div>
						<v-input
							v-model="compositeItemDifference"
							type="number"
						/>
						<div class="input-label">To Umpire</div>
						<v-checkbox
							v-model="compositeItemToUmpire"
							disabled
							label="Requires umpire arbitration"
							v-tooltip.bottom="'Cannot be edited directly, will auto update based on seller and buyer assay difference, and splitting limit'"
						/>
						<div class="input-label">Umpire name</div>
						<v-input
							v-model="compositeUmpireName"
							:disabled="!compositeItemToUmpire"
						/>
						<div class="input-label">Umpire Assay</div>
						<v-input
							v-model="compositeItemUmpireAssay"
							:disabled="!compositeItemToUmpire"
							type="number"
						/>
						<div class="input-label">Losing party</div>
						<v-input
							v-model="compositeItemLosingParty"
							disabled
							v-tooltip.bottom="'Cannot be edited directly, will auto update based on umpire assay if umpire arbitration is required'"
						/>
						<div class="input-label">Final Assay</div>
						<v-input
							v-model="compositeItemFinalAssay"
							type="number"
							
						/>
					</div>
					<div v-else>
						<div class="input-label">Assay Lots</div>
						<v-table
							class="assay-table"
							:headers="assayLotTableHeaders"
							:items="assayLotsToDisplay"
							:rowHeight="30"
							fixedHeader
							inline>
							<template #[`header.dry_weight`]="{ header }">
								<div>
									{{ `${header.text} (${itemDryWeightUnit})` }}
								</div>
							</template>
							<template #[`header.to_umpire`]="">
								<div></div>
							</template>
							<template #[`item.delete`]="{ item }">
								<v-icon :class="colourDeleteIcon(item.id)" :name="deleteIcon(item.id)" @click="() => deleteButtonHandler(item.id)" />
							</template>
							<template #[`item.dry_weight`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].dry_weight" :placeholder="0" type="number" :nullable="true" :disabled="true" :id="`assaylots-1-${item.lot_number}`" />
							</template>
							<template #[`item.seller_assay`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].seller_assay" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'seller_assay', event)" :nullable="true" :id="`assaylots-2-${item.lot_number}`" />
							</template>
							<template #[`item.buyer_assay`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].buyer_assay" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'buyer_assay', event)" :nullable="true" :id="`assaylots-3-${item.lot_number}`" />
							</template>
							<template #[`item.difference`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].difference" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, null, event)" :nullable="true" :id="`assaylots-4-${item.lot_number}`" />
							</template>
							<template #[`item.to_umpire`]="{ item }">
								<div v-if="item.to_umpire">
									<v-icon class="v-icon-purple" name="gavel" v-tooltip.bottom="'Require umpire arbitration'" />
								</div>
							</template>
							<template #[`item.umpire_name`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].umpire_name" :disabled="!assayLotsToDisplay[item.lot_number - 1].to_umpire" :placeholder="0" type="string" @keydown="(event) => onKeyDown(item, null, event)" :nullable="true" :id="`assaylots-5-${item.lot_number}`" />
							</template>
							<template #[`item.umpire_assay`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].umpire_assay" :disabled="!assayLotsToDisplay[item.lot_number - 1].to_umpire" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'umpire_assay', event)" :nullable="true" :id="`assaylots-6-${item.lot_number}`" />
							</template>
							<template #[`item.losing_party`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].losing_party" :disabled="true" :placeholder="0" type="string" :nullable="true" />
							</template>
							<template #[`item.final_assay`]="{ item }">
								<v-input :class="highlightCellToLightSalmon(item.to_umpire)" v-model="assayLotsToDisplay[item.lot_number - 1].final_assay" :placeholder="0" type="number" @keydown="(event) => onKeyDown(item, 'final_assay', event)" :nullable="true" :id="`assaylots-7-${item.lot_number}`" />
							</template>
						</v-table>
						<!-- <v-button 
							class="margin-top-16px"
							@click="addNewAssayLot" 
							:disabled="isComposite || (isEditingDisabled || isContractNotFound) || (!itemMethod || !itemCommodity)" 
							v-tooltip.bottom="isComposite ? 'Cannot add new lot for composite items' : ((isEditingDisabled || isContractNotFound) ? (disableEditAssayButtonReason ?? 'Editing has been disabled') : null)" 
						>
							Add New Lot
						</v-button> -->
						<v-button 
							class="margin-top-16px"
							@click="syncWeightLots" 
							:loading="isSyncingWeightLots"
							:disabled="isAddingNewAssay || !itemMethod" 
							v-tooltip.bottom="isAddingNewAssay ? 'Weight lots are up to date when creating a new assay' : (!itemMethod ? 'Please select a method first' : null)" 
						>
							Sync Weight Lots
						</v-button>
					</div>
				</fieldset>
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
		<v-dialog v-model="confirmDeleteAssayOverlay">
			<v-card>
				<v-card-title>{{`Delete ${(isComposite ? itemCommodity : selectedAssayForDrawerDisplay[0]?.commodity_name) ?? 'commodity'} (${itemMethod}) assay`}}</v-card-title>
				<v-card-text>This action is permanent and can not be undone. Are you sure you would like to proceed?</v-card-text>
				<v-card-actions>
					<v-button secondary @click="closeConfirmDeleteAssayOverlay">Keep Editing</v-button>
					<v-button class="v-button-red" :loading="isEditingLotsViaApi" @click="confirmDeleteAssay">Delete</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
		<v-button
			class="margin-top-16px"
			@click="() => addAssayButtonHandler()"
			:disabled="isEditingDisabled || isContractNotFound"
			v-tooltip.bottom="(isEditingDisabled || isContractNotFound) ? (disableEditAssayButtonReason ?? 'Editing has been disabled') : null"
		>Add Assay</v-button>
		<!-- <v-form
			:fields="[{
				field: 'method', 
				name: 'Method', 
				type: 'string',
				meta: {
					options: {
						choices: methodSelection
					}
				}
			}, {
				field: 'commodity', 
				name: 'Commodity', 
				type: 'string'
			}, {
				field: 'assay_uom', 
				name: 'Assay UoM', 
				type: 'string',
				meta: {
					collection: 'navarch_parcel',
					field: 'assay_uom', 
					interface: 'select-dropdown',
					options: {
						choices: assayUnits
					}
				}
			}]"
			:initial-values="{
				method: `${itemMethod}`,
				commodity: `${itemCommodity}`,
				assay_uom: `${itemAssayUoM ?? ''}`
			}"
		/> -->
	</div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, Ref, inject } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
	TableHeader,

	UpdatableSharedLotProperties,

	MethodEnum,
	AssayV2,
	AssayLot,
	AssayComposite,

	LosingPartyEnum,
	ContractData,
	FinalAssayEquation,

	Commodity,

	WeightLot,
	CommoditiesData
 } from './components/types';

//  import {
// 	// evaluateAssayDataV2,

// 	evaluateDifference,
// 	evaluateToUmpire,
// 	evaluateLosingParty,
// 	evaluateFinalAssay,

// 	isCompositeAssay,

// 	generateDeterministicAssayId,
// 	evaluateAssayDataForComposite,
// 	cloneLots,
// 	formatNumber
//  } from './components/helper';

interface Selection {
	text: string,
	value: any
}

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
	},
	emits: ['input'],
	setup(props, {attrs, emit}) {
		const assayTableHeaders = ref<TableHeader[]>([
			{
				text: 'Commodity',
				value: 'commodity_name',
				sortable: false,
				width: 150,
				align: 'left',
			},
			// {
			// 	text: 'Assay UoM',
			// 	value: 'assay_uom',
			// 	sortable: false,
			// 	width: 150,
			// 	align: 'left',
			// },
			{
				text: 'Seller Assay',
				value: 'seller_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Buyer Assay',
				value: 'buyer_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Difference',
				value: 'difference',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Splitting Limit',
				value: 'splitting_limit',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'To Umpire',
				value: 'to_umpire',
				sortable: false,
				width: 60,
				align: 'left',
			},
			{
				text: 'Umpire Name',
				value: 'umpire_name',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Umpire Assay',
				value: 'umpire_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Losing Party',
				value: 'losing_party',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Final Assay',
				value: 'final_assay',
				sortable: false,
				width: 150,
				align: 'left',
			}
		]);
		const assayLotTableHeaders = ref<TableHeader[]>([
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
				text: 'Dry Weight',
				value: 'dry_weight',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Seller Assay',
				value: 'seller_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Buyer Assay',
				value: 'buyer_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Difference',
				value: 'difference',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'To Umpire',
				value: 'to_umpire',
				sortable: false,
				width: 60,
				align: 'center',
			},
			{
				text: 'Umpire Name',
				value: 'umpire_name',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Umpire Assay',
				value: 'umpire_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Losing Party',
				value: 'losing_party',
				sortable: false,
				width: 150,
				align: 'left',
			},
			{
				text: 'Final Assay',
				value: 'final_assay',
				sortable: false,
				width: 150,
				align: 'left',
			},
		]);
		const contractData = ref<ContractData | null>(null);

		const weightLots = ref<WeightLot[]>([]);
		
		const api = useApi();

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol';
		const UNIT_DRY_SYMBOL_FIELD_NAME = 'dry_symbol';

		const ASSAY_UNIT_COLLECTION_NAME = 'navarch_assay_unit';
		const ASSAY_UNIT_DESCRIPTION_FIELD_NAME = 'description';
		const ASSAY_UNIT_UNIT_FIELD_NAME = 'unit';

		const ASSAY_LOT_COLLECTION_NAME = 'navarch_assay_lot';
		const ASSAY_LOT_WEIGHT_LOT_ID_FIELD_NAME = 'weight_lot_id';

		const WEIGHT_LOT_COLLECTION_NAME = 'navarch_weight_lot';
		const WEIGHT_LOT_ID_FIELD_NAME = 'id';
		const WEIGHT_LOT_LOT_NUMBER_FIELD_NAME = 'lot_number';
		const WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME = 'dry_weight';
		const WEIGHT_LOT_METHOD_FIELD_NAME = 'method';

		const CONTRACT_COLLECTION_NAME = 'navarch_contract';
		const CONTRACT_WEIGHT_UOM_FIELD_NAME = 'weight_uom';
		const CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME = 'umpire_when_equal';
		const CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME = 'final_assay_equation';
		const CONTRACT_METHODS_FIELD_NAME = 'methods';

		const COMMODITY_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMMODITY_IN_CONTRACT_PRIMARY_COMMODITY_FIELD_NAME = 'primary_commodity';
		const COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_FIELD_NAME = 'splitting_limit';
		const COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_UNIT_FIELD_NAME = 'splitting_limit_unit';

		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name';
		const COMMODITY_CODE_FIELD_NAME = 'code';

		const FOREIGN_KEY_FIELD_NAME = 'foreign_key';
		const CONTRACT_FIELD_NAME = 'contract';
		const PARCEL_FINALISED_FIELD_NAME = 'parcel_finalised';

		const INVALID_ID = 'INVALID_ID';

		const DESELECT_METHOD = '-- Deselect method --';
		const SELECT_METHOD = '-- Select a method --';

		const ASSAY_RESULTS_FIELD_NAME = 'assay_results';
		const WEIGHT_RESULT_FIELD_NAME = 'weight_result';

		// an array to store the assays in the Parcels form
		const assays: Ref<AssayV2[]> = ref([]);
		const inturnAssays: Ref<AssayV2[]> = ref([]);
		const isInturnAssaysEmpty: Ref<boolean> = ref(true);
		const inturnFinalAssays: Ref<AssayV2[]> = ref([]);
		const isInturnFinalAssaysEmpty: Ref<boolean> = ref(true);
		const outturnAssays: Ref<AssayV2[]> = ref([]);
		const isOutturnAssaysEmpty: Ref<boolean> = ref(true);
		const plannedAssays: Ref<AssayV2[]> = ref([]);
		const isPlannedAssaysEmpty: Ref<boolean> = ref(true);
		const estimateAssays: Ref<AssayV2[]> = ref([]);
		const isEstimateAssaysEmpty: Ref<boolean> = ref(true);
		const isComposite: Ref<boolean> = ref(true);
		const isSyncingWeightLots: Ref<boolean> = ref(false);
		// a ref to store the index of the selected assay from 'assays' ref array
		const selectedAssayIndex: Ref<number> = ref(-1);
		// an array to store the assay lots to display
		const assayLotsToDisplay: Ref<AssayLot[]> = ref([]);
		// an array to store the ids of assay lots to update
		const assayLotsToUpdate: Ref<string[]> = ref([]);
		// a ref object that batch updates all assay lots from a selected method-commodity assay with the defined properties
		const assayLotPropertiesToBatchUpdate: Ref<UpdatableSharedLotProperties> = ref({});
		// an array to store the ids of assay lots to create
		const assayLotsToCreate: Ref<string[]> = ref([]);
		// an array to store the ids of assay lots to delete
		const assayLotsToDelete: Ref<string[]> = ref([]);

		// The refs for composite assay fields and some fields with shared values for assay lots
		// ref variables names that start with 'composite' are for the composite assays only
		// ref variables names that start with 'item' are for fields with shared values for assay lots. They can also be used for fields for composite assays too
		const compositeLotId: Ref<string | undefined> = ref(undefined);
		const itemMethod: Ref<MethodEnum | undefined> = ref(undefined);
		const itemCommodity: Ref<string | undefined> = ref(undefined);
		const itemAssayUoM: Ref<string | undefined> = ref(undefined);
		const itemSplittingLimit: Ref<number | undefined> = ref(undefined);
		const compositeItemToUmpire: Ref<boolean> = ref(false);
		const compositeUmpireName: Ref<string | undefined> = ref(undefined);
		const compositeItemWeight: Ref<number | undefined> = ref(undefined);
		const compositeItemSellerAssay: Ref<number | undefined> = ref(undefined);
		const compositeItemBuyerAssay: Ref<number | undefined> = ref(undefined);
		const compositeItemDifference: Ref<number | undefined> = ref(undefined);
		const compositeItemFinalAssay: Ref<number | undefined> = ref(undefined);
		const compositeItemUmpireAssay: Ref<number | undefined> = ref(undefined);
		const compositeItemLosingParty: Ref<LosingPartyEnum | undefined> = ref(undefined);

		const isContractNotFound: Ref<boolean> = ref(!contractData.value);
		const isEditingDisabled: Ref<boolean> = ref(false);
		const disableEditAssayButtonReason: Ref<string | null> = ref(null);
		const isEditingLotsViaApi = ref(false);

		const saveOperationCannotBePerformedReason: Ref<string | null> = ref(null);

		/**
		 * GET FOREIGN KEY ID LINKING THIS PARCEL ITEM TO MANY ASSAY LOTS
		 */
		const formValues = inject('values', ref<Record<string, any>>({}));

		let foreign_key = formValues.value[ASSAY_RESULTS_FIELD_NAME];
		if (!foreign_key) {
			foreign_key = uuidv4();
			console.log(`[setup] key generated for assay lots=${foreign_key}`);
			// Should I use props.value instead of 'foreign_key' variable for the value of this interface?
			// emit('input', foreign_key);
		}
		
		/**
		 * Get units for selection and also setup api object
		 */
		const itemDryWeightUnit: Ref<string | undefined> = ref(undefined);
		const units: Ref<Selection[]> = ref([]);
		getUnitsSelection().then(value => {
			units.value = value;
		});

		const assayUnits: Ref<Selection[]> = ref([]);
		getAssayUnitsSelection().then(value => {
			assayUnits.value = value;
		});

		const commodityCodeToNameMapping: Ref<Record<string, string>> = ref({});

		api.get(`/items/${ASSAY_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${foreign_key}&sort[]=lot_number`).then(async response => {
			console.log(`assay lots successfully fetched: ${JSON.stringify(response.data.data)}`);
			const responseData = response.data.data as (AssayLot | AssayComposite)[];
			// get a list of unique commodities from the fetched assay lots
			const commodities = responseData.map(assayLot => assayLot.commodity).filter((commodity, index, self) => self.indexOf(commodity) === index);
			if (commodities.length > 0) {
				const filterString = commodities.map((commodity, index) => `filter[_or][${index}][code]=${commodity}`).join('&');
				const commodityMappingResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}?${filterString}`, {
					params: {
						fields: ['name', 'code']
					}
				});
				console.log(`commodity mapping response: ${JSON.stringify(commodityMappingResponse.data.data)}`);
				commodityCodeToNameMapping.value = commodityMappingResponse.data.data.reduce((accumulator: Record<string, string>, commodity: Commodity) => {
					accumulator[commodity.code] = commodity.name;
					return accumulator;
				}, {});
				console.log(`commodity code to name mapping: ${JSON.stringify(commodityCodeToNameMapping.value)}`);
			}
			assays.value = evaluateAssayDataV2(response.data.data as (AssayLot | AssayComposite)[], commodityCodeToNameMapping.value);
			console.log(`evaluated assays: ${JSON.stringify(assays.value)}`);
		}).catch(reason => console.log(`fetching the assay lots went wrong due to: ${reason}`));

		// TODO: handle when weight lots are newly created, make sure all weight lots are fetched after weight lots have been created in the drawer
		const weightLotsForeignKey = ref('');
		// const weightLotsForeignKey = formValues.value[WEIGHT_RESULT_FIELD_NAME];
		// getWeightLots(weightLotsForeignKey);
		watch(() => formValues.value[WEIGHT_RESULT_FIELD_NAME], async (newWeightLotsKey) => {
			if (!!newWeightLotsKey && newWeightLotsKey !== weightLotsForeignKey.value) {
				console.log(`[setup assay lots] weight lots foreign key watcher: ${newWeightLotsKey}`);
				weightLotsForeignKey.value = newWeightLotsKey;
				await getWeightLots(weightLotsForeignKey.value);
			}
		}, {immediate: true});

		// add 'immediate: true' option to run the callback in this watcher on first render
		watch(() => formValues.value[CONTRACT_FIELD_NAME], async (selectedContractKey) => {
				await getContractData(selectedContractKey);
				assignMethodSelectionRef();
				disableEditAssayButtonReason.value = null;
			}, {immediate: true}
		);

		// add 'immediate: true' option to run the callback in this watcher on first render
		watch(() => formValues.value[PARCEL_FINALISED_FIELD_NAME], async (isParcelFinalised) => {
				console.log(`[setup assay lots] change in parcel finalised field in the parcel form detected with a new value=${isParcelFinalised}`);
				if (isParcelFinalised) {
					disableEditAssayButtonReason.value = 'Cannot edit assay lot data to a finalised parcel';
					isEditingDisabled.value = true;
				} else {
					disableEditAssayButtonReason.value = null;
					isEditingDisabled.value = false;
				}
			}, {immediate: true}
		);

		/**
		 * Get functions
		 */

		async function getItems(collection: string, fieldsToFetch: string[]) {
			let response = await api.get(`/items/${collection}`, {params: {
				fields: fieldsToFetch,
			}});
			return response.data.data;
		}

		async function getUnitsSelection(): Promise<Selection[]> {
			let response = await getItems(UNIT_COLLECTION_NAME, [UNIT_SYMBOL_FIELD_NAME]);
			return response.map(item => ({text: item[UNIT_SYMBOL_FIELD_NAME], value: item[UNIT_SYMBOL_FIELD_NAME]}));
		}

		async function getAssayUnitsSelection(): Promise<Selection[]> {
			let response = await getItems(ASSAY_UNIT_COLLECTION_NAME, [ASSAY_UNIT_DESCRIPTION_FIELD_NAME, ASSAY_UNIT_UNIT_FIELD_NAME]);
			return response.map(item => ({text: `${item[ASSAY_UNIT_DESCRIPTION_FIELD_NAME]} - ${item[ASSAY_UNIT_UNIT_FIELD_NAME]}`, value: item[ASSAY_UNIT_UNIT_FIELD_NAME]}));
		}

		async function getWeightLots(key) {
			console.log(`weight lots foreign key: ${key} in form values: ${JSON.stringify(formValues.value)}`);
			if (!!key) {
				try {
					const response = await api.get(`/items/${WEIGHT_LOT_COLLECTION_NAME}?filter[${FOREIGN_KEY_FIELD_NAME}]=${key}&sort[]=${WEIGHT_LOT_LOT_NUMBER_FIELD_NAME}`, {params: {
						fields: [
							WEIGHT_LOT_ID_FIELD_NAME,
							WEIGHT_LOT_LOT_NUMBER_FIELD_NAME, 
							WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME, 
							WEIGHT_LOT_METHOD_FIELD_NAME
						],
					}})
					console.log(`weight lots successfully fetched in assay results interface: ${JSON.stringify(response.data.data)}`);
					weightLots.value = response.data.data;
				} catch(reason) {
					console.log(`fetching the weight lots went wrong due to: ${reason}`);
				}
			}
		}

		async function getContractData(contractId: string) {
			if (!contractId) {
				// A contract has not been selected yet for this parcel item, assign null to contractData. Don't just do nothing in case the user deselected the contract, the old contract data needs to be cleared.
				contractData.value = null;
				console.log(`contract data cleared in assay results interface; contractData: ${JSON.stringify(contractData.value)}`)
				return;
			}
			try {
				// This will be for getting shared contract data like weightUOM, umpires, etc.
				const contractResponse = await api.get(`/items/${CONTRACT_COLLECTION_NAME}/${contractId}`, {params: {
					fields: [CONTRACT_WEIGHT_UOM_FIELD_NAME, CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME, CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME, CONTRACT_METHODS_FIELD_NAME],
				}});
				console.log(`contract data successfully fetched in assay results interface: ${JSON.stringify(contractResponse.data.data)}`);
				const contractResponseData = contractResponse.data.data; // response.data.data is an object response

				validateContractData(contractResponseData);

				const dryWeightUom = await api.get(`/items/${UNIT_COLLECTION_NAME}/${contractResponseData[CONTRACT_WEIGHT_UOM_FIELD_NAME]}`, {params: {
					fields: [UNIT_DRY_SYMBOL_FIELD_NAME],
				}});

				validateDryWeightUom(dryWeightUom.data.data);

				// Getting commodity specific data based for contract commidities
				const commodityInContractResponse = await api.get(`/items/${COMMODITY_IN_CONTRACT_COLLECTION_NAME}?filter[${CONTRACT_FIELD_NAME}]=${contractId}`, {params: {
					fields: [
						COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME, 
						COMMODITY_IN_CONTRACT_PRIMARY_COMMODITY_FIELD_NAME, 
						COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_FIELD_NAME, 
						COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_UNIT_FIELD_NAME
					],
				}}); // response.data.data is a list response
				console.log(`[getContractData] commodity in contract response: ${JSON.stringify(commodityInContractResponse.data.data)}`)

				validateCommoditiesInContractData(commodityInContractResponse.data.data);

				const contractCommodities: CommoditiesData[] = [];
				for (const commodity of commodityInContractResponse.data.data) {
					const commodityResponse = await api.get(`/items/${COMMODITY_COLLECTION_NAME}/${commodity.commodity}`, {params: {
						fields: [
							COMMODITY_NAME_FIELD_NAME, 
							COMMODITY_CODE_FIELD_NAME
						],
					}}); // response.data.data is an object response

					validateCommodityData(commodityResponse.data.data, commodity.commodity)

					const contractCommodity: CommoditiesData = {
						name: commodityResponse.data.data[COMMODITY_NAME_FIELD_NAME],
						code: commodityResponse.data.data[COMMODITY_CODE_FIELD_NAME],
						isPrimaryCommodity: commodity[COMMODITY_IN_CONTRACT_PRIMARY_COMMODITY_FIELD_NAME],
						splittingLimit: commodity[COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_FIELD_NAME],
						splittingLimitUOM: commodity[COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_UNIT_FIELD_NAME],
					};
					contractCommodities.push(contractCommodity);
				}

				// TODO: get proper values and default values for these fields
				contractData.value = {
					commodities: contractCommodities ?? [],
					dryWeightUOM: dryWeightUom.data.data[UNIT_DRY_SYMBOL_FIELD_NAME],
					methods: contractResponseData[CONTRACT_METHODS_FIELD_NAME],
					umpires: [],
					umpireArbitrationWhenSLEqualsDiff: contractResponseData[CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME],
					finalAssayEquation: contractResponseData[CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME]
				};

				console.log(`contract data: ${JSON.stringify(contractData.value)}`);

			} catch(reason: any) {
				disableEditAssayButtonReason.value = `Contract data could not be fetched due to: ${reason.message}`;
				console.error(`fetching the contract data went wrong due to: ${reason}`);
			}
		}

		function validateDryWeightUom(dryWeightUomResponse: any) {
			if (!dryWeightUomResponse) {
				throw new Error(`Weight uom response is empty, please ensure a valid weight UOM has been selected in the contract`);
				// return false;
			}

			// check if dry_symbol field exists
			if (!dryWeightUomResponse[UNIT_DRY_SYMBOL_FIELD_NAME]) {
				throw new Error(`Contract field 'Weight UOM' may have an invalid 'Dry Symbol' field value of ${dryWeightUomResponse[UNIT_DRY_SYMBOL_FIELD_NAME]}, please ensure a valid UOM with a proper Dry Symbol is selected`);
			}
		}

		function validateContractData(contractDataResponse: any) {
			if (!contractDataResponse) {
				throw new Error(`Contract data response is empty, please ensure the selected contract for this parcel still exists`);
				// return false;
			}

			// check if weight_uom field exists
			if (!contractDataResponse[CONTRACT_WEIGHT_UOM_FIELD_NAME]) {
				throw new Error(`Contract field 'Weight UOM' is empty`);
			}
			
			// check if methods field exists
			if (!contractDataResponse[CONTRACT_METHODS_FIELD_NAME]) {
				throw new Error(`Contract field 'Methods' is empty`);
			}

			// check that umpire_when_equal is a boolean
			if (
				contractDataResponse[CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME] === undefined || 
				contractDataResponse[CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME] === null ||
				typeof contractDataResponse[CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME] !== 'boolean'
			) {
				throw new Error(`Contract field 'Allow Split Option' is empty or has an invalid value of ${contractDataResponse[CONTRACT_UMPIRE_WHEN_EQUAL_FIELD_NAME]}`);
			}

			// check that final_assay_equation exists and can be casted to enum FinalAssayEquation
			if (
				!contractDataResponse[CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME] ||
				!Object.values(FinalAssayEquation).includes(contractDataResponse[CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME])
			) {
				throw new Error(`Contract field 'Final Assay Method' is empty or has an invalid value of ${contractDataResponse[CONTRACT_FINAL_ASSAY_EQUATION_FIELD_NAME]}`);
			}
		}
		
		function validateCommoditiesInContractData(commsInContractData: any) {
			// check if commsInContractData is of type array
			if (!commsInContractData ||
				!Array.isArray(commsInContractData)
			) {
				console.error(`Commodities in contract data response=${JSON.stringify(commsInContractData)} is null or not of type array`);
				throw new Error(`Commodities in contract is either empty or not a list`);
			}

			for (const commInContractData of commsInContractData) {
				validateCommodityInContractData(commInContractData);
			}
		}

		function validateCommodityInContractData(commInContractData: any) {
			if (!commInContractData) {
				throw new Error(`Commodity in contract is empty`);
			}

			if (!commInContractData[COMMODITY_IN_CONTRACT_COMMODITY_FIELD_NAME]) {
				throw new Error(`Commodity in contract field 'Commodity' is empty for one of the commodities, please ensure all commodities data in the contract is set`);
			}

			// check if splitting_limit field exists and if it can be converted to a number if it does
			if (!commInContractData[COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_FIELD_NAME] ||
				(isNaN(Number(commInContractData[COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_FIELD_NAME])))
			) {
				throw new Error(`Commodity in contract field 'Splitting Limit' is empty or has an invalid value, please ensure all commodities data in the contract is set`);
			}

			// check that splitting_limit_unit exists
			if (!commInContractData[COMMODITY_IN_CONTRACT_SPLITTING_LIMIT_UNIT_FIELD_NAME]) {
				throw new Error(`Commodity in contract field 'Assay UOM' is empty, please ensure all commodities data in the contract is set`);
			}
		}

		function validateCommodityData(commodityData: any, commodity: string) {
			if (!commodityData) {
				throw new Error(`Commodity data is empty for commodity ${commodity}, please contact Navarch for assistance`);
			}

			if (!commodityData[COMMODITY_NAME_FIELD_NAME]) {
				throw new Error(`Commodity field 'Name'is empty for commodity ${commodity}, please contact Navarch for assistance`);
			}

			if (!commodityData[COMMODITY_CODE_FIELD_NAME]) {
				throw new Error(`Commodity field 'Code' is empty for commodity ${commodity}, please contact Navarch for assistance`);
			}
		}

		function assignMethodSelectionRef() {
			console.log('[assignMethodSelectionRef]');
			if (!contractData.value) {
				console.error('contract data is not defined')
				allMethodSelection.value = [];
				return;
			}
			const unselectedOption = {text: SELECT_METHOD, value: undefined};
			console.log(`[assignMethodSelectionRef] contractData=${JSON.stringify(contractData.value)}`);
			allMethodSelection.value = [unselectedOption, ...contractData.value[CONTRACT_METHODS_FIELD_NAME].map(method => ({text: method, value: method}))];
			console.log(`[assignMethodSelectionRef] allMethodSelection=${JSON.stringify(allMethodSelection.value)}`);
			methodSelection.value = [...allMethodSelection.value];
		}

		/**
		 * Add new assay and assay lot functions
		 */
		const isAddingNewAssay: Ref<boolean> = ref(false);
		async function addAssayButtonHandler() {
			isAddingNewAssay.value = true;
			selectedAssayForDrawerDisplay.value = [{} as AssayV2];
			console.log(`[addAssayButtonHandler] weightLotsForeignKey=${weightLotsForeignKey.value}`);
			await getWeightLots(weightLotsForeignKey.value);

			// The button that calls this should only be clickable when the drawer is toggled off, so isOpen will be false and be toggled to true
			toggleDrawer();
		}

		function addNewAssayLot() {
			console.log(`[addNewAssayLot]`);
			const generatedUuid = uuidv4();
			const newLot = {
				id: generatedUuid,
				foreign_key: foreign_key,
				lot_number: assayLotsToDisplay.value.length + 1,
				commodity: itemCommodity.value, //(assays.value[selectedAssayIndex.value] as AssayV2).commodity,
				method: itemMethod.value //(assays.value[selectedAssayIndex.value] as AssayV2).method
			} as AssayLot
			console.log(`[addNewAssayLot] Adding new lot ${newLot} with generated id=${generatedUuid}`);
			assayLotsToDisplay.value.push(newLot);
			assayLotsToCreate.value.push(generatedUuid);
			console.log(`[addNewAssayLot] Adding new row to assay lots and now has ${assayLotsToDisplay.value.length} rows`);
		}

		function clearNewAssayLots() {
			console.log(`[clearNewAssayLots]`);
			// a counter to addNewAssayLot() function when user is adding new Assay and is switching back to composite assay after switching to assay lots; to be used in onCompositeToggle()
			assayLotsToDisplay.value = [];
			assayLotsToCreate.value = [];
		}

		/**
		 * Functions to handle saving data to the database
		 */
		async function updateAssayLots() {
			if (selectedAssayIndex.value === -1) {
				console.log(`no assay selected, aborting update`);
				return;
			}

			if (assayLotsToUpdate.value.length === 0) {
				return;
			}
			// const { id, foreign_key, ...patchData } = data;
			const lotsToUpdate = assayLotsToUpdate.value.map(id => assayLotsToDisplay.value.find(lot => lot.id === id) as AssayLot);
			console.log(`updating lots=${JSON.stringify(lotsToUpdate)}`);
			try {
				if (!isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value])){
					const response = await api.patch(`/items/${ASSAY_LOT_COLLECTION_NAME}`, lotsToUpdate);
					console.log(`lot data successfully patched with response id='${response.data.data.id}'`);

					for (const lot of response.data.data) {

						const displayLotsIndex = assayLotsToDisplay.value.findIndex(assayLot => assayLot.id === lot.id);
						assayLotsToDisplay.value[displayLotsIndex] = lot as AssayLot;
					}
					assays.value[selectedAssayIndex.value].lots = assayLotsToDisplay.value;
				}
			} catch(reason) {
				console.log(`patching for lots=${JSON.stringify(assayLotsToUpdate.value)} failed with reason: '${reason}'`)
			};
		}
		async function updateComposite(collection: string, data: AssayComposite) {
			const { id, foreign_key, ...patchData } = data;
			try {
				const response = await api.patch(`/items/${collection}/${id}`, patchData);
				console.log(`composite lot data successfully patched with response id='${response.data.data.id}'`);

				assays.value[selectedAssayIndex.value].composite = response.data.data as AssayComposite;
				// Casting this as AssayComposite since this will run on the condition that isComposite is true, so the update will be performed and 'lots' property will be set to an object of AssayComposite type
				const recalculatedAssay = evaluateAssayDataForComposite(assays.value[selectedAssayIndex.value].composite as AssayComposite, commodityCodeToNameMapping.value);
				if (recalculatedAssay !== null) {
					assays.value[selectedAssayIndex.value] = recalculatedAssay;
					console.log(`Assay recalculated and set to=${JSON.stringify(assays.value[selectedAssayIndex.value])}`);
				} else {
					console.log(`Assay could not be recalculated for the composite item with foreign_key=${data.foreign_key} and id=${response.data.data.id}`);
				}
			} catch(reason) {
				console.log(`patching for composite lot=${id} with foreign_key=${foreign_key} failed with reason: '${reason}'`)
			};
		}

		async function batchUpdateDisplayedAssayLots(collection: string, data: UpdatableSharedLotProperties) {
			if (!data.assay_uom && !data.dry_weight_uom && data.splitting_limit === undefined) {
				console.log(`Properties to batch update are undefined, there are no properties to update`);
				return;
			}

			try {
				const definedIds = assayLotsToDisplay.value.map(lot => lot.id).filter(id => id !== undefined) as string[];
				const response = await batchUpdateAssays(collection, definedIds, data);
				console.log(`batch update of lots success`);
				assayLotsToDisplay.value = response as AssayLot[];
				assays.value[selectedAssayIndex.value].lots = assayLotsToDisplay.value;
			} catch(reason) {
				console.log(`batch update of lots with foreign_key=${foreign_key} failed with reason: '${reason}'`)
			};
		}

		// function assayLotsOutOfSyncWithContract() {
		// 	// if contractData is null, then return false so no syncing operation is performed, the original values will be used
		// 	if (contractData.value === null) {
		// 		return false;
		// 	}

		// 	// get all assay lots/composite assays by commodities, if there are differences between dryWeightUom, assayUom, splitting limit, then return true
		// }

		// async function syncAssayLotsWithContract() {

		// }

		async function batchUpdateAssays(collection: string, ids: string[], data: UpdatableSharedLotProperties): Promise<AssayLot[] | undefined> {
			if (!data.assay_uom && !data.dry_weight_uom && data.splitting_limit === undefined) {
				console.log(`Properties to batch update are undefined, there are no properties to update`);
				return;
			}

			try {
				api.patch(`/items/${collection}?sort[]=lot_number`, {
					keys: ids,
					data: data
				}).then(response => {
					console.log(`[batchUpdateAssays] batch update of assays success`);
					return response.data.data;
				});
			} catch(reason) {
				console.error(`[batchUpdateAssays] batch update of assays with foreign_key=${foreign_key} failed with reason: '${reason}'`)
			};
		}

		async function createAssayLots(collection: string, data: AssayLot[]): Promise<number> {
			console.log('[createAssayLots]');
			// function will return the number of lots created; if 0, then no lots were created; if -1, then an error occurred
			if (data.length == 0) {
				console.log('[createAssayLots] no new lot items to be created');
				return 0;
			}
			// the response of the POST request will be sorted according to lot number
			try {
				const response = await api.post(`/items/${collection}?sort[]=lot_number`, data);
				console.log(`[createAssayLots] Item successfully created with response=${JSON.stringify(response.data.data)} to be updated to display assays=${JSON.stringify(assayLotsToDisplay.value)}`);
				for(const lot of (response.data.data as AssayLot[])) {
					const createdItemIndexForLotsToDisplay = assayLotsToDisplay.value.findIndex(displayLot => displayLot.id === lot.id);
					console.log(`[createAssayLots] Item with id=${lot.id} has been created to local assay lot array with index=${createdItemIndexForLotsToDisplay}`);
					
					// since assayLotsToDisplay.value and assays.value[selectedAssayIndex.value] points to the same array object, updating assayLotsToDisplay.value is enough
					assayLotsToDisplay.value[createdItemIndexForLotsToDisplay] = lot;
				}
				// assays.value[selectedAssayIndex.value].lots = assayLotsToDisplay.value;
				return assayLotsToDisplay.value.length;
			} catch(reason) {
				console.log(`[createAssayLots] creation of lots with foreign_key=${foreign_key} failed with reason: '${reason}'`)
				return -1;
			};
		}

		async function createComposite(collection: string, data: AssayComposite) {
			try {
				const response = await api.post(`/items/${collection}`, data);
				console.log(`[createComposite] Composite item successfully created with response=${JSON.stringify(response.data.data)}`);
				// Casting this as AssayComposite since this currently only composite items will be created in this block and 'lots' property will be set to an object of AssayComposite type
				const calculatedAssay = evaluateAssayDataForComposite(response.data.data as AssayComposite, commodityCodeToNameMapping.value);
				if (calculatedAssay !== null) {
					console.log(`[createComposite] Assays before adding new one=${assays.value}`)
					assays.value.push(calculatedAssay);
					console.log(`[createComposite] Assay calculated and set to=${JSON.stringify(calculatedAssay)} in ${JSON.stringify(assays.value)}}`);
				} else {
					console.log(`[createComposite] Assay could not be calculated for newly created composite item with foreign_key=${data.foreign_key} and id=${response.data.data.id}`);
				}
			} catch(reason) {
				console.log(`[createComposite] creation of composite item with foreign_key=${data.foreign_key} failed with reason: '${reason}'`)
			};
		}

		async function deleteAssayLotsOrComposite(collection: string, data: string[]) {
			// perform http request to delete the lots based on string ids in the data input parameter
			if (data.length == 0) {
				console.log('no lot items to be deleted');
				return;
			}
			try {
				const response = await api.delete(`/items/${collection}`, {
					data: data
				});
				if (response.status !== 204) {
					throw new Error(`response status=${response.status} is not 204`);
				}
				console.log(`Item successfully deleted with response status=${response.status}`);
				// remove the deleted lots from the assayLotsToDisplay array and save to a copy of the array
				const updatedAssayLots = assayLotsToDisplay.value.filter(lot => !data.includes(lot.id ?? "INVALID_ID"));
				console.log(`remaining assay lots by ids=${JSON.stringify(updatedAssayLots)} vs data=${JSON.stringify(data)}`);

				const updateLotNumbersData = updatedAssayLots.map((lot, index) => ({
					id: lot.id,
					lot_number: index + 1
				}));
				const updateLotNumbersResponse = await api.patch(`/items/${ASSAY_LOT_COLLECTION_NAME}?sort[]=lot_number`, updateLotNumbersData);
				assayLotsToDisplay.value = updateLotNumbersResponse.data.data;

				// assays.value[selectedAssayIndex.value].lots = assayLotsToDisplay.value;
			} catch(reason) {
				console.log(`deletion of lots with ids=${data} failed with reason: '${reason}'`)
			};
		}

		async function deleteAssay() {
			console.log('[deleteAssay]');
			// perform http request to delete the assay based on the selectedAssayIndex.value
			// just get all ids for the selected assay whether it is a composite assay or not
			const assayIds = assayLotsToDisplay.value.map(lot => lot.id);
			assayIds.push(compositeLotId.value);

			const response = await api.delete(`/items/${ASSAY_LOT_COLLECTION_NAME}`, {
				data: assayIds.filter(id => id !== undefined)
			});
			if (response.status !== 204) {
				throw new Error(`response status=${response.status} is not 204`);
			}
			console.log(`Assay successfully deleted with response status=${response.status}`);
			assays.value.splice(selectedAssayIndex.value, 1);

			toggleDrawer();
		}

		async function createAssayLotsOnAddNewAssay() {
			console.log('[createAssayLotsOnAddNewAssay]');
			syncStagedChanges();
			if (assayLotsToCreate.value.length !== 0) {
				const lotsToCreate = assayLotsToDisplay.value.filter(lot => assayLotsToCreate.value.includes(lot.id ?? INVALID_ID)).map(lot => ({
					...lot,
					assay_uom: itemAssayUoM.value,
					dry_weight_uom: itemDryWeightUnit.value,
					splitting_limit: itemSplittingLimit.value
				}));
				console.log(`[createAssayLotsOnAddNewAssay] Creating new lots; ${lotsToCreate.length} number of lots to be created`)
				const noOfLotsCreated = await createAssayLots(ASSAY_LOT_COLLECTION_NAME, lotsToCreate);
				if (noOfLotsCreated !== -1 && noOfLotsCreated !== 0) {
					// A response of -1 means an error occured
					// A response of 0 means no lots were created
					const evaluated = evaluateAssayDataV2(assayLotsToDisplay.value, commodityCodeToNameMapping.value);
					if (evaluated.length > 0) {
						assays.value.push(evaluated[0] as AssayV2);
					}
				}
			}
			console.log('[createAssayLotsOnAddNewAssay] done');
		}

		async function saveAssayLots(collection: string) {
			console.log('[saveAssayLots]');

			if (selectedAssayIndex.value === -1 || assays.value[selectedAssayIndex.value] === undefined) {
				console.error('[saveAssayLots] No assay selected. This method should only be called when an assay is selected. Aborting save operation.');
				return;
			}

			syncStagedChanges();
			console.log('[saveAssayLots] synced staged changes');
			
			if (assayLotsToCreate.value.length !== 0) {
				const lotsToCreate = assayLotsToDisplay.value.filter(lot => assayLotsToCreate.value.includes(lot.id ?? INVALID_ID)).map(lot => ({
					...lot,
					assay_uom: itemAssayUoM.value,
					dry_weight_uom: itemDryWeightUnit.value,
					splitting_limit: itemSplittingLimit.value
				}));
				console.log(`[saveAssayLots] Creating new lots; ${lotsToCreate.length} number of lots to be created`)
				await createAssayLots(collection, lotsToCreate);
			}
			
			let batchUpdateRequired = false;
			if (itemAssayUoM.value !== (assays.value[selectedAssayIndex.value] as AssayV2).assay_uom) {
				console.log('[saveAssayLots] batch update required for assay_uom');
				batchUpdateRequired = true;
				assayLotPropertiesToBatchUpdate.value.assay_uom = itemAssayUoM.value;
			}
			if (itemDryWeightUnit.value !== (assays.value[selectedAssayIndex.value] as AssayV2).dry_weight_uom) {
				console.log('[saveAssayLots] batch update required for dry_weight_uom');
				batchUpdateRequired = true;
				assayLotPropertiesToBatchUpdate.value.dry_weight_uom = itemDryWeightUnit.value;
			}
			if (itemSplittingLimit.value !== (assays.value[selectedAssayIndex.value] as AssayV2).splitting_limit) {
				console.log('[saveAssayLots] batch update required for splitting_limit');
				batchUpdateRequired = true;
				assayLotPropertiesToBatchUpdate.value.splitting_limit = itemSplittingLimit.value;
			}
			if (batchUpdateRequired) {
				console.log('[saveAssayLots] batch update required with properties: ', assayLotPropertiesToBatchUpdate.value);
				await batchUpdateDisplayedAssayLots(collection, assayLotPropertiesToBatchUpdate.value);
			}

			if (assayLotsToUpdate.value.length !== 0) {
				await updateAssayLots();
			}

			await deleteAssayLotsOrComposite(collection, assayLotsToDelete.value);

			(assays.value[selectedAssayIndex.value] as AssayV2).lots = assayLotsToDisplay.value;
			console.log(`[saveAssayLots] display assays=${JSON.stringify(assayLotsToDisplay.value)} vs assay lots=${JSON.stringify((assays.value[selectedAssayIndex.value] as AssayV2).lots)}`);
			const evaluatedAssayLotData = evaluateAssayDataV2((assays.value[selectedAssayIndex.value] as AssayV2).lots as AssayLot[], commodityCodeToNameMapping.value);
			if (evaluatedAssayLotData.length <= 0) {
				// minimum should be 0, but just in case
				// remove the assay for this method and commodity combination from the assays list
				console.log(`[saveAssayLots] evaluated assay lot data is empty, removing assay from assays list`);
				assays.value.splice(selectedAssayIndex.value, 1)
			} else {
				console.log(`[saveAssayLots] evaluated assay lot data is ${JSON.stringify(evaluatedAssayLotData[0])}`);
				assays.value[selectedAssayIndex.value] = evaluatedAssayLotData[0] as AssayV2;
			}
		};

		async function save() {
			console.log('[save]');
			if (isAddingNewAssay.value) {
				if (!!itemCommodity.value && !!itemMethod.value && isComposite.value){
					// When saving as composite assay when adding a new Assay
					const compositeLotToSave: AssayComposite = {
						foreign_key: foreign_key,
						dry_weight: compositeItemWeight.value,
						dry_weight_uom: itemDryWeightUnit.value,
						assay_uom: itemAssayUoM.value,
						seller_assay: compositeItemSellerAssay.value,
						buyer_assay: compositeItemBuyerAssay.value,
						difference: compositeItemDifference.value,
						splitting_limit: itemSplittingLimit.value,
						to_umpire: compositeItemToUmpire.value,
						umpire_name: compositeUmpireName.value,
						umpire_assay: compositeItemUmpireAssay.value,
						losing_party: compositeItemLosingParty.value,
						final_assay: compositeItemFinalAssay.value,

						commodity: itemCommodity.value,
						method: itemMethod.value,
					}
					compositeLotToSave.id = uuidv4();
					await createComposite(ASSAY_LOT_COLLECTION_NAME, compositeLotToSave);
					
					// save foreign key only when actual assay lots are saved
					if (formValues.value[ASSAY_RESULTS_FIELD_NAME] === undefined || formValues.value[ASSAY_RESULTS_FIELD_NAME] === null){
						console.log(`[save] emitting input event with assay lot foreign_key=${foreign_key}`)
						emit('input', foreign_key);
					}
				} else if (!!itemCommodity.value && !!itemMethod.value) {
					// When saving as assay lots when adding a new Assay
					await createAssayLotsOnAddNewAssay();
					
					// save foreign key only when actual assay lots are saved
					if (formValues.value[ASSAY_RESULTS_FIELD_NAME] === undefined || formValues.value[ASSAY_RESULTS_FIELD_NAME] === null){
						console.log(`[save] emitting input event with assay lot foreign_key=${foreign_key}`)
						emit('input', foreign_key);
					}
				} else {
					console.error('[save] No commodity or method selected. Nothing else to save. This should not occur when adding a new assay');
				}
				// should close the toggle, the Save button is in the drawer so it will only be clickable when the drawer is open
				toggleDrawer();
				return;
			} 

			// TODO: ensure selectedAssayIndex is not -1 after this point
			if (selectedAssayIndex.value === -1) {
				console.log('[save] No assay selected. Nothing else to save');
				// should close the toggle, the Save button is in the drawer so it will only be clickable when the drawer is open
				toggleDrawer();
				return;
			}
			
			if (!isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value]) && !isComposite.value) {
				// Originally is lots (since 'lots' property is an array) and is still to be saved as lots (not composite)
				await saveAssayLots(ASSAY_LOT_COLLECTION_NAME);
			} else if (isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value]) && isComposite.value) {
				// Originally is composite (since 'lots' property is not an array) and is still to be saved as composite
				console.log('asdf saving composite as composite');
				if (!!itemCommodity.value && !!itemMethod.value){
					console.log('asdf final assay=' + compositeItemFinalAssay.value);
					const compositeLotToSave: AssayComposite = {
						foreign_key: foreign_key,
						dry_weight: compositeItemWeight.value,
						dry_weight_uom: itemDryWeightUnit.value,
						assay_uom: itemAssayUoM.value,
						seller_assay: compositeItemSellerAssay.value,
						buyer_assay: compositeItemBuyerAssay.value,
						difference: compositeItemDifference.value,
						splitting_limit: itemSplittingLimit.value,
						to_umpire: compositeItemToUmpire.value,
						umpire_name: compositeUmpireName.value,
						umpire_assay: compositeItemUmpireAssay.value,
						losing_party: compositeItemLosingParty.value,
						final_assay: compositeItemFinalAssay.value,

						commodity: itemCommodity.value,
						method: itemMethod.value,
					}
					compositeLotToSave.id = compositeLotId.value;
					await updateComposite(ASSAY_LOT_COLLECTION_NAME, compositeLotToSave);
				}
			} else if (isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value]) && !isComposite.value) {
				// Was originally composite (since 'lots' property is not an array) but is to be saved as lots
				await saveAssayLots(ASSAY_LOT_COLLECTION_NAME);
				// TODO: write extra checks to ensure saveAssayLots is successful before deleting composite, otherwise, don't delete
				// For deletion, composite can be treated as if it was a lot item since it's also stored in the same table, just without a lot number
				// await deleteAssayLotsOrComposite(ASSAY_LOT_COLLECTION_NAME, [compositeLotId.value ?? INVALID_ID]);
			} else if (!isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value]) && isComposite.value) {
				// Was originally lots (since 'lots' property is an array) but is to be saved as composite
				if (!!itemCommodity.value && !!itemMethod.value){
					const compositeLotToSave: AssayComposite = {
						foreign_key: foreign_key,
						dry_weight: compositeItemWeight.value,
						dry_weight_uom: itemDryWeightUnit.value,
						assay_uom: itemAssayUoM.value,
						seller_assay: compositeItemSellerAssay.value,
						buyer_assay: compositeItemBuyerAssay.value,
						difference: compositeItemDifference.value,
						splitting_limit: itemSplittingLimit.value,
						to_umpire: compositeItemToUmpire.value,
						umpire_name: compositeUmpireName.value,
						umpire_assay: compositeItemUmpireAssay.value,
						losing_party: compositeItemLosingParty.value,
						final_assay: compositeItemFinalAssay.value,

						commodity: itemCommodity.value,
						method: itemMethod.value,
					}
					compositeLotToSave.id = uuidv4();
					await createComposite(ASSAY_LOT_COLLECTION_NAME, compositeLotToSave);
				}
				await deleteAssayLotsOrComposite(ASSAY_LOT_COLLECTION_NAME, assayLotsToDisplay.value.map(lot => lot.id).filter(id => id !== undefined) as string[]);
			}
			// should close the toggle, the Save button is in the drawer so it will only be clickable when the drawer is open
			toggleDrawer();
			console.log('[save] done');
		}


		/**
		 * Helper functions for the save functions
		 */
		function syncStagedChanges() {
			// // update lot numbers because there are lots to be deleted, add all existing lots that are not to be deleted to the update list
			// updateLotNumbersWhenThereAreLotsToDelete();
			// the update list should not have assay lots that are staged for creation, but just in case
			removeCreatedIdsFromUpdateList();
			// remove any lots staged for creation if they are also staged for deletion. For cases when a new row is added and then marked to be deleted before saving
			removeDeletedIdsFromCreateList();
			// remove any lots staged for updates if they are also staged for deletion. For cases when changes have been made to a row and then marked to be deleted before saving
			removeDeletedIdsFromUpdateList();
		};

		// A function to remove ids from assayLotsToCreate if they are in assayLotsToDelete
		function removeDeletedIdsFromCreateList() {
			assayLotsToDelete.value.forEach(id => {
				const index = assayLotsToCreate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					assayLotsToCreate.value.splice(index, 1);
				}
			});
		}

		// A function to remove lots from assayLotsToUpdate if they have ids that are in assayLotsToDelete
		function removeDeletedIdsFromUpdateList() {
			assayLotsToDelete.value.forEach(id => {
				const index = assayLotsToUpdate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					assayLotsToUpdate.value.splice(index, 1);
				}
			});
		}

		// A function to remove lots from assayLotsToUpdate if they have ids that are in assayLotsToCreate
		function removeCreatedIdsFromUpdateList() {
			assayLotsToCreate.value.forEach(id => {
				const index = assayLotsToUpdate.value.findIndex(lotId => lotId === id);
				if (index !== -1) {
					assayLotsToUpdate.value.splice(index, 1);
				}
			});
		}

		function isNullOrUndefined(value: any) {
			return value === null || value === undefined;
		}

		function evaluateAssayDataV2(lotsOrComposite: (AssayLot | AssayComposite)[], commidityNameMapping: Record<string, string>): AssayV2[] {
			const finalAssays: AssayV2[] = [];
			if (!lotsOrComposite) {
				return finalAssays;
			}
			const groupedAssays = groupAssaysByMethodAndCommodity(lotsOrComposite);
			let evaluatedAssayByCommodityAndMethod: AssayV2 | null = null;
			for(const groupedAssay of groupedAssays){
				if (groupedAssay.length === 1 && !isItemAnAssayLot(groupedAssay[0])) {
					evaluatedAssayByCommodityAndMethod = evaluateAssayDataForComposite(groupedAssay[0] as AssayComposite, commidityNameMapping);
				} else {
					evaluatedAssayByCommodityAndMethod = evaluateAssayDataForLots(groupedAssay, commidityNameMapping);
				}
				if (evaluatedAssayByCommodityAndMethod != null) {
					finalAssays.push(evaluatedAssayByCommodityAndMethod);
				}
			}
			return finalAssays;
		}

		function groupAssaysByMethodAndCommodity(lotsOrComposite: (AssayLot | AssayComposite)[]): (AssayLot | AssayComposite)[][] {
			const group = {
				'Planned': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				'Estimated': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				'Inturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				'Inturn Final': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
				'Outturn': {} as { [key: string]: (AssayLot | AssayComposite)[]; },
			};
			
			lotsOrComposite.forEach(lot => {
				if (!group[lot.method]) {
					group[lot.method] = {} as { [key: string]: AssayLot[]; };
				}
				if (!group[lot.method][lot.commodity]) {
					group[lot.method][lot.commodity] = [lot];
				} else {
					// Shouldn't be null/undefined
					group[lot.method][lot.commodity]?.push(lot);
				}
			});
			return [
				...Object.values(group['Planned']),
				...Object.values(group['Estimated']),
				...Object.values(group['Inturn']),
				...Object.values(group['Inturn Final']),
				...Object.values(group['Outturn']),
			]
		}
		
		function evaluateAssayDataForComposite(composite: AssayComposite, commidityNameMapping: Record<string, string>): AssayV2 | null {
			if (!composite) {
				return null;
			}
			console.log(`[evaluateAssayDataForComposite] commodity name=${commidityNameMapping[composite.commodity]} for commodity=${composite.commodity}`)
			const assay: AssayV2 = {
				assay_id: generateDeterministicAssayId(composite),
				method: composite.method,
				commodity: composite.commodity,
				commodity_name: commidityNameMapping[composite.commodity] ?? composite.commodity,
				assay_uom: composite.assay_uom,
				dry_weight_uom: composite.dry_weight_uom,
				seller_assay: composite.seller_assay,
				buyer_assay: composite.buyer_assay,
				difference: composite.difference,
				splitting_limit: composite.splitting_limit,
				to_umpire: composite.to_umpire,
				umpire_name: composite.umpire_name,
				umpire_assay: composite.umpire_assay,
				losing_party: composite.losing_party,
				final_assay: composite.final_assay,
				total_dry_weight: (composite.dry_weight ?? 0),
				total_arbitrated_dry_weight: !!composite.to_umpire ? (composite.dry_weight ?? 0) : 0,
				composite,
				lots: []
			}
			return assay;
		}

		function evaluateAssayDataForLots(assayLots: (AssayLot | AssayComposite)[], commidityNameMapping: Record<string, string>): AssayV2 | null {
			if (!assayLots) {
				return null;
			}
			const compositeAssay = assayLots.find(lotOrComposite => !('lot_number' in lotOrComposite)) as AssayComposite;
			const filteredAssayLots = (assayLots.filter(isItemAnAssayLot) as AssayLot[]).filter(lot => !(lot === null || lot === undefined));
			if (filteredAssayLots.length === 0) {
				return null;
			}

			const firstLot = filteredAssayLots[0] as AssayLot;
			console.log(`[evaluateAssayDataForLots] commodity name=${commidityNameMapping[firstLot.commodity]} for commodity=${firstLot.commodity}`)

			let assay: AssayV2 = {
				assay_id: generateDeterministicAssayId(firstLot),

				dry_weight_uom: firstLot.dry_weight_uom,
				method: firstLot.method,
				commodity: firstLot.commodity,
				commodity_name: commidityNameMapping[firstLot.commodity] ?? firstLot.commodity,
				// Assay UoM should be the same for all assay lots with the same commodity and method as defined in the contract, will assume firstLot.assay_uom is the same for all lots here
				assay_uom: firstLot.assay_uom,
				seller_assay: 0,
				buyer_assay: 0,
				difference: 0,
				// Splitting limit should be the same for all assay lots with the same commodity, will assume firstLot.splitting_limit is the same for all lots here
				splitting_limit: firstLot.splitting_limit,
				final_assay: 0,

				to_umpire: false,

				total_dry_weight: 0,
				total_arbitrated_dry_weight: 0,
				composite: compositeAssay,
				lots: filteredAssayLots
			}

			filteredAssayLots.forEach(lot => {
				assay.buyer_assay = parseOptionalNumber(assay.buyer_assay) + parseOptionalNumber(lot.buyer_assay)*parseOptionalNumber(lot.dry_weight);
				assay.difference = parseOptionalNumber(assay.difference) + parseOptionalNumber(lot.difference)*parseOptionalNumber(lot.dry_weight);;
				assay.final_assay = parseOptionalNumber(assay.final_assay) + parseOptionalNumber(lot.final_assay)*parseOptionalNumber(lot.dry_weight);;
				assay.seller_assay = parseOptionalNumber(assay.seller_assay) + parseOptionalNumber(lot.seller_assay)*parseOptionalNumber(lot.dry_weight);;

				assay.to_umpire = parseOptionalBoolean(assay.to_umpire) || parseOptionalBoolean(lot.to_umpire);
				if(!!lot.to_umpire) {
					// only have umpire assay as a defined value if there is at least one lot that requires umpire arbitration
					assay.umpire_assay = parseOptionalNumber(assay.umpire_assay) + parseOptionalNumber(lot.umpire_assay)*parseOptionalNumber(lot.dry_weight);
					assay.total_arbitrated_dry_weight += parseOptionalNumber(lot.dry_weight);
				}

				assay.total_dry_weight += parseOptionalNumber(lot.dry_weight);
			});

			// const count = filteredAssayLots.length;
			assay.buyer_assay = parseOptionalNumber(assay.buyer_assay)/assay.total_dry_weight;
			assay.seller_assay = parseOptionalNumber(assay.seller_assay)/assay.total_dry_weight;
			if (!!assay.to_umpire) {
				assay.umpire_assay = parseOptionalNumber(assay.umpire_assay)/assay.total_arbitrated_dry_weight;
			}
			assay.final_assay = parseOptionalNumber(assay.final_assay)/assay.total_dry_weight;

			assay.difference = parseOptionalNumber(assay.difference)/assay.total_dry_weight;
			
			const buyerLosesCount = filteredAssayLots.filter(lot => lot.losing_party === LosingPartyEnum.BUYER).length;
			const sellerLosesCount = filteredAssayLots.filter(lot => lot.losing_party === LosingPartyEnum.SELLER).length;
			if (sellerLosesCount !== 0 || buyerLosesCount !== 0) {
				// TODO: check on what to do all lots don't have a losing party, currently just declaring an assay for an commodity-method combo has a losing party only if there is at least one loser
				if (sellerLosesCount > buyerLosesCount) {
					assay.losing_party = LosingPartyEnum.SELLER;
				} else if (sellerLosesCount < buyerLosesCount) {
					assay.losing_party = LosingPartyEnum.BUYER;
				} else {
					assay.losing_party = LosingPartyEnum.SPLIT;
				}
			}

			return assay;
		}
		
		function parseOptionalNumber(value: any, defaultValue: number = 0): number {
			if (value === undefined || value === null || isNaN(value)) {
				return defaultValue;
			}
			return parseFloat(value);
		}

		function parseOptionalNumberV2(value: any, defaultValue: number | null = 0): number | null {
			if (value === undefined || value === null || isNaN(value)) {
				return defaultValue;
			}
			return parseFloat(value);
		}

		function parseOptionalBoolean(value: boolean | undefined, defaultValue?: boolean): boolean {
			if (value === undefined || value === null) {
				return (defaultValue !== null && defaultValue !== undefined) ? defaultValue : false;
			}
			return value;
		}
		
		function generateDeterministicAssayId(assay: AssayV2 | AssayLot | AssayComposite) {
			return `${assay.method}-${assay.commodity}-${foreign_key}`;
		}

		function isItemAnAssayLot(lotToCheck: AssayLot | AssayComposite | null | undefined): boolean {
			if (!lotToCheck) {
				return false;
			}
			return !!(('lot_number' in lotToCheck) && !!lotToCheck.lot_number);
		}

		function isAssayByMethodAndCommodityComposite(assay: AssayV2 | undefined): boolean {
			if (!assay || !assay.lots) {
				return true;
			}
			return assay.lots.length === 0;
			// return !Array.isArray(assayLotOrComposite);
		}
		
		function evaluateDifference(sellerAssay: number | undefined, buyerAssay: number | undefined): number | undefined {
			if (!sellerAssay || !buyerAssay) {
				return undefined;
			}
			return roundToDecimalPlaces(sellerAssay - buyerAssay);
		}

		function evaluateToUmpire(difference: number, splittingLimit: number, requireUmpireOnEquality: boolean): boolean {
			if (!!requireUmpireOnEquality && Math.abs(difference) === splittingLimit) {
				return true;
			}
			return Math.abs(difference) > splittingLimit;
		}

		function evaluateLosingParty(sellerAssay: number | null | undefined, buyerAssay: number | null | undefined, umpireAssay: number | null | undefined): LosingPartyEnum | undefined {
			// Must check that the sellerAssay and buyerAssay params are not undefined, null or NaN before passing them into this function
			
			// TODO: check what happens when difference=splittingLimit
			// Ans: depends on the contract

			if (
				isNullOrUndefined(umpireAssay) || isNaN(umpireAssay as number) ||
				isNullOrUndefined(sellerAssay) || isNaN(sellerAssay as number) ||
				isNullOrUndefined(buyerAssay) || isNaN(buyerAssay as number)
			) {
				// if one of these three assay values is undefined, null or NaN, then we can't determine a losing party
				// and even if the difference > splitting limit, don't define a losing party yet until an umpire assay value is given
				return undefined;
			}
			// cast the values as numbers because they are checked to be not null or undefined before this point
			sellerAssay = sellerAssay as number;
			buyerAssay = buyerAssay as number;
			umpireAssay = umpireAssay as number;

			const sellerToUmpireDiff = Math.abs(sellerAssay-umpireAssay);
			const buyerToUmpireDiff = Math.abs(buyerAssay-umpireAssay);

			if (sellerToUmpireDiff > buyerToUmpireDiff) {
				return LosingPartyEnum.SELLER;
			} else if (buyerToUmpireDiff > sellerToUmpireDiff) {
				return LosingPartyEnum.BUYER;
			} else {
				// The only reason this block should be executed is when sellerToUmpireDiff=buyerToUmpireDiff
				return LosingPartyEnum.SPLIT;
			}
		}

		function evaluateFinalAssay(sellerAssayString: number | string | null | undefined, buyerAssayString: number | string | null | undefined, umpireAssayString: number | string | null | undefined, toUmpire: boolean | undefined, losingParty: LosingPartyEnum | undefined, finalAssayEvalMethod: FinalAssayEquation): number | undefined {
			// using strings for the assay inputs because it seems that the values are being passed as strings from the form since the fields were converted to decimal instead of float
			let sellerAssay = parseOptionalNumberV2(sellerAssayString, null);
			let buyerAssay = parseOptionalNumberV2(buyerAssayString, null);
			let umpireAssay = parseOptionalNumberV2(umpireAssayString, null);
			if ((!isNullOrUndefined(sellerAssay) && !isNaN(sellerAssay as number)) && isNullOrUndefined(buyerAssay)) {
				// if the seller assay is defined and the buyer assay is not defined, then the final assay should be the seller assay
				return sellerAssay as number;
			} else if (isNullOrUndefined(sellerAssay) && (!isNullOrUndefined(buyerAssay) && !isNaN(buyerAssay as number))) {
				// if the buyer assay is defined and the seller assay is not defined, then the final assay should be the buyer assay
				return buyerAssay as number;
			} else if (isNullOrUndefined(sellerAssay) && isNullOrUndefined(buyerAssay)) {
				// if both the seller and buyer assay are not defined, then the final assay should be undefined
				return undefined;
			} else if (
				!isNullOrUndefined(sellerAssay) && !isNaN(sellerAssay as number) && 
				!isNullOrUndefined(buyerAssay) && !isNaN(buyerAssay as number) && 
				!toUmpire
			) {
				console.log(`[evaluateFinalAssay] Umpire arbitration not required, getting average of Seller assay=${sellerAssay} and Buyer assay=${buyerAssay}`)
				// Cast the values as numbers because they are checked to be not null or undefined before this point
				sellerAssay = sellerAssay as number;
				buyerAssay = buyerAssay as number;
				// Get average of seller and buyer assay as final if there's no umpire
				return roundToDecimalPlaces((sellerAssay + buyerAssay)/2);
			} else if (
				!isNullOrUndefined(sellerAssay) && !isNaN(sellerAssay as number) && 
				!isNullOrUndefined(buyerAssay) && !isNaN(buyerAssay as number) && 
				toUmpire
			) {
				console.log(`[evaluateFinalAssay] Umpire arbitration required, getting average of Seller assay=${sellerAssay}, Buyer assay=${buyerAssay} and Umpire assay=${umpireAssay}`)
				// Cast the values as numbers because they are checked to be not null or undefined before this point
				sellerAssay = sellerAssay as number;
				buyerAssay = buyerAssay as number;
				if (!isNullOrUndefined(umpireAssay) && !isNaN(umpireAssay as number)){
					// cast the umpire assay value as number because it is checked to be not null or undefined before this point
					umpireAssay = umpireAssay as number;
					if (finalAssayEvalMethod === FinalAssayEquation.AVG_WITH_MIDDLE_ASSAY_AS_FINAL_FOR_ARBITRATION) {
						// get the middle value of the three assays
						// it should be impossible for the input to be undefined, so it is casted as number
						return roundToDecimalPlaces([umpireAssay, sellerAssay, buyerAssay].sort((a,b) => a-b)[1] as number);
					} else if (finalAssayEvalMethod === FinalAssayEquation.AVG_WITH_AVG_OF_UMPIRE_AND_CLOSEST_AS_FINAL_FOR_ARBITRATION) {
						if (losingParty === undefined) {
							// if there is no losing party defined for some reason (should not happen because the autofills should handle that), then evaluate the losing party here anyway and get calculate the final assay
							// the evaluated losing party value here will not be saved though because this function has no access to it
							losingParty = evaluateLosingParty(sellerAssay, buyerAssay, umpireAssay);
						}
						if (losingParty === LosingPartyEnum.SPLIT) {
							// When there is a split and the final assay should be the average of the umpire and the closest assay, then get the middle value of the three assays instead
							// it should be impossible for the input to be undefined, so it is casted as number
							return roundToDecimalPlaces([umpireAssay, sellerAssay, buyerAssay].sort((a,b) => a-b)[1] as number);
						} else if (losingParty === LosingPartyEnum.SELLER) {
							return roundToDecimalPlaces((umpireAssay + buyerAssay)/2);
						} else if (losingParty === LosingPartyEnum.BUYER) {
							return roundToDecimalPlaces((umpireAssay + sellerAssay)/2);
						}
					}
				} else {
					console.log(`[evaluateFinalAssay] Umpire assay is not provided, calculating final assay with seller assay=${sellerAssay} and buyer assay=${buyerAssay}`);
					// Get the average of the seller and buyer assay as final if there's no umpire assay even if toUmpire is true, only do this if the seller and buyer assay are both defined numbers
					return (sellerAssay + buyerAssay)/2;
				}
			}
			console.log(`[evaluateFinalAssay] No final assay calculated, returning undefined`);
			return undefined
		}

		function cloneLots(lots: AssayLot[]): AssayLot[] {
			console.log('[cloneLots]');
			return [...lots].map(lot => ({...lot}));
		}

		function roundToDecimalPlaces(number: number, decimalPlaces: number = 4) {
			return Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
		}

		function formatNumber(number: any, decimalPlaces: number = 4, showZero: boolean = true) {
			console.log(`[formatNumber] with number value=${number}`);
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
			// const formattedDecimalPart = decimalPart ? decimalPart.slice(0, decimalPlaces) : '0'.repeat(decimalPlaces);
			// return formatted number
			return `${formattedIntegerPart}.${formattedDecimalPart}`;
		}

		function isCompositeLotChanged(currentComposite: AssayComposite, originalComposite: AssayComposite): boolean {
			if (currentComposite.id !== originalComposite.id) {
				console.log(`[isCompositeLotChanged()] Current=${currentComposite.id} vs original=${originalComposite.id} composite id mismatch`);
				return false;
			}
			if (currentComposite.foreign_key !== originalComposite.foreign_key) {
				// TODO: throw error here?
				console.log(`[isCompositeLotChanged()] Current=${currentComposite.foreign_key} vs original=${originalComposite.foreign_key} foreign_key mismatch! This is a major error as it means data from another parcel is being used.`);
				return false;
			}
			// compare all values in both composite objects, if there is a difference, return true, else return false at the end
			if (currentComposite.dry_weight !== originalComposite.dry_weight) {
				return true;
			}
			if (currentComposite.dry_weight_uom !== originalComposite.dry_weight_uom) {
				return true;
			}

			if (currentComposite.assay_uom !== originalComposite.assay_uom) {
				return true;
			}
			if (currentComposite.seller_assay !== originalComposite.seller_assay) {
				return true;
			}
			if (currentComposite.buyer_assay !== originalComposite.buyer_assay) {
				return true;
			}

			if (currentComposite.difference !== originalComposite.difference) {
				return true;
			}
			if (currentComposite.splitting_limit !== originalComposite.splitting_limit) {
				return true;
			}

			if (currentComposite.to_umpire !== originalComposite.to_umpire) {
				return true;
			}
			if (currentComposite.umpire_name !== originalComposite.umpire_name) {
				return true;
			}
			if (currentComposite.umpire_assay !== originalComposite.umpire_assay) {
				return true;
			}
			if (currentComposite.losing_party !== originalComposite.losing_party) {
				return true;
			}

			if (currentComposite.final_assay !== originalComposite.final_assay) {
				return true;
			}
			
			if (currentComposite.commodity !== originalComposite.commodity) {
				return true;
			}
			if (currentComposite.method !== originalComposite.method) {
				return true;
			}
			return false;
		}

		/**
		 * Event handler functions
		 */
		async function onCompositeToggle() {
			console.log(`[onCompositeToggle]`)
			if (
				!isComposite.value && 
				selectedAssayIndex.value !== -1 && 
				isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value])
			) {
				console.log(`[onCompositeToggle] converting previously saved composite assay to assay lots`)
				// When drawer is opened because a composite assay row was clicked in the Parcel form, and user wants to convert this composite assay to assay lots
				if (!assays.value[selectedAssayIndex.value]) {
					console.error(`[onCompositeToggle] invalid assay, selected assay index=${selectedAssayIndex.value} should not have empty assay lots}`)
					return;
				}
				selectedAssayForDrawerDisplay.value = [assays.value[selectedAssayIndex.value] as AssayV2];
				// If composite is toggled off and the assay was originally composite, then fetch weight lots data and add new rows with weight lots data filled in for each lot's dry_weight field
				const method = (assays.value[selectedAssayIndex.value] as AssayV2).method;
				await getWeightLots(weightLotsForeignKey.value);
				// TODO: investigate why this if-block is here, should have a new feature to have an update button to pull new weight lots data; add it to the condition below if it is needed
				// if (weightLots.value.filter(weightLot => weightLot.method === method.toString()).length === assayLotsToDisplay.value.length) {
				// 	console.log(`[onCompositeToggle] ${assayLotsToDisplay.value.length} lot(s) already exist for assay lots, most likely due to the composite toggle being clicked multiple times, no need to add more lots`);
				// 	return;
				// }
				// if (assayLotsToDisplay.value.length === 0) {
				// 	console.error(`[onCompositeToggle] assayLotsToDisplay is empty, selected assay index=${selectedAssayIndex.value} should not have empty assay lots}`)
				// 	return;
				// }
				// get the dry weight lots by the method and sort by lot number in ascending order
				const dryWeightValuesAndIdsByMethod = weightLots.value
					.filter(weightLot => weightLot.method === method.toString())
					.sort((a, b) => a.lot_number - b.lot_number)
					.map(lot => ({
						weight: lot.dry_weight, 
						id: lot.id
					}));
				for(const lot of dryWeightValuesAndIdsByMethod) {
					addNewAssayLot(); // add new row to assayLotsToDisplay and to assayLotsToCreate
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).weight_lot_id = lot.id;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight = parseFloat(lot.weight);
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight_uom = itemDryWeightUnit.value;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).splitting_limit = itemSplittingLimit.value;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).assay_uom = itemAssayUoM.value;
				}
				console.log(`[onCompositeToggle] assayLotsToDisplay: `, assayLotsToDisplay.value)
			} else if (
				isAddingNewAssay.value &&
				!isComposite.value &&
				!!itemMethod.value &&
				!!itemDryWeightUnit.value &&
				!!itemAssayUoM.value &&
				!!itemSplittingLimit.value
			) {
				console.log(`[onCompositeToggle] converting new assay to assay lots`)
				// When user is creating a new Assay row in the Parcel form and wants to convert this composite assay to assay lots on creation
				// If composite is toggled on and the assay is not originally composite, then fetch weight lots data and add new rows with weight lots data filled in for each lot's dry_weight field
				const method = itemMethod.value;
				await getWeightLots(weightLotsForeignKey.value);
				
				// get the dry weight lots by the method and sort by lot number in ascending order
				const dryWeightValuesAndIdsByMethod = weightLots.value
					.filter(weightLot => weightLot.method === method.toString())
					.sort((a, b) => a.lot_number - b.lot_number)
					.map(lot => ({
						weight: lot.dry_weight, 
						id: lot.id
					}));
				for(const lot of dryWeightValuesAndIdsByMethod) {
					addNewAssayLot(); // add new row to assayLotsToDisplay and to assayLotsToCreate
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).weight_lot_id = lot.id;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight = parseFloat(lot.weight);
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight_uom = itemDryWeightUnit.value;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).splitting_limit = itemSplittingLimit.value;
					(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).assay_uom = itemAssayUoM.value;
				}
				console.log(`[onCompositeToggle] assayLotsToDisplay: `, assayLotsToDisplay.value)
			} else if (
				isAddingNewAssay &&
				isComposite.value
			) {
				clearNewAssayLots();
			}
		}

		let stageSLChangedTimer: any;
		function stageSplittingLimitBatchUpdate() {
			if (stageSLChangedTimer == true) {
				clearTimeout(stageSLChangedTimer);
			}
			stageSLChangedTimer = setTimeout(() => {
				if (!contractData.value) {
					console.error('contract data is not defined')
					return;
				}
				// TODO: make a function to check if the selected assay is composite or lots, and if neither because no assay is selected, then do something.
				if (!isAssayByMethodAndCommodityComposite(assays.value[selectedAssayIndex.value])) {
					assayLotPropertiesToBatchUpdate.value.splitting_limit = itemSplittingLimit.value;

					let changeMade = false;
					for(const lot of assayLotsToDisplay.value) {
						// if the absolute value of the lot difference is greater than the splitting limit, then set to_umpire to true and add to the list of lots to update
						if (lot.difference === undefined || itemSplittingLimit.value === undefined) {
							console.log('lot difference or splitting limit is undefined');
							continue;
						}
						changeMade = false;
						if ((Math.abs(lot.difference) > itemSplittingLimit.value) && !lot.to_umpire) {
							console.log('lot difference is greater than splitting limit');
							// If to_umpire used to be false but should be changed to true
							lot.to_umpire = true;
							changeMade = true;
						} else if ((Math.abs(lot.difference) < itemSplittingLimit.value) && lot.to_umpire) {
							console.log('lot difference is less than to splitting limit');
							// If to_umpire used to be true but should be changed to false
							lot.to_umpire = false;
							changeMade = true;
						} else if ((Math.abs(lot.difference) === itemSplittingLimit.value) && !lot.to_umpire && contractData.value.umpireArbitrationWhenSLEqualsDiff) {
							console.log('lot difference is equal to splitting limit');
							// If to_umpire used to be false, s/l=diff, and umpire arbitration is needed when s/l=diff...then set to_umpire to true
							lot.to_umpire = true;
							changeMade = true;
						} else if ((Math.abs(lot.difference) === itemSplittingLimit.value) && !!lot.to_umpire && !contractData.value.umpireArbitrationWhenSLEqualsDiff) {
							console.log('lot difference is equal to splitting limit');
							// If to_umpire used to be true, s/l=diff, and umpire arbitration is not needed when s/l=diff...then set to_umpire to false
							lot.to_umpire = false;
							changeMade = true;
						}

						if (changeMade) {
							if (!lot.to_umpire) {
								// If to_umpire is false, then set umpire_assay, umpire_name, and losing_party to undefined before final assay is calculated
								lot.umpire_assay = undefined;
								lot.umpire_name = undefined;
								lot.losing_party = undefined;
							}

							lot.final_assay = evaluateFinalAssay(lot.seller_assay, lot.buyer_assay, lot.umpire_assay, lot.to_umpire, lot.losing_party, contractData.value.finalAssayEquation)
							const index = assayLotsToDisplay.value.findIndex(assayLot => assayLot.id === lot.id);
							assayLotsToDisplay.value[index] = lot;
							assayLotsToUpdate.value.push(lot.id ?? INVALID_ID);
						}
					}
				} else {
					// should be composite
					if (!compositeItemDifference.value || !itemSplittingLimit.value) {
						console.log('composite difference or splitting limit is undefined');
						return;
					}

					let changeMade = false;
					if ((Math.abs(compositeItemDifference.value) > itemSplittingLimit.value) && !compositeItemToUmpire.value) {
							console.log('lot difference is greater than splitting limit');
							// If to_umpire used to be false but should be changed to true
							compositeItemToUmpire.value = true;
							changeMade = true;
						} else if ((Math.abs(compositeItemDifference.value) < itemSplittingLimit.value) && compositeItemToUmpire.value) {
							console.log('lot difference is less than to splitting limit');
							// If to_umpire used to be true but should be changed to false
							compositeItemToUmpire.value = false;
							changeMade = true;
						} else if ((Math.abs(compositeItemDifference.value) === itemSplittingLimit.value) && !compositeItemToUmpire.value && contractData.value.umpireArbitrationWhenSLEqualsDiff) {
							console.log('lot difference is equal to splitting limit');
							// If to_umpire used to be false, s/l=diff, and umpire arbitration is needed when s/l=diff...then set to_umpire to true
							compositeItemToUmpire.value = true;
							changeMade = true;
						} else if ((Math.abs(compositeItemDifference.value) === itemSplittingLimit.value) && !!compositeItemToUmpire.value && !contractData.value.umpireArbitrationWhenSLEqualsDiff) {
							console.log('lot difference is equal to splitting limit');
							// If to_umpire used to be true, s/l=diff, and umpire arbitration is not needed when s/l=diff...then set to_umpire to false
							compositeItemToUmpire.value = false;
							changeMade = true;
						}

						if (changeMade) {
							if (!compositeItemToUmpire.value) {
								// If to_umpire is false, then set umpire_assay, umpire_name, and losing_party to undefined before final assay is calculated
								compositeItemUmpireAssay.value = 0;
								compositeUmpireName.value = undefined;
								compositeItemLosingParty.value = undefined;
							}
							console.log('asdf 1');compositeItemFinalAssay.value = evaluateFinalAssay(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value, compositeItemToUmpire.value, compositeItemLosingParty.value, contractData.value.finalAssayEquation);
						}
				}
			}, 2000);
		}

		const NO_OF_FOCUSABLE_INPUT_FIELDS_FOR_LOTS_TABLE = 7;
		let onKeyDownTimer: any;
		function onKeyDown(item: AssayLot, fieldType: 'seller_assay' | 'buyer_assay' | 'umpire_assay' | 'difference' | 'final_assay' | null, event: any) {
			// This is another key press handler for 'Enter' key to move to the next lot row
			// Need to test if this works on Mac/Linux
			if (event.code === 'Enter' || event.code === 'NumpadEnter') {
				const currentElementId = (event.target || event.srcElement)?.id
				if (!currentElementId) {
					console.error('currentElementId is not defined');
					return;
				}
				// do regex check here for pattern assay-(\w)+-(\d)+ exact match for the entire string
				if (!/assaylots-(\d)+-(\d)+/.test(currentElementId)) {
					console.error(`current element id=${currentElementId} is not in the correct format`);
					return;
				}
				const [ assayLotsPrefix, fieldNumberIdString, lotNumberString] = currentElementId.split('-');
				let lotNumber = parseInt(lotNumberString);
				let fieldNumberId = parseInt(fieldNumberIdString);
				let nextElementId = '';
				do {
					if (lotNumber < assayLotsToDisplay.value.length) {
						lotNumber++;
						nextElementId = `${assayLotsPrefix}-${fieldNumberId}-${lotNumber}`;
					} else {
						if (fieldNumberId === NO_OF_FOCUSABLE_INPUT_FIELDS_FOR_LOTS_TABLE) {
							// this will be entered when we are at the last row of the last 'focusable' column
							return;
						}
						fieldNumberId++;
						lotNumber = 1;
						nextElementId = `${assayLotsPrefix}-${fieldNumberId}-${lotNumber}`;
					}
				} while (
					!!document.getElementById(nextElementId) && 
					document.getElementById(nextElementId)?.getAttribute('disabled') !== null
				);
				document.getElementById(nextElementId)?.focus();
				return;
			}

			if (fieldType === null) {
				// so the fields that are not seller, buyer, or umpire assays will only respond to Enter key press
				return;
			}
				
			// TODO: reset the timer depending on the lot id/number too in case some user tries to update multiple rows within half a second
			if (!!onKeyDownTimer) {
				clearTimeout(onKeyDownTimer);
			}
			onKeyDownTimer = setTimeout(() => {
				
				if (!contractData.value) {
					console.error('contract data is not defined')
					return;
				}
				console.log(`on key down event: ${JSON.stringify(item)}`);

				// Let them be changed for now so that if the user wants to unstage a lot from deletion, the values are accurate and auto-evaluated too
				// if (assayLotsToDelete.value.includes(item.id ?? INVALID_ID)) {
				// 	console.log(`Item ${item.id} is marked for deletion. No changes will be made.`);
				// 	return;
				// }

				let index = -1;
				if (!!item.id) {
					index = assayLotsToDisplay.value.findIndex(lot => lot.id === item.id);
				} else {
					console.log(`No assay lot id found for item ${item}`);
					return;
				}
				if (index < 0) {
					console.log(`No assay lot found with id=${item.id}`);
					return;
				}

				if (fieldType === 'final_assay') {
					// If it's the final assay field that was changed, then just mark that row for update, no need to do the other auto-calculations
					// This function is only triggered by key press events, so the auto-calculations changing the value of this field should not trigger it to run for the final assay field in the table
					assayLotsToUpdate.value.push(item.id);
					return;
				}

				item.difference = evaluateDifference(item.seller_assay, item.buyer_assay);

				if (item.difference !== undefined && item.splitting_limit !== undefined) {
					item.to_umpire = evaluateToUmpire(item.difference, item.splitting_limit, !!contractData.value.umpireArbitrationWhenSLEqualsDiff);
				}

				if (!!item.to_umpire && item.umpire_assay !== undefined && item.seller_assay !== undefined && item.buyer_assay !== undefined) {
					// To umpire should be defined and is true
					item.losing_party = evaluateLosingParty(item.seller_assay, item.buyer_assay, item.umpire_assay);
				}

				if (!item.to_umpire) {
					// If to_umpire has been set false in this function, then clear umpire_assay, umpire_name, and losing_party before final assay is calculated
					item.umpire_assay = undefined;
					item.umpire_name = undefined;
					item.losing_party = undefined;
				}
				item.final_assay = evaluateFinalAssay(item.seller_assay, item.buyer_assay, item.umpire_assay, item.to_umpire, item.losing_party, contractData.value.finalAssayEquation);

				// update lot item in assayLotsToDisplay
				assayLotsToDisplay.value[index] = item;
				// add this item to assayLotsToUpdate list
				if (assayLotsToCreate.value.includes(item.id)) {
					// If the changed item is staged for creation, then don't add it to the staged update list
					return;
				}


				// If the code reaches this part, then it is an existing lot item that should be staged for update
				if (!assayLotsToUpdate.value.includes(item.id)) {
					// The first time this lot item is staged for update
					assayLotsToUpdate.value.push(item.id);
				}

			}, 500);
		}

		const isOpen = ref(false);
		function toggleDrawer() {
			console.log(`Toggle drawer: ${isOpen.value} -> ${!isOpen.value}`);
			isOpen.value = !isOpen.value;
			if (!isOpen.value) {
				assayLotsToDisplay.value = [];
				assayLotsToUpdate.value = [];
				assayLotsToCreate.value = [];
				assayLotsToDelete.value = [];
				selectedAssayForDrawerDisplay.value = [];
				selectedAssayIndex.value = -1;

				isAddingNewAssay.value = false;

				// Update all composite refs to their original value, make this into one single object if possible to use v-form
				compositeLotId.value = undefined;
				compositeItemWeight.value = undefined,
				itemDryWeightUnit.value = undefined,
				itemAssayUoM.value = undefined,
				compositeItemSellerAssay.value = undefined,
				compositeItemBuyerAssay.value = undefined,
				compositeItemDifference.value = undefined,
				itemSplittingLimit.value = undefined,
				compositeItemToUmpire.value = false,
				compositeUmpireName.value = undefined,
				compositeItemUmpireAssay.value = undefined,
				compositeItemLosingParty.value = undefined,
				console.log('asdf 2');compositeItemFinalAssay.value = undefined,

				itemCommodity.value = undefined,
				itemMethod.value = undefined,

				// let isComposite default to true
				isComposite.value = true;

				saveOperationCannotBePerformedReason.value = null;
			}
		};

		const toggleCompositeBoolean = () => {
			// deletable?
			isComposite.value = !isComposite.value;
		};

		const syncWeightLots = async () => {
			isSyncingWeightLots.value = true;

			await getWeightLots(weightLotsForeignKey.value);

			// check method is defined
			if (!itemMethod.value) {
				console.error('itemMethod is not defined');
				isSyncingWeightLots.value = false;
				return;
			}
			// get the dry weight lots by the method and sort by lot number in ascending order
			const dryWeightValuesAndIdByMethod = weightLots.value
				.filter(weightLot => weightLot.method === (itemMethod.value as MethodEnum).toString())
				.sort((a, b) => a.lot_number - b.lot_number)
				.map(lot => ({
					weight: lot.dry_weight,
					id: lot.id
				}));
			
			if (isComposite.value) {
				// if the selected assay is a composite assay, then update the dry weight values of the composite assay to the new dry weight values based on lot number
				compositeItemWeight.value = dryWeightValuesAndIdByMethod.reduce((acc: number, lot) => acc + parseFloat(lot.weight), 0);
			} else {

				for(const lot of dryWeightValuesAndIdByMethod) {
					// find the index of the lot in the assayLotsToDisplay array where the weight_lot_id matches the id of the weight lot
					const index = assayLotsToDisplay.value.findIndex(assayLot => assayLot.weight_lot_id === lot.id);
					if (index < 0) {
						console.log(`[syncWeightLots] weight lot id=${lot.id} not found in assayLotsToDisplay, adding new lot instead`);
						addNewAssayLot();
						(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).weight_lot_id = lot.id;
						(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight = parseFloat(lot.weight);
						(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight_uom = itemDryWeightUnit.value;
						(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).splitting_limit = itemSplittingLimit.value;
						(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).assay_uom = itemAssayUoM.value;
						continue;
					}

					(assayLotsToDisplay.value[index] as AssayLot).dry_weight = parseFloat(lot.weight);
					assayLotsToUpdate.value.push((assayLotsToDisplay.value[index] as AssayLot).id || INVALID_ID);
				}

				// find any lots that are in assayLotsToDisplay but not in the weight lots and mark them for deletion
				for (let i = 0; i < assayLotsToDisplay.value.length; i++) {
					if (!dryWeightValuesAndIdByMethod.find(lot => lot.id === (assayLotsToDisplay.value[i] as AssayLot).weight_lot_id)) {
						// remove the lot from assayLotsToDisplay and add it to the list of lots to delete
						assayLotsToDelete.value.push((assayLotsToDisplay.value[i] as AssayLot).id || INVALID_ID);
						// // No removing it from assayLotsToDisplay, just mark it for deletion
						// assayLotsToDisplay.value.splice(i, 1);
					}
				}


				// // if the selected assay is an assay lot, then update the dry weight values of the assay lots to the new dry weight values based on lot number
				// for (let i = 0; i < assayLotsToDisplay.value.length; i++) {
				// 	if (dryWeightValuesAndIdByMethod.length > i){
				// 		(assayLotsToDisplay.value[i] as AssayLot).dry_weight = dryWeightValuesAndIdByMethod[i].weight;
				// 	}
				// }
				// // when there are new weight lots added in, add them to the list of lots to update
				// if (dryWeightValuesAndIdByMethod.length > assayLotsToDisplay.value.length) {
				// 	for (let i = assayLotsToDisplay.value.length; i < dryWeightValuesAndIdByMethod.length; i++) {
				// 		addNewAssayLot();
				// 		(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight = dryWeightValuesAndIdByMethod[i].weight;
				// 		(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).dry_weight_uom = itemDryWeightUnit.value;
				// 		(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).splitting_limit = itemSplittingLimit.value;
				// 		(assayLotsToDisplay.value[assayLotsToDisplay.value.length - 1] as AssayLot).assay_uom = itemAssayUoM.value;
				// 	}
				// }
				// assayLotsToUpdate.value = assayLotsToDisplay.value.map(lot => lot.id ?? INVALID_ID);
			}

			isSyncingWeightLots.value = false;
		};

		const allMethodSelection: Ref = ref([]);
		const methodSelection: Ref = ref([]);

		const allCommoditiesSelection = ref(contractData.value ? ([
			{
				text: '-- Select an commodity --',
				value: undefined
			},
			...contractData.value.commodities.map((commodity) => {
				return {
					text: `${commodity.name} (${commodity.code})`,
					value: commodity.code,
				};
			})
		] as Selection[]) : []);
		const commoditySelection: Ref<Selection[]> = ref([...allCommoditiesSelection.value]);

		function onMethodSelected() {
			console.log('[onMethodSelected] running');
			if (!isAddingNewAssay.value) {
				console.log('[onMethodSelected] is not adding new assay, returning');
				// the method for an assay should not be changed once it is created, this selection option is only when creating a new assay
				return;
			}
			console.log(`[onMethodSelected] assays for selected method=${JSON.stringify(assays.value.find(assay => assay.method === itemMethod.value))}`)
			// For when method is selected, we need to trim what selections are available for commodity based on existing assays
			// Get all commodities from assays that have the same method as the selected method
			const commodities = assays.value.filter(assay => assay.method === itemMethod.value).map(assay => assay.commodity);
			// Filter out from commoditiesSelection the commodities that are already in the commodities array
			commoditySelection.value = [...allCommoditiesSelection.value.filter(selection => !commodities.includes(selection.value))];
			if (commoditySelection.value.length === 0) {
				// If there are no commodities left to select, then disable the commodity selection
				commoditySelection.value = [{
					text: '-- All commodities for this method have existing assays --',
					value: undefined,
				}];
			}
			if (!!itemMethod.value) {
				methodSelection.value[0].text = DESELECT_METHOD;
			} else {
				methodSelection.value[0].text = SELECT_METHOD;
			}
			compositeItemWeight.value = weightLots.value.filter(weightLot => weightLot.method === itemMethod.value).reduce((acc, weightLot) => acc + parseFloat(weightLot.dry_weight ?? 0), 0);
			console.log(`[onMethodSelected] compositeItemWeight=${compositeItemWeight.value}`);
		}

		function onCommoditySelected() {
			console.log('onCommoditySelected() is running');
			if (!isAddingNewAssay.value) {
				console.log('is not adding new assay, returning')
				// the commodity for an assay should not be changed once it is created, this selection option is only when creating a new assay
				return;
			}
			if (!contractData.value) {
				console.error('contract data is not defined')
				return;
			}
			console.log(`assays for selected commodity=${JSON.stringify(assays.value.find(assay => assay.commodity === itemCommodity.value))}`)
			const methods = assays.value.filter(assay => assay.commodity === itemCommodity.value).map(assay => assay.method);
			// If the selection.value is undefined, return true in the filter because we want to keep it as a "Deselect" option
			methodSelection.value = [...allMethodSelection.value.filter(selection => !selection.value || !methods.includes(selection.value))];
			if (methodSelection.value.length === 0) {
				// If there are no methods left to select, then disable the method selection
				methodSelection.value = [{
					text: '-- All methods for this commodity have existing assays --',
					value: undefined,
				}];
			}
			if (!!itemCommodity.value) {
				commoditySelection.value[0].text = '-- Deselect commodity --';
			} else {
				commoditySelection.value[0].text = '-- Select a commodity --';
			}

			const index = contractData.value.commodities.findIndex(commodity => commodity.code === itemCommodity.value)
			if (index >= 0) {
				itemSplittingLimit.value = contractData.value.commodities[index].splittingLimit;
				itemAssayUoM.value = contractData.value.commodities[index].splittingLimitUOM;
				itemDryWeightUnit.value = contractData.value.dryWeightUOM;
			}
			
		}

		watch(contractData, (newValue) => {
			isContractNotFound.value = !newValue;
			if (!!newValue) {
				allCommoditiesSelection.value = [
					{
						text: '-- Select an commodity --',
						value: undefined
					},
					...newValue.commodities.map((commodity) => {
						return {
							text: `${commodity.name} (${commodity.code})`,
							value: commodity.code,
						};
					})
				] as Selection[]
				commoditySelection.value = [...allCommoditiesSelection.value];
			}
		}, {immediate: true})

		function onCompositeToUmpireChanged() {
			
			if (!contractData.value) {
				console.error('contract data is not defined')
				return;
			}

			if (!compositeItemToUmpire.value) {
				compositeUmpireName.value = undefined;
				compositeItemUmpireAssay.value = undefined;
				compositeItemLosingParty.value = undefined;
			}

			compositeItemLosingParty.value = evaluateLosingParty(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value);
			console.log('asdf 3');compositeItemFinalAssay.value = evaluateFinalAssay(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value, compositeItemToUmpire.value, compositeItemLosingParty.value, contractData.value.finalAssayEquation);

			console.log('asdf ' + compositeItemFinalAssay.value);
		}

		function onCompositeSellerOrBuyerAssaysChanged() {
			if (!contractData.value) {
				console.error('contract data is not defined')
				return;
			}

			compositeItemDifference.value = evaluateDifference(compositeItemSellerAssay.value, compositeItemBuyerAssay.value);
			compositeItemToUmpire.value = !!compositeItemDifference.value && !!itemSplittingLimit.value ? 
				evaluateToUmpire(compositeItemDifference.value, itemSplittingLimit.value, !!contractData.value.umpireArbitrationWhenSLEqualsDiff) :
				false;
			if (!!compositeItemToUmpire.value) {
				compositeItemUmpireAssay.value = undefined;
				compositeUmpireName.value = undefined;
			}
			compositeItemLosingParty.value = evaluateLosingParty(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value);
			console.log('asdf 4');compositeItemFinalAssay.value = evaluateFinalAssay(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value, compositeItemToUmpire.value, compositeItemLosingParty.value, contractData.value.finalAssayEquation);
			console.log('asdf ' + compositeItemFinalAssay.value);
		}

		function onCompositeDifferenceChanged() {
			if (!contractData.value) {
				console.error('contract data is not defined')
				return;
			}
			// TODO: cleanup this mess, this is a copy of the logic in stageSplittingLimitChange function for composites
			// should be composite
			if (!compositeItemDifference.value || !itemSplittingLimit.value) {
				console.log('composite difference or splitting limit is undefined');
				return;
			}

			let changeMade = false;
			if ((Math.abs(compositeItemDifference.value) > itemSplittingLimit.value) && !compositeItemToUmpire.value) {
				console.log('lot difference is greater than splitting limit');
				// If to_umpire used to be false but should be changed to true
				compositeItemToUmpire.value = true;
				changeMade = true;
			} else if ((Math.abs(compositeItemDifference.value) < itemSplittingLimit.value) && compositeItemToUmpire.value) {
				console.log('lot difference is less than to splitting limit');
				// If to_umpire used to be true but should be changed to false
				compositeItemToUmpire.value = false;
				changeMade = true;
			} else if ((Math.abs(compositeItemDifference.value) === itemSplittingLimit.value) && !compositeItemToUmpire.value && contractData.value.umpireArbitrationWhenSLEqualsDiff) {
				console.log('lot difference is equal to splitting limit');
				// If to_umpire used to be false, s/l=diff, and umpire arbitration is needed when s/l=diff...then set to_umpire to true
				compositeItemToUmpire.value = true;
				changeMade = true;
			} else if ((Math.abs(compositeItemDifference.value) === itemSplittingLimit.value) && !!compositeItemToUmpire.value && !contractData.value.umpireArbitrationWhenSLEqualsDiff) {
				console.log('lot difference is equal to splitting limit');
				// If to_umpire used to be true, s/l=diff, and umpire arbitration is not needed when s/l=diff...then set to_umpire to false
				compositeItemToUmpire.value = false;
				changeMade = true;
			}

			if (changeMade) {
				if (!compositeItemToUmpire.value) {
					// If to_umpire is false, then set umpire_assay, umpire_name, and losing_party to undefined before final assay is calculated
					compositeItemUmpireAssay.value = undefined;
					compositeUmpireName.value = undefined;
					compositeItemLosingParty.value = undefined;
				}

				console.log('asdf 5');compositeItemFinalAssay.value = evaluateFinalAssay(compositeItemSellerAssay.value, compositeItemBuyerAssay.value, compositeItemUmpireAssay.value, compositeItemToUmpire.value, compositeItemLosingParty.value, contractData.value.finalAssayEquation);
			}
		}

		const selectedAssayForDrawerDisplay: Ref<AssayV2[]> = ref([]);
		const isCompositeToggleDisabled: Ref<boolean> = ref(false);
		function rowClickHandler(event) {
			// Should open the drawer, this function should only be in the assay table in the form so will only be clickable when the drawer is closed
			console.log(`[rowClickHandler] ${JSON.stringify(event)} after clicking on an assay row`);
			const clickedItem = event.item as AssayV2;

			// TODO: check if I can just get the index from the event object
			selectedAssayIndex.value = assays.value.findIndex(assay => assay.assay_id === generateDeterministicAssayId(clickedItem));
			// clickedItem.lots is either AssayLot[] or AssayComposite
			if (!isAssayByMethodAndCommodityComposite(clickedItem)) {
				// let isComposite be false here since we already know that these are lots
				isComposite.value = false;
				console.log('[rowClickHandler] disabling is composite toggle')
				isCompositeToggleDisabled.value = true;

				console.log(`[rowClickHandler] Selected assay item is of index=${selectedAssayIndex.value}`);
				// With the !isCompositeAssay(clickedItem.lots) check, we know that clickedItem.lots is an array of AssayLot
				assayLotsToDisplay.value = cloneLots(clickedItem.lots as AssayLot[]);
				console.log(`[rowClickHandler] assayLotsToDisplay=${JSON.stringify(assayLotsToDisplay.value)}`)
				// TODO: add items in in onKeyDown event
				if (selectedAssayIndex.value !== -1 && assays.value[selectedAssayIndex.value] !== undefined) {
					// Assumed every assay list item has at least one assay lot since they are calculated dynamically from the assay lot
					itemMethod.value = (assays.value[selectedAssayIndex.value] as AssayV2).method;
					itemCommodity.value = (assays.value[selectedAssayIndex.value] as AssayV2).commodity;

					// TODO: set these refs in a cleaner way
					itemAssayUoM.value = (assayLotsToDisplay.value[0] as AssayLot).assay_uom;
					itemDryWeightUnit.value = (assayLotsToDisplay.value[0] as AssayLot).dry_weight_uom;
					itemSplittingLimit.value = (assays.value[selectedAssayIndex.value] as AssayV2).splitting_limit;

					selectedAssayForDrawerDisplay.value = [assays.value[selectedAssayIndex.value] as AssayV2];
				}
			} else {
				console.log('[rowClickHandler] keeping is composite toggle enabled')
				console.log(`[rowClickHandler] debug rowClickHandler selectedAssayIndex=${selectedAssayIndex.value}`);
				isCompositeToggleDisabled.value = false;

				// With the isCompositeAssay(clickedItem.lots) check, we know that clickedItem.lots is an AssayComposite
				clickedItem.composite = clickedItem.composite as AssayComposite;

				compositeLotId.value = clickedItem.composite?.id;
				itemMethod.value = clickedItem.composite?.method;
				itemCommodity.value = clickedItem.composite?.commodity;
				itemAssayUoM.value = clickedItem.composite?.assay_uom;
				itemSplittingLimit.value = clickedItem.composite?.splitting_limit;
				compositeItemToUmpire.value = !!clickedItem.composite?.to_umpire;
				compositeUmpireName.value = clickedItem.composite?.umpire_name;
				compositeItemWeight.value = clickedItem.composite?.dry_weight;
				itemDryWeightUnit.value = clickedItem.composite?.dry_weight_uom;
				compositeItemSellerAssay.value = clickedItem.composite?.seller_assay;
				compositeItemBuyerAssay.value = clickedItem.composite?.buyer_assay;
				compositeItemDifference.value = clickedItem.composite?.difference;
				console.log('asdf 6');compositeItemFinalAssay.value = clickedItem.composite?.final_assay;
				console.log('asdf ' + compositeItemFinalAssay.value);
				compositeItemUmpireAssay.value = clickedItem.composite?.umpire_assay;
				compositeItemLosingParty.value = clickedItem.composite?.losing_party;

				console.log(`[rowClickHandler] assayLotsToDisplay in composite=${JSON.stringify(assayLotsToDisplay.value)}`);
			}

			
			toggleDrawer();
		}

		function deleteButtonHandler(id: string) {
			// add id into assayLotsToDelete if it's not already there, otherwise remove it
			const index = assayLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				assayLotsToDelete.value.push(id);
			} else {
				assayLotsToDelete.value.splice(index, 1);
			}
		}

		const confirmCloseDrawerOverlay = ref(false);

		function openConfirmCloseDrawerOverly() {
			// check if there are any changes made to the assay lots, or simply allow save action if it is composite
			const changesPresent = (assayLotsToUpdate.value.length > 0 || assayLotsToDelete.value.length > 0 || assayLotsToCreate.value.length > 0) || isComposite.value;
			if (changesPresent){
				confirmCloseDrawerOverlay.value = true;
			} else {
				confirmCloseDrawer();
			}
		}

		function closeConfirmCloseDrawerOverlay() {
			confirmCloseDrawerOverlay.value = false;
		}

		function confirmCloseDrawer() {
			closeConfirmCloseDrawerOverlay();
			toggleDrawer();
		}

		const confirmSaveOverlay = ref(false);

		function openConfirmSaveOverlay() {
			// check if there are any changes made to the assay lots, or simply allow save action if it is composite
			const changesPresent = (assayLotsToUpdate.value.length > 0 || assayLotsToDelete.value.length > 0 || assayLotsToCreate.value.length > 0) || isComposite.value;
			if (changesPresent) {
				confirmSave();
			} else {
				saveOperationCannotBePerformedReason.value = 'Please add new assay lots or make changes to existing assay lots before saving';
			}

			// The original behaviour was to show the confirm save overlay if there are changes made to the assay lots, not needed anymore
			// if (changesPresent){
			// 	confirmSaveOverlay.value = true;
			// } else if (isAddingNewAssay.value === true) {
			// 	confirmSave();
			// } else {
			// 	saveOperationCannotBePerformedReason.value = 'Please add new assay lots or make changes to existing assay lots before saving';
			// }
		}

		function closeConfirmSaveOverlay() {
			confirmSaveOverlay.value = false;
		}

		async function confirmSave() {
			try {
				console.log(`[confirmSave] is saving assay lot(s)`)
				isEditingLotsViaApi.value = true;
				await save();
			} catch (error) {
				console.error(`[confirmSave] error=${error}`);
			} finally {
				console.log(`[confirmSave] finished saving assay lot(s)`)
				closeConfirmSaveOverlay();
				isEditingLotsViaApi.value = false;
			}
		}

		const confirmDeleteAssayOverlay = ref(false);

		function openConfirmDeleteAssayOverlay() {
			confirmDeleteAssayOverlay.value = true;
		}

		function closeConfirmDeleteAssayOverlay() {
			confirmDeleteAssayOverlay.value = false;
		}

		async function confirmDeleteAssay() {
			try {
				console.log(`[confirmDeleteAssay] is deleting assay lot(s)`)
				isEditingLotsViaApi.value = true;
				await deleteAssay();
			} catch (error) {
				console.error(`[confirmDeleteAssay] error=${error}`);
			} finally {
				console.log(`[confirmDeleteAssay] finished deleting assay lot(s)`)
				closeConfirmDeleteAssayOverlay();
				isEditingLotsViaApi.value = false;
			}
		}

		/**
		 * Display changes
		 */
		function highlightCellToLightSalmon(highlight: boolean) {
			if (highlight) {
				return 'assay_cell_highlighted';
			}
			return 'assay_cell';
		}

		function deleteIcon(id: string) {
			console.log('[deleteIcon]');
			const index = assayLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				return 'close';
			}
			return 'settings_backup_restore';
		}

		function colourDeleteIcon(id: string) {
			console.log('[colourDeleteIcon]');
			const index = assayLotsToDelete.value.findIndex(lotId => lotId === id);
			if (index === -1) {
				return 'v-icon-delete-button-small-foreground-subdued';
			}
			return 'v-icon-delete-button-small-red';
		}

		/**
		 * Watchers
		 */
		watch(isComposite, onCompositeToggle);
		watch(itemMethod, onMethodSelected);
		watch(itemCommodity, onCommoditySelected);

		watch([compositeItemSellerAssay, compositeItemBuyerAssay], (_newValue, oldValue) => { 
			onCompositeSellerOrBuyerAssaysChanged()
		});
		watch([compositeItemDifference], onCompositeDifferenceChanged);
		watch([compositeItemToUmpire, compositeItemUmpireAssay], onCompositeToUmpireChanged);

		watch(() => formValues.value[WEIGHT_RESULT_FIELD_NAME], (newValue) => getWeightLots(newValue));

		watch(assays, (newAssays) => {
			console.log(`change in assay detected. New assay=${JSON.stringify(newAssays)}`);
			inturnAssays.value = [];
			inturnFinalAssays.value = [];
			outturnAssays.value = [];
			plannedAssays.value = [];
			estimateAssays.value = [];
			for (const assay of newAssays) {
				switch(assay.method) {
					case MethodEnum.INTURN:
						inturnAssays.value.push(assay);
						break;
					case MethodEnum.INTURN_FINAL:
						inturnFinalAssays.value.push(assay);
						break;
					case MethodEnum.OUTTURN:
						outturnAssays.value.push(assay);
						break;
					case MethodEnum.ESTIMATED:
						estimateAssays.value.push(assay);
						break;
					case MethodEnum.PLANNED:
						plannedAssays.value.push(assay);
						break;
					default:
						// do nothing if doesn't match
						break;
				}
			}
			isInturnAssaysEmpty.value = inturnAssays.value.length === 0;
			isInturnFinalAssaysEmpty.value = inturnFinalAssays.value.length === 0;
			isOutturnAssaysEmpty.value = outturnAssays.value.length === 0;
			isPlannedAssaysEmpty.value = plannedAssays.value.length === 0;
			isEstimateAssaysEmpty.value = estimateAssays.value.length === 0;
		},
  		{ deep: true });

		return {

			confirmCloseDrawerOverlay,
			openConfirmCloseDrawerOverly,
			closeConfirmCloseDrawerOverlay,
			confirmCloseDrawer,
			confirmSaveOverlay,
			openConfirmSaveOverlay,
			closeConfirmSaveOverlay,
			confirmSave,
			confirmDeleteAssayOverlay,
			openConfirmDeleteAssayOverlay,
			closeConfirmDeleteAssayOverlay,
			confirmDeleteAssay,

			attrs,
			assayTableHeaders,
			assayLotTableHeaders,
			units,
			itemDryWeightUnit,
			assayUnits,

			saveAssayLots,
			foreign_key,
			formValues,
			addNewAssayLot,

			isOpen,
			toggleDrawer,

			isComposite,
			toggleCompositeBoolean,
			methodSelection,
			commoditySelection,
			itemMethod,
			itemCommodity,
			itemAssayUoM,
			itemSplittingLimit,
			compositeItemWeight,
			compositeItemSellerAssay,
			compositeItemBuyerAssay,
			compositeItemDifference,
			compositeItemFinalAssay,
			compositeItemToUmpire,
			compositeUmpireName,
			compositeItemUmpireAssay,
			compositeItemLosingParty,
			rowClickHandler,

			assays,
			inturnAssays,
			isInturnAssaysEmpty,
			inturnFinalAssays,
			isInturnFinalAssaysEmpty,
			outturnAssays,
			isOutturnAssaysEmpty,
			estimateAssays,
			isEstimateAssaysEmpty,
			plannedAssays,
			isPlannedAssaysEmpty,
			selectedAssayForDrawerDisplay,
			assayLotsToDisplay,
			assayLotsToDelete,
			onKeyDown,
			deleteButtonHandler,

			stageSplittingLimitBatchUpdate,

			addAssayButtonHandler,
			isAddingNewAssay,
			save,
			onCompositeToggle,
			saveOperationCannotBePerformedReason,

			isCompositeToggleDisabled,
			isEditingLotsViaApi,

			highlightCellToLightSalmon,
			deleteIcon,
			colourDeleteIcon,

			isEditingDisabled,
			isContractNotFound,
			disableEditAssayButtonReason,
			formatNumber,
			isNullOrUndefined,

			syncWeightLots,
			isSyncingWeightLots,
		};
	},
});
</script>

<style lang="scss" scoped>
.assay-table {
	// --v-table-background-color: lightsalmon;
	.table-row {
		height: 30px;
	}
	.assay_cell {
		width: 100%;
	}
	.assay_cell_highlighted {
		background-color: lightsalmon !important;
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

.assay-drawer {
	max-width: 1500px !important;
}

.v-sheet {
	--v-sheet-color: var(-red-600);
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
	padding-top: 20px !important;
}

.same-line {
	display: flex;
	flex-direction: row;
}

// this is copied from input-label class and made specifically for the "Is Composite" checkbox label in the assay lots drawer
.is-composite-checkbox-label {
    color: #f0f6fc;
    font-weight: 600;
    font-size: 16px;
    font-family: "Inter", -apple-system, "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    font-style: normal;
    line-height: 19px;

	padding-left: 10px !important;
	// vertically centre align
	display: flex;
	align-items: center;
}
</style>