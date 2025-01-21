import {
	CONTRACT_WEIGHT_UOM_FIELD, 
	CONTRACT_MOISTURE_UOM_FIELD, 
	CONTRACT_METHODS_FIELD,
	UNIT_WET_SYMBOL_FIELD,
	UNIT_DRY_SYMBOL_FIELD,
} from '../common/constants';
import { MethodRanked } from '../common/types';

export function validateDryWetWeightUom(dryWetWeightUomResponse: any) {
    console.log(`[validateDryWetWeightUom]`)
    if (!dryWetWeightUomResponse) {
        throw new Error(`Weight uom response is empty, please ensure a valid weight UOM has been selected in the contract`);
    }

    // check if wet_symbol field exists
    if (!dryWetWeightUomResponse[UNIT_WET_SYMBOL_FIELD]) {
        throw new Error(`Contract field 'Weight UOM' may have an invalid 'Wet Symbol' field value of ${dryWetWeightUomResponse.wet_symbol}, please ensure a valid UOM with a proper Wet Symbol is selected`);
    }

    // check if dry_symbol field exists
    if (!dryWetWeightUomResponse[UNIT_DRY_SYMBOL_FIELD]) {
        throw new Error(`Contract field 'Weight UOM' may have an invalid 'Dry Symbol' field value of ${dryWetWeightUomResponse.dry_symbol}, please ensure a valid UOM with a proper Dry Symbol is selected`);
    }
    console.log(`[validateDryWetWeightUom] fetched uom for dry/wet weights are valid`)
}

export function validateContractData(contractDataResponse: any) {
    console.log(`[validateContractData]`)
    if (!contractDataResponse) {
        throw new Error(`Contract data response is empty, please ensure the selected contract for this parcel still exists`);
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