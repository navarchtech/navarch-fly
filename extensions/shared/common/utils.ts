import {
    weekDayNames,
    monthNames,
} from "./constants";
import { 
    FetchedWeightLotData,
    Weight,
    NavarchDocument,
    NavarchImageType,
    NavarchImageData,
    MethodRanked,
} from "./types";
// --------------------------------------------------------------------------------------------
// Utility functions for date formatting and evaluation.
// Already checked against the original implementations in the v1 doc generators.
// --------------------------------------------------------------------------------------------

// function to convert a Date object into DD MMM YYYY format
export function formatDate(date: Date, includeDayOfWeek: boolean = false) {
    const dayOfWeek = (
        includeDayOfWeek &&
        !isNaN(date.getDay())
    ) ? weekDayNames[date.getDay()] : undefined;

    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    return `${day} ${monthNames[monthIndex]} ${year}${!!dayOfWeek ? ` (${dayOfWeek})` : ''}`;
}

// function to convert a Date object into YYYY-MM-DD format
export function formatDateYYYYMMDD(date: Date, withDashSeparator: boolean = true) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${year}${withDashSeparator ? '-' : ' '}${month < 10 ? '0' : ''}${month}${withDashSeparator ? '-' : ' '}${day < 10 ? '0' : ''}${day}`;
}

export function minusBusinessDays(date: Date, days: number, inclusive: boolean = false) {
    const newDate = new Date(date.valueOf());
    let businessDaysLeft = days - (inclusive ? 1 : 0);
    let minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = true;
    while(isWeekday(newDate)) {
        // if the reference date is a weekday, does not take into account public holidays
        newDate.setDate(newDate.getDate() - 1);
        if (minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay) {
            businessDaysLeft -= 1;
            minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = false
        }
    }

    while (businessDaysLeft > 0) {
        // minus one business day at a time
        newDate.setDate(newDate.getDate() - 1);
        if (!isWeekday(newDate)) {
            businessDaysLeft -= 1;
        }
    }
    
    if (newDate.getHours() >= 12) {
        // round up depending on hours due to daylight savings (Dates may be based on locale)
        newDate.setDate(newDate.getDate() + 1);
    }

    while (isWeekday(newDate)) {
        // for when the start date is a non-trading day
        newDate.setDate(newDate.getDate() - 1);
    }
    
    return newDate;
}

function isWeekday(date: Date) {
    return date.getDay() === 0 || date.getDay() === 6;
}

export function addBusinesDays(date: Date, days: number, inclusive: boolean = false) {
    const newDate = new Date(date.valueOf());
    let businessDaysLeft = days - (inclusive ? 1 : 0);
    let minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = true;
    while(isWeekday(newDate)) {
        // if the reference date is a weekday, does not take into account public holidays
        newDate.setDate(newDate.getDate() + 1);
        if (minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay) {
            businessDaysLeft -= 1;
            minusOneBusinessDayAnywayIfFirstDayIsNonTradingDay = false
        }
    }

    while (businessDaysLeft > 0) {
        // minus one business day at a time
        newDate.setDate(newDate.getDate() + 1);
        if (!isWeekday(newDate)) {
            businessDaysLeft -= 1;
        }
    }
    
    if (newDate.getHours() >= 12) {
        // round up depending on hours due to daylight savings (Dates may be based on locale)
        newDate.setDate(newDate.getDate() + 1);
    }

    while (isWeekday(newDate)) {
        // for when the end date is a non-trading day
        newDate.setDate(newDate.getDate() + 1);
    }
    
    return newDate;
}

// function to get the first date of the month of a given date plus a number of months
export function getFirstDateOfMonthPlusMonths(date: Date, months: number) {
    const newDate = new Date(date.valueOf());
    newDate.setMonth(newDate.getMonth() + months, 1);
    return newDate;
}

// function to get the last date of the month of a given date plus a number of months
export function getLastDateOfMonthPlusMonths(date: Date, months: number) {
    const newDate = new Date(date.valueOf());
    // gets the '0th day' of the month after the target month to get the last day of the target month
    newDate.setMonth(newDate.getMonth() + months + 1, 0);
    return newDate;
}



// --------------------------------------------------------------------------------------------
// Document/image fetching/saving/download/view functions
// Already checked against the original implementations in the 7 v1 doc generators, except for cashflow generator that doesn't use these
// --------------------------------------------------------------------------------------------

export async function uploadGeneratedDoc(fileData: any, api: any) {
    if (!fileData) {
        console.error(`[uploadGeneratedDoc] fileData is empty`);
        throw new Error('A failure occured while trying to upload the generated document, no file data found. Please try again.');
    }
    const formData = convertJsonToFormData(fileData);

    const uploadedFileData = await api.post('/files', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });

    if (uploadedFileData.status !== 200) {
        console.error(`[uploadGeneratedDoc] uploadedFileData status: ${uploadedFileData.status}`);
        throw new Error('A failure occured while trying to upload the generated document. Please try again.');
    }

    return uploadedFileData.data.data['id'];
}

function base64ToBlob(base64: any, mimeType: string) {
    // Decode base64 string
    const byteCharacters = atob(base64); // TODO: this is deprecated, find an alternative for this, can't use Buffer.from in a Vue component for pdf files but I can seemingly use it for image files in the v1 doc generators

    // Create an ArrayBuffer of the correct length
    const arrayBuffer = new ArrayBuffer(byteCharacters.length);

    // Create a view of the ArrayBuffer
    const uint8Array = new Uint8Array(arrayBuffer);

    // Fill the Uint8Array with the decoded data
    for (let i = 0; i < byteCharacters.length; i++) {
        uint8Array[i] = byteCharacters.charCodeAt(i);
    }

    // Create a Blob from the Uint8Array
    const blob = new Blob([uint8Array], {type: mimeType});

    return blob;
}

function convertJsonToFormData(json: any) {
    console.log('[convertJsonToFormData] json=', JSON.stringify(json))
    const formData = new FormData();
    for (let key in json) {
        if (key !== 'file') {
            formData.append(key, json[key]);
        }
    }

    // for some reason, the 'file' field must come last or any other fields that come after it will be sent but not processed by the server
    const base64String = json['file'];
    const mimeType = 'application/pdf';
    const blob = base64ToBlob(base64String, mimeType);
    formData.append('file', blob, json['filename_download']);
    return formData;
}

export function buildFunctionGetFolderId(folderName: NavarchDocument, api: any) {
    return async () => {
        const folderResponse = await api.get(`/folders?filter[name][_eq]=${encodeURI(folderName.toString())}`);

        if (folderResponse.status === 200 && !!folderResponse.data && !!folderResponse.data.data) {
            if (folderResponse.data.data.length === 0) {
                const response = await api.post('/folders', {
                    name: folderName.toString(),
                });
            
                return response.data.data.id;
            }
            return folderResponse.data.data[0].id;
        }
        return null;
    }
}

export function buildFunctionDownloadDoc(props: any, api: any, fallbackDocName: string) {
    return async (docID?: string): Promise<void> => {
        // open the invoice in a new tab
        const documentID = docID ?? props.value['doc_name'];
        console.log(`[downloadPdf] doc ID: ${documentID}`);
        if (!documentID) {
            throw new Error('No document ID found, please ensure the document has been generated');
        }

        try {
            const filenameDownloadResponse = await api.get(`/files/${documentID}`);
            const filenameDownload = filenameDownloadResponse.data.data['filename_download'];
            const response = await api.get(`/assets/${documentID}`, {
                responseType: 'arraybuffer' // this is required or the downloaded pdf will be blank
            });

            // Convert response.data to Blob
            const blob = new Blob([response.data], { type: 'application/pdf' });

            // Create a URL for the Blob
            const url = URL.createObjectURL(blob);

            // Create a link element
            const link = document.createElement('a');
            link.href = url;
            link.download = filenameDownload ?? fallbackDocName;

            // Append the link to the document
            document.body.appendChild(link);

            // Trigger the download
            link.click();

            // Remove the link from the document
            document.body.removeChild(link);

            // Revoke the object URL
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error(`[downloadPdf] error: ${error}`);
            throw new Error('Failed to fetch the document, please try again');
        }
    }
}

export function buildFunctionCopyDocForm(formValues: any, api: any, collectionName: string, savedDocFieldName: string) {
    return async () => {
        const { id, user_created, date_created, user_updated, date_updated, ...requestBody } = formValues;
        requestBody[savedDocFieldName] = null; // clear the saved doc field
        const copyResponse = await api.post(`/items/${collectionName}`, requestBody);

        if (copyResponse.status !== 200) {
            console.error(`[duplicate doc] copy response status: ${copyResponse.status}`);
            throw new Error(`Failed to duplicate assay exchange with status ${copyResponse.status}`);
        }

        window.open(`/admin/content/${collectionName}/${copyResponse.data.data.id}`);
    }
}

export async function fetchImage(assetId: string, api: any, Buffer: any): Promise<NavarchImageData | null> {
    if (!!assetId) {
        const imageData = await api.get(`/assets/${assetId}`, { responseType: 'arraybuffer' });
        // Convert the response data to a Buffer
        const imageBuffer = Buffer.from(imageData.data, 'binary');
        // Determine the image type
        const imageType = imageData.headers['content-type'] as NavarchImageType;
        if (Object.values(NavarchImageType).includes(imageType)) {
            return {
                // Convert the buffer to a base64 string
                imageData: imageBuffer.toString('base64'),
                imageType
            };
        }
    }
    return null;
}

// --------------------------------------------------------------------------------------------
// Utility function from Cert of Origin doc generator v1 that can be generic
// --------------------------------------------------------------------------------------------
export function evaluateWeights(lots: FetchedWeightLotData[]): Weight[] {
    const weightLotsGroupedByMethod: { [key: string]: FetchedWeightLotData[] } = {};
    for(const lot of lots) {
        if (!weightLotsGroupedByMethod[lot.method]) {
            console.log(`adding method ${lot.method} to weightData object`)
            weightLotsGroupedByMethod[lot.method] = [];
        }
        // the property names in 'weightData' match the string values of corresponding MethodEnum enums
        (weightLotsGroupedByMethod[lot.method] as FetchedWeightLotData[]).push(lot);
    }
    const weights: Weight[] = [];
    // for(const method in weightData) {
    for(const method of Object.keys(weightLotsGroupedByMethod)) {
        if (!weightLotsGroupedByMethod[method]) {
            console.log(`method=${method} does not exist in weightData object`)
            // only push weight lots to 'weights' if there exists lots for a given method
            continue;
        }
        console.log(`adding lots and other values to weights for method=${method}`)
        const weight = evaluateWeightData(weightLotsGroupedByMethod[method]);

        if (!!weight) {
            weights.push(weight);
        }
    }

    return weights;
}

function evaluateWeightData(weightLots: FetchedWeightLotData[]): Weight | null {
    console.log('[evaluateWeightData]');
    if (weightLots.length === 0) {
        return null;
    }
    const dryWeight = evaluateSumOfNumericalProperty(weightLots, 'dry_weight');
    const wetWeight = evaluateSumOfNumericalProperty(weightLots, 'wet_weight');
    return {
        method: extractPropertyOfFirstItem(weightLots, 'method'),
        lots: weightLots,
        dryWeightUom: extractPropertyOfFirstItem(weightLots, 'dry_weight_uom'),
        wetWeightUom: extractPropertyOfFirstItem(weightLots, 'wet_weight_uom'),
        dryWeight: dryWeight,
        wetWeight: wetWeight,
        moisture: (wetWeight - dryWeight) / wetWeight * 100,
    } as Weight
}

export function evaluateSumOfNumericalProperty(lots: FetchedWeightLotData[], field: 'wet_weight' | 'dry_weight' | 'moisture'): number {
    return lots.reduce((sum, lot) => {
        // event NaN values are treated as 0
        return sum + (parseFloat(lot[field] ?? '0') ?? 0);
    }, 0);
}

export function extractPropertyOfFirstItem(lots: FetchedWeightLotData[], field: 'wet_weight_uom' | 'dry_weight_uom' | 'method'): string | null {
    if (lots.length === 0 || !lots[0]) {
        return null;
    }
    return lots[0][field] ?? null;
}


// --------------------------------------------------------------------------------------------
// Utility functions for Weight Lots table interface V2
// --------------------------------------------------------------------------------------------

export function formatEnumForReadability(enumValue: string): string {
    // Replaces underscore with hyphen and splits the string through uppercase words with a space
    return enumValue
        .replace(/_/g, '-')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .split(/(?=[A-Z])/)
        .join(' ');
}

export function convertMethodDisplayTypeToMethodRanked(methodString: string): MethodRanked {
    switch(methodString) {
        case 'Inturn':
            return MethodRanked.Inturn;
        case 'Outturn':
            return MethodRanked.Outturn;
        case 'Inturn Final':
            return MethodRanked.InturnFinal;
        case 'Planned':
            return MethodRanked.Planned;
        case 'Estimated':
            return MethodRanked.Estimated;
        default:
            throw new Error(`Invalid method type ${methodString}, please contact Navarch for support`);
    }
}

export function roundNumber(num: any, decimalPlaces: number = 2, roundLikePositiveIfNegative: boolean = false): number | null {
    if (num === null || num === undefined || isNaN(num)) {
        return null;
    }
    const isNegativeAndRoundAsIfPositive = roundLikePositiveIfNegative && num < 0;
    if (isNegativeAndRoundAsIfPositive) {
        num = num * -1;
    }
    // round off number to decimalPlaces decimal places
    return Math.round(num * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces) * (isNegativeAndRoundAsIfPositive ? -1 : 1);
}

export function formatNumber(number: any, decimalPlaces: number = 2, showZero: boolean = true) {
    if (isNaN(number) || number === null || number === undefined) {
        return '-';
    }
    // round off number to decimalPlaces decimal places
    const roundedNumber = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

    // convert number to string and split into array of integer and decimal parts
    const [integerPart, decimalPart] = roundedNumber.toString().split('.');
    // convert integer part to string with digit group separator
    const formattedIntegerPart = !!integerPart ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : 0;
    if (!decimalPart && !showZero) {
        // if there is no decimal part, return formatted integer part
        return formattedIntegerPart;
    }

    // fill with zeroes to the right of decimal point to specified number of decimal places, if decimal part is not defined, let it start with an empty string and be padded
    const formattedDecimalPart = (decimalPart ?? '').padEnd(decimalPlaces, '0');

    // return formatted number
    return `${formattedIntegerPart}.${formattedDecimalPart}`;
}