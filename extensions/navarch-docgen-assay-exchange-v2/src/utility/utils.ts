import {
    PARCEL_ASSAY_RESULTS_FIELD_NAME,
    PARCEL_WEIGHT_RESULTS_FIELD_NAME,
    PARCEL_CONTRACT_FIELD_NAME,
    PARCEL_SHIPMENT_CODE_FIELD_NAME,
    PARCEL_COUNTERPARTY_FIELD_NAME,
    PARCEL_BL_DATE_FIELD_NAME,
    PARCEL_ORIGIN_FIELD_NAME,
    PARCEL_DESTINATION_FIELD_NAME,
    METHOD_FIELD_NAME,
    ASSAY_LOT_COMMODITY_FIELD_NAME,
    ASSAY_LOT_SELLER_ASSAY_FIELD_NAME,
    ASSAY_LOT_ASSAY_UOM_FIELD_NAME,
    WEIGHT_LOT_WET_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME,
    WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME,
    COMPANY_NAME_FIELD_NAME,
    COMPANY_LINE_1_FIELD_NAME,
    COMPANY_COUNTRY_FIELD_NAME,
    // COMPANY_PHONE_CODE_FIELD_NAME,
    // COMPANY_PHONE_NUMBER_FIELD_NAME,
    COMPANY_SIGNATORY_NAME_FIELD_NAME,
    COMPANY_SIGNATORY_TITLE_FIELD_NAME,
    COUNTRY_NAME_FIELD_NAME,
    COUNTRY_PHONE_CODE_FIELD_NAME,
    PORT_NAME_FIELD_NAME,
    PORT_COUNTRY_FIELD_NAME,
    CONTRACT_NAME_FIELD_NAME,
    COUNTERPARTY_NAME_FIELD_NAME,
    COMMODITY_NAME_FIELD_NAME,
    COMMODITY_CODE_FIELD_NAME,
} from '../../../shared/common/constants';

import { 
    FetchedAssayLotData, 
    FetchedWeightLotData, 
    FetchedCommodityData,
} from '../../../shared/common/types';

export function validateParcelData(parcelResponse: any) {
    if (!parcelResponse || !parcelResponse.data || !parcelResponse.data.data) {
        throw new Error('No parcel data found, please ensure the selected parcel still exists.');
    }

    if (!parcelResponse.data.data[PARCEL_ASSAY_RESULTS_FIELD_NAME]) {
        throw new Error('No assay data found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_WEIGHT_RESULTS_FIELD_NAME]) {
        throw new Error('No weight data found in selected parcel');
    }

    // vessel is not required, display N/A when absent, will not be checked for in parcelResponse

    if (!parcelResponse.data.data[PARCEL_CONTRACT_FIELD_NAME]) {
        throw new Error('No contract found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_SHIPMENT_CODE_FIELD_NAME]) {
        throw new Error('No shipment code found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_COUNTERPARTY_FIELD_NAME]) {
        throw new Error('No counterparty found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_BL_DATE_FIELD_NAME]) {
        throw new Error('No bill of lading date found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_ORIGIN_FIELD_NAME]) {
        throw new Error('No origin port found in selected parcel');
    }

    if (!parcelResponse.data.data[PARCEL_DESTINATION_FIELD_NAME]) {
        throw new Error('No destination port found in selected parcel');
    }
}

export function validateAssayLotsData(assayLotsResponse: any) {
    if (!assayLotsResponse || !assayLotsResponse.data || !assayLotsResponse.data.data || assayLotsResponse.data.data.length === 0) {
        throw new Error('No assay lots data found, please ensure assay data has been entered for the selected parcel.');
    }

    // check that all assay lots has method, commodity, final assay, and assay uom properties
    assayLotsResponse.data.data.forEach((assayLot: FetchedAssayLotData) => {
        if (!assayLot[METHOD_FIELD_NAME]) {
            throw new Error('Some assays in the selected parcel does not have a method value');
        }

        if (!assayLot[ASSAY_LOT_COMMODITY_FIELD_NAME]) {
            throw new Error('Some assays in the selected parcel does not have a commodity value');
        }

        if (!assayLot[ASSAY_LOT_SELLER_ASSAY_FIELD_NAME]) {
            throw new Error('Some assays in the selected parcel does not have a seller assay value');
        }

        if (!assayLot[ASSAY_LOT_ASSAY_UOM_FIELD_NAME]) {
            throw new Error('Some assays in the selected parcel does not have an assay uom value');
        }
    })
}

export function validateWeightLotsData(weightLotsResponse: any) {
    if (!weightLotsResponse || !weightLotsResponse.data || !weightLotsResponse.data.data || weightLotsResponse.data.data.length === 0) {
        throw new Error('No weight lots data found, please ensure weight data has been entered for the selected parcel.');
    }

    // check that all weight lots has method, wet weight, wet weight uom, dry weight, and dry weight uom properties
    weightLotsResponse.data.data.forEach((weightLot: FetchedWeightLotData) => {
        if (!weightLot[METHOD_FIELD_NAME]) {
            throw new Error('Some weights in the selected parcel does not have a method');
        }

        if (!weightLot[WEIGHT_LOT_WET_WEIGHT_FIELD_NAME]) {
            throw new Error('Some weights in the selected parcel does not have a wet weight value');
        }

        if (!weightLot[WEIGHT_LOT_WET_WEIGHT_UOM_FIELD_NAME]) {
            throw new Error('Some weights in the selected parcel does not have a wet weight UOM');
        }

        if (!weightLot[WEIGHT_LOT_DRY_WEIGHT_FIELD_NAME]) {
            throw new Error('Some weights in the selected parcel does not have a dry weight value');
        }

        if (!weightLot[WEIGHT_LOT_DRY_WEIGHT_UOM_FIELD_NAME]) {
            throw new Error('Some weights in the selected parcel does not have a dry weight UOM');
        }
    })
}

export function validateCommodityMappingData(commodityMappingResponse: any) {
    if (!commodityMappingResponse || !commodityMappingResponse.data || !commodityMappingResponse.data.data || commodityMappingResponse.data.data.length === 0) {
        throw new Error('No commodity mapping data found, please contact Navarch for assistance.');
    }

    // check that all commodities have a name and code
    commodityMappingResponse.data.data.forEach((commodity: FetchedCommodityData) => {
        if (!commodity[COMMODITY_NAME_FIELD_NAME]) {
            throw new Error('Some commodities in the selected parcel does not have a name, please contact Navarch for assistance.');
        }

        if (!commodity[COMMODITY_CODE_FIELD_NAME]) {
            throw new Error('Some commodities in the selected parcel does not have a code, please contact Navarch for assistance.');
        }
    })
}

export function validateCompanyData(companyDataResponse: any) {
    if (!companyDataResponse || !companyDataResponse.data || !companyDataResponse.data.data) {
        throw new Error('No company data found, please ensure that company data has been entered.');
    }

    if (!companyDataResponse.data.data[COMPANY_NAME_FIELD_NAME]) {
        throw new Error('Company name not found.');
    }

    if (!companyDataResponse.data.data[COMPANY_LINE_1_FIELD_NAME]) {
        throw new Error('Please ensure that company address line 1 has been entered.');
    }

    // company address line 2 is optional
    // company city is optional
    // company state is optional

    if (!companyDataResponse.data.data[COMPANY_COUNTRY_FIELD_NAME]) {
        throw new Error('Company base country not found.');
    }

    // company zip is optional

    // if (!companyDataResponse.data.data[COMPANY_PHONE_CODE_FIELD_NAME]) {
    //     throw new Error('Company phone code not found.');
    // }

    // if (!companyDataResponse.data.data[COMPANY_PHONE_NUMBER_FIELD_NAME]) {
    //     throw new Error('Company phone number not found.');
    // }
    
    if (!companyDataResponse.data.data[COMPANY_SIGNATORY_NAME_FIELD_NAME]) {
        throw new Error('Company signatory name not found.');
    }

    if (!companyDataResponse.data.data[COMPANY_SIGNATORY_TITLE_FIELD_NAME]) {
        throw new Error('Company signatory title not found.');
    }
}

export function validatePortData(portResponse: any, portType: 'origin' | 'destination') {
    if (!portResponse || !portResponse.data || !portResponse.data.data) {
        throw new Error(`No ${portType} port data found, please contact Navarch to check that the selected port is still valid.`);
    }

    if (!portResponse.data.data[PORT_NAME_FIELD_NAME]) {
        throw new Error(`Port name for ${portType} port not found, please contact Navarch to check that the selected port is still valid.`);
    }

    if (!portResponse.data.data[PORT_COUNTRY_FIELD_NAME]) {
        throw new Error('Port country for ${portType} port not found, please contact Navarch to check that the selected port is still valid.');
    }
}

export function validateContractData(contractData: any) {
    if (!contractData) {
        throw new Error('No contract data found, please ensure the selected parcel has an associated contract');
    }
    if (!contractData[CONTRACT_NAME_FIELD_NAME]) {
        throw new Error('No contract name found for the associated contract of the selected parcel');
    }
}

export function validateCompanyCountryBaseData(countryBaseData: any) {
    if (!countryBaseData || !countryBaseData.data || !countryBaseData.data.data) {
        throw new Error('No company country base data found, please contact Navarch for assistance.');
    }

    if (!countryBaseData.data.data[COUNTRY_NAME_FIELD_NAME]) {
        throw new Error('Company-based country name not found, please contact Navarch for assistance.');
    }
}

export function validateCompanyCountryCodeData(countryCode: any) {
    if (!countryCode || !countryCode.data || !countryCode.data.data) {
        throw new Error('No company country phone code data found, please contact Navarch for assistance.');
    }

    if (!countryCode.data.data[COUNTRY_PHONE_CODE_FIELD_NAME]) {
        throw new Error('Company-based country phone code not found, please contact Navarch for assistance.');
    }
}

export function validateCounterpartyData(counterpartyResponse: any) {
    if (!counterpartyResponse || !counterpartyResponse.data || !counterpartyResponse.data.data) {
        throw new Error('No counterparty data found, please ensure that counterparty data has been entered.');
    }

    if (!counterpartyResponse.data.data[COUNTERPARTY_NAME_FIELD_NAME]) {
        throw new Error('Counterparty name not found, please ensure that the selected counterparty has a name.');
    }
}