import { CONTRACT_NAME_FIELD_NAME } from "../common/constants";

export function validateContractData(contractData: any) {
    if (!contractData) {
        throw new Error('No contract data found, please ensure the selected parcel has an associated contract');
    }
    if (!contractData[CONTRACT_NAME_FIELD_NAME]) {
        throw new Error('No contract name found for the associated contract of the selected parcel');
    }
}