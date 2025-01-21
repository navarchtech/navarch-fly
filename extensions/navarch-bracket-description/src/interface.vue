<template>
	<v-notice
		icon="description"
	>
		{{ value ?? `Note: fill in all necessary information for a description to be generated` }}
	</v-notice>
</template>

<script lang="ts">
import { defineComponent, inject, ref, watch } from 'vue';
import { FORM_TYPES, FOR_EVERY_UNIT_TYPE, BRACKET_TYPE, RATE_TYPE } from './utils/types';

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
		formType: {
			type: String,
			default: null
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		const formValues = inject('values', ref<Record<string, any>>({}));
		const tipMessage = ref<string | null>('fill in all necessary information for a description to be generated');

		const SUBJECT: 'Commodity Price Rate' | 'Commodity Analytical Assay' = props.formType === 'charge' ? 'Commodity Price Rate' : 'Commodity Analytical Assay';

		const RELATIONAL_FIELD_NAME = 'related_commodity_in_contract';
		const LOWER_THRESHOLD_FIELD_NAME = 'lower_threshold';
		const LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME = 'lower_threshold_inclusive';
		const UPPER_THRESHOLD_FIELD_NAME = 'upper_threshold'; // may be undefined
		const UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME = 'upper_threshold_inclusive';
		const PAYABLE_ASSAY_BRACKET_TYPE_FIELD_NAME = 'bracket_type' // Bracket, Maximum Cap, Minimum Deduction
		const PAYABLE_ASSAY_RATE_FIELD_NAME = 'rate'
		const PAYABLE_ASSAY_RATE_TYPE_FIELD_NAME = 'rate_type' // Percentage, Fractional
		const PAYABLE_ASSAY_INIT_ADJUST_FIELD_NAME = 'initial_adjustment'
		const PAYABLE_ASSAY_INIT_ADJUST_UOM_FIELD_NAME = 'initial_adjustment_uom'

		// payable assay rate specific fields
		const PAYABLE_ASSAY_MIN_DEDUCT_FIELD_NAME = 'minimum_deduction'
		const PAYABLE_ASSAY_MIN_DEDUCT_UOM_FIELD_NAME = 'minimum_deduction_uom'
		const PAYABLE_ASSAY_MAX_CAP_FIELD_NAME = 'maximum_cap'
		const PAYABLE_ASSAY_MAX_CAP_UOM_FIELD_NAME = 'maximum_cap_uom'

		// treatment/refining charge rate specific fields
		const TRC_BASE_CHARGE_FIELD_NAME = 'base_treatment_charge'
		const TRC_BASE_CHARGE_ADJUSTMENT_FIELD_NAME = 'base_charge_adjustment'
		const TRC_USE_BASE_CHARGE_FIELD_NAME = 'use_btc'
		const TRC_ESCALATOR_REFERENCE_FIELD_NAME = 'escalator_reference'
		const TRC_FOR_EVERY_UNIT_FIELD_NAME = 'for_every_unit' // "above the lower threshold, plus", "below the upper threshold, minus"
		const TRC_RATE_FIELD_RATE = 'rate'

		// penalty rate specific fields
		const PENALTY_NO_PEANLTY_FIELD_NAME = 'no_penalty'
		const PENALTY_ESCALATOR_REFERENCE_FIELD_NAME = 'escalator_reference'
		const PENALTY_FOR_EVERY_UNIT_FIELD_NAME = 'for_every_unit' // "above the lower threshold, plus", "below the upper threshold, minus"
		const PENALTY_RATE_FIELD_NAME = 'rate'

		// TODO: like the invoice form, try to get the friggin commodity relational key as it is created
		const COMM_IN_CONTRACT_COLLECTION_NAME = 'navarch_commodity_in_contract';
		const COMM_IN_CONTRACT_COMMODITY_FIELD_NAME = 'commodity';
		const COMM_IN_CONTRACT_ASSAY_UNIT_FIELD_NAME = 'splitting_limit_unit'; // needed for payable assay rate, and penalty rate; don't need to fetch, the key itself already is the symbol
		const COMM_IN_CONTRACT_PENALTY_RATE_UOM_FIELD_NAME = 'penalty_per_uom'; // for penalty rate
		const COMM_IN_CONTRACT_PRICE_RATE_UOM_FIELD_NAME = 'price_per_uom'; // for treatment/refining charge

		// maybe request user to select commodity, assay unit, penalty rate unit, and price rate unit in the form first before making this. Won't be able to fetch it though until the user hits save
		const COMMODITY_COLLECTION_NAME = 'navarch_commodity';
		const COMMODITY_NAME_FIELD_NAME = 'name'; // for payable assay rate and penalty rate

		const UNIT_COLLECTION_NAME = 'navarch_unit';
		const UNIT_SYMBOL_FIELD_NAME = 'symbol'; // symbol of the unit 

		const baseFieldsToWatch = [
			LOWER_THRESHOLD_FIELD_NAME,
			LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME,
			UPPER_THRESHOLD_FIELD_NAME,
			UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME,
		]
		let fieldsToWatch: string[] = [];

		// TODO: watchers for each field depending on which form type it is
		// watch(() => formValues.value[LOWER_THRESHOLD_FIELD_NAME], handleFormChanges);
		// watch(() => formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME], handleFormChanges);
		// watch(() => formValues.value[UPPER_THRESHOLD_FIELD_NAME], handleFormChanges);
		// watch(() => formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME], handleFormChanges);
		switch (props.formType) {
			case 'assay':
				fieldsToWatch= baseFieldsToWatch.concat([
					PAYABLE_ASSAY_BRACKET_TYPE_FIELD_NAME,
					PAYABLE_ASSAY_RATE_FIELD_NAME,
					PAYABLE_ASSAY_RATE_TYPE_FIELD_NAME,
					PAYABLE_ASSAY_INIT_ADJUST_FIELD_NAME,
					PAYABLE_ASSAY_INIT_ADJUST_UOM_FIELD_NAME,
					PAYABLE_ASSAY_MIN_DEDUCT_FIELD_NAME,
					PAYABLE_ASSAY_MIN_DEDUCT_UOM_FIELD_NAME,
					PAYABLE_ASSAY_MAX_CAP_FIELD_NAME,
					PAYABLE_ASSAY_MAX_CAP_UOM_FIELD_NAME,
				]);
				break;
			case 'charge':
				fieldsToWatch= baseFieldsToWatch.concat([
					TRC_BASE_CHARGE_FIELD_NAME,
					TRC_BASE_CHARGE_ADJUSTMENT_FIELD_NAME,
					TRC_USE_BASE_CHARGE_FIELD_NAME,
					TRC_ESCALATOR_REFERENCE_FIELD_NAME,
					TRC_FOR_EVERY_UNIT_FIELD_NAME,
					TRC_RATE_FIELD_RATE,
				]);
				break;
			case 'penalty':
				fieldsToWatch= baseFieldsToWatch.concat([
					PENALTY_NO_PEANLTY_FIELD_NAME,
					PENALTY_ESCALATOR_REFERENCE_FIELD_NAME,
					PENALTY_FOR_EVERY_UNIT_FIELD_NAME,
					PENALTY_RATE_FIELD_NAME,
				]);
				break;
		}

		fieldsToWatch.forEach(field => {
			watch(() => formValues.value[field], handleFormChanges);
		});

		const RANGE = ref<string | null>('');
		// if (!!formValues.value[LOWER_THRESHOLD_FIELD_NAME] && !!formValues.value[UPPER_THRESHOLD_FIELD_NAME]) {
		// 	RANGE.value += `${formValues.value[LOWER_THRESHOLD_FIELD_NAME]} ${formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME] ? '≤' : '<'} ${SUBJECT} < ${formValues.value[UPPER_THRESHOLD_FIELD_NAME]} ${formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME] ? '≤' : '<'}`;
		// } else if (!!formValues.value[LOWER_THRESHOLD_FIELD_NAME]) {
		// 	RANGE.value += `${formValues.value[LOWER_THRESHOLD_FIELD_NAME]} ${formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME] ? '≤' : '<'} ${SUBJECT}`;
		// }

		const OPERATION = ref<string | null>('');
		function handleFormChanges() {
			switch (props.formType) {
				case FORM_TYPES.ASSAY:
					RANGE.value = generateRangeString(
						formValues.value[LOWER_THRESHOLD_FIELD_NAME], 
						!!formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME], 
						formValues.value[UPPER_THRESHOLD_FIELD_NAME], 
						!!formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME],
						'Commodity Analytical Assay'
					);
					OPERATION.value = generatePayableAssayRateOperation(
						formValues.value[PAYABLE_ASSAY_BRACKET_TYPE_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_RATE_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_RATE_TYPE_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_INIT_ADJUST_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_INIT_ADJUST_UOM_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_MIN_DEDUCT_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_MIN_DEDUCT_UOM_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_MAX_CAP_FIELD_NAME],
						formValues.value[PAYABLE_ASSAY_MAX_CAP_UOM_FIELD_NAME],
					);
					if (RANGE.value !== null && OPERATION.value !== null) emit('input', `${OPERATION.value}${RANGE.value}`);
					break;
				case FORM_TYPES.CHARGE:
					// RANGE.value = generateRangeString(formValues.value[LOWER_THRESHOLD_FIELD_NAME], formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME], formValues.value[UPPER_THRESHOLD_FIELD_NAME], formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME], 'USD/(weight unit)');
					OPERATION.value = generateChargeRateOperation(
						formValues.value[LOWER_THRESHOLD_FIELD_NAME],
						!!formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME],
						formValues.value[UPPER_THRESHOLD_FIELD_NAME],
						!!formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME],
						formValues.value[TRC_BASE_CHARGE_FIELD_NAME],
						formValues.value[TRC_BASE_CHARGE_ADJUSTMENT_FIELD_NAME],
						formValues.value[TRC_USE_BASE_CHARGE_FIELD_NAME],
						formValues.value[TRC_ESCALATOR_REFERENCE_FIELD_NAME],
						formValues.value[TRC_FOR_EVERY_UNIT_FIELD_NAME],
						formValues.value[TRC_RATE_FIELD_RATE],
					);
					if (OPERATION.value !== null) emit('input', `${OPERATION.value}`);
					break;
				case FORM_TYPES.PENALTY:
					console.log(`Penalty form inputs=${JSON.stringify(formValues.value)}`)
					// RANGE.value = generateRangeString(formValues.value[LOWER_THRESHOLD_FIELD_NAME], formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME], formValues.value[UPPER_THRESHOLD_FIELD_NAME], formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME], 'assay unit');
					OPERATION.value = generatePenaltyRateOperation(
						formValues.value[LOWER_THRESHOLD_FIELD_NAME],
						!!formValues.value[LOWER_THRESHOLD_INCLUSIVE_FIELD_NAME],
						formValues.value[UPPER_THRESHOLD_FIELD_NAME],
						!!formValues.value[UPPER_THRESHOLD_INCLUSIVE_FIELD_NAME],
						formValues.value[PENALTY_NO_PEANLTY_FIELD_NAME],
						formValues.value[PENALTY_ESCALATOR_REFERENCE_FIELD_NAME],
						formValues.value[PENALTY_RATE_FIELD_NAME],
					);
					if (OPERATION.value !== null) emit('input', `${OPERATION.value}`);
					break;
			}
		}

		return { 
			handleChange,
			tipMessage
		};

		function handleChange(value: string): void {
			emit('input', value);
		}

		function generateRangeString(lowerThreshold, lowerThresholdInclusive, upperThreshold, upperThresholdInclusive, subject: 'Commodity Analytical Assay' | 'Commodity Price Rate'): string | null {
			let range: string | null = null;
			const comparatorUnit = subject === 'Commodity Analytical Assay' ? 'assay unit(s)' : 'USD/(weight unit)';
			if (lowerThreshold === 0 && isNullUndefinedOrNaN(upperThreshold)) {
				range = '';
			} else if (lowerThreshold === 0 && allNumbersAreNotNullUndefinedOrNaN(upperThreshold)) {
				range = ` when the ${subject} is less than ${upperThreshold} ${comparatorUnit}${upperThresholdInclusive ? ' (incl.)' : ''}`
			} else if (allNumbersAreNotNullUndefinedOrNaN(lowerThreshold, upperThreshold)) {
				range = ` when the ${subject} is between ${lowerThreshold} ${comparatorUnit}${lowerThresholdInclusive ? ' (incl.)' : ''} and ${upperThreshold} ${comparatorUnit}${upperThresholdInclusive ? ' (incl.)' : ''}`;
			} else if (allNumbersAreNotNullUndefinedOrNaN(lowerThreshold) && isNullUndefinedOrNaN(upperThreshold)) {
				range = ` when the ${subject} is greater than ${lowerThreshold} ${comparatorUnit}${lowerThresholdInclusive ? ' (incl.)' : ''}`;
			}
			return range;
		}

		function generatePayableAssayRateOperation(
			bracketType: BRACKET_TYPE,
			rate: number | null,
			rateType: RATE_TYPE,
			initialAdjustment: number | null,
			initialAdjustmentUOM: string | null,
			minDeduction: number | null,
			minDeductionUOM: string | null,
			maxCap: number | null,
			maxCapUOM: string | null,
		): string | null {
			switch (bracketType) {
				case BRACKET_TYPE.BRACKET:
					if (allNumbersAreNotNullUndefinedOrNaN(rate) && isNullUndefinedOrNaN(initialAdjustment)) {
						return `Pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount`;
					} else if (allNumbersAreNotNullUndefinedOrNaN(initialAdjustment, rate)) {
						return `Deduct ${initialAdjustment}${initialAdjustmentUOM ?? ' assay unit(s)'} from the Commodity Analytical Assay, then pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount`;
					}
				case BRACKET_TYPE.MAX_CAP:
					if (allNumbersAreNotNullUndefinedOrNaN(rate, maxCap) && isNullUndefinedOrNaN(initialAdjustment)) {
						return `Pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount with a maximum cap of ${maxCap}${maxCapUOM ?? ' assay unit(s)'}`;
					} else if (allNumbersAreNotNullUndefinedOrNaN(rate, maxCap, initialAdjustment)) {
						return `Deduct ${initialAdjustment}${initialAdjustmentUOM ?? ' assay unit(s)'} from the Commodity Analytical Assay, then pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount with a maximum cap of ${maxCap}${maxCapUOM ?? ' assay unit(s)'}`;
					}
				case BRACKET_TYPE.MIN_DEDUCTION:
					if (allNumbersAreNotNullUndefinedOrNaN(rate, minDeduction) && isNullUndefinedOrNaN(initialAdjustment)) {
						return `Pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount with a minimum deduction of ${minDeduction}${minDeductionUOM ?? ' assay unit(s)'}`;
					} else if (allNumbersAreNotNullUndefinedOrNaN(rate, minDeduction, initialAdjustment)) {
						return `Deduct ${initialAdjustment}${initialAdjustmentUOM ?? ' assay unit(s)'} from the Commodity Analytical Assay, then pay ${rate}${rateType===RATE_TYPE.PERCENTAGE ? '%' : ''} of the amount with a minimum deduction of ${minDeduction}${minDeductionUOM ?? ' assay unit(s)'}`;
					}
			}

			return null;
		}

		function generatePenaltyRateOperation(
			lowerThreshold: number,
			lowerThresholdInclusive: boolean,
			upperThreshold: number | null,
			upperThresholdInclusive: boolean,
			noPenalty: boolean,
			escalatorReference: number | null,
			rate: number | null,
		): string | null {
			// Assuming that penalty will always have the For Every Unit field locked as "above the lower threshold, plus"
			if (noPenalty) {
				return `No penalty applied${generateRangeString(lowerThreshold, lowerThresholdInclusive, upperThreshold, upperThresholdInclusive, 'Commodity Analytical Assay')}`
			} else {
				if (isNullUndefinedOrNaN(escalatorReference)) {
					escalatorReference = 100;
				}
				// Question: will penalty always be applied compared to the lower threshold only? Doesn't make sense to deduct for every unit below the upper threshold when there is no base penalty value to deduct from
				// Never seen it before, no need to worry bout it
				if (allNumbersAreNotNullUndefinedOrNaN(lowerThreshold, rate, escalatorReference) && isNullUndefinedOrNaN(upperThreshold)) {
					return `Penalty of ${formatNumber(rate)} USD/(weight unit) for every ${formatNumber(escalatorReference)} assay unit above ${lowerThreshold} assay unit(s)`;
				} else if (allNumbersAreNotNullUndefinedOrNaN(lowerThreshold, upperThreshold, rate, escalatorReference)) {
					return `Penalty of ${formatNumber(rate)} USD/(weight unit) for every ${formatNumber(escalatorReference)} assay unit between ${lowerThreshold} assay unit(s)${lowerThresholdInclusive ? ' (incl.)' : ''} and ${upperThreshold} assay unit(s)${upperThresholdInclusive ? ' (incl.)' : ''}`;
				}
			}
			return null;
		}

		function generateChargeRateOperation(
			lowerThreshold: number,
			lowerThresholdInclusive: boolean,
			upperThreshold: number | null,
			upperThresholdInclusive: boolean,
			baseCharge: number,
			baseChargeAdjustment: number | null,
			useBaseCharge: boolean,
			escalatorReference: number | null,
			forEveryUnit: FOR_EVERY_UNIT_TYPE,
			rate: number | null,
		): string | null {
			const baseChargeAdjustmentString = !!baseChargeAdjustment ? (baseChargeAdjustment > 0 ? ` plus ${formatNumber(baseChargeAdjustment)} USD/(weight unit)` : ` minus ${formatNumber(Math.abs(baseChargeAdjustment))} USD/(weight unit)`) : '';
			if (useBaseCharge) {
				if (allNumbersAreNotNullUndefinedOrNaN(baseCharge)) {
					return `${formatNumber(baseCharge)} USD/(weight unit)${baseChargeAdjustmentString} ${generateRangeString(lowerThreshold, lowerThresholdInclusive, upperThreshold, upperThresholdInclusive, 'Commodity Price Rate')}`;
				}
			} else {
				if (isNullUndefinedOrNaN(escalatorReference)) {
					escalatorReference = 100;
				}
				if (forEveryUnit === FOR_EVERY_UNIT_TYPE.ABOVE) {
					if (allNumbersAreNotNullUndefinedOrNaN(lowerThreshold, rate, escalatorReference)) {
						return `With a base rate of ${formatNumber(baseCharge)} USD/(weight unit)${baseChargeAdjustmentString}, plus ${formatNumber(rate)} USD/(weight unit) for every ${formatNumber(escalatorReference)} USD/(weight unit) above ${lowerThreshold} USD/(weight unit)`;
					}
				} else if (forEveryUnit === FOR_EVERY_UNIT_TYPE.BELOW) {
					if (allNumbersAreNotNullUndefinedOrNaN(upperThreshold, rate, escalatorReference)) {
						return `With a base rate of ${formatNumber(baseCharge)} USD/(weight unit)${baseChargeAdjustmentString}, deduct ${formatNumber(rate)} USD/(weight unit) for every ${formatNumber(escalatorReference)} USD/(weight unit) below ${upperThreshold} USD/(weight unit)`;
					}
				}
			}
			return null;
		}

		function allNumbersAreNotNullUndefinedOrNaN(...numbers: any[]) {
			return numbers.every(number => number !== null && number !== undefined && !isNaN(number));
		}

		function isNullUndefinedOrNaN(value: any) {
			return value === null || value === undefined || isNaN(value);
		}

		function formatNumber(number: any, decimalPlaces: number = 2, showZero: boolean = true) {
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
	},
});
</script>
