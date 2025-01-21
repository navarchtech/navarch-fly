import { 
    MethodRanked,
    FetchedWeightLotData,
    MethodDisplayType,
} from "../common/types";

export type WeightLotsTableInterfaceState = {
	isConfirmSavePopupOpen: boolean;
	isConfirmDeletePopupOpen: boolean;
	isConfirmClosePopupOpen: boolean;

    isLoadingWhileAddingNewWeightByMethod: boolean;
    isLoadingWhileEditingLotsViaApi: boolean;

    // TODO: need a type object for the contract data expected from the Contract form
    contractData: ContractDataForWeightLots | null; // Contract data from the API, if null, then the contract is not yet loaded or no contract has been selected in the Parcel form
	editingDisabledReason: string | null; // Reason for disabling editing, if null then editing is enabled
	weightLotsForDrawerDisplay: WeightLotsForDrawerDisplay | null; // Set when user clicks on the table row to display the weight lots of that method in the drawer; null if the drawer is closed (no method selected)
}

export type WeightLotsForDrawerDisplay = {
    methodRank: MethodRanked; // All 'lots' must have the same method as this 'method' property
    lots: FetchedWeightLotData[];
}

type ContractDataForWeightLots = {
    wetWeightUom: string;
    dryWeightUom: string;
    moistureUom: string;
    methods: MethodDisplayType[]; // List of methods available for use, e.g. Inturn, Outturn, Inturn Final, Planned, or Estimated
}