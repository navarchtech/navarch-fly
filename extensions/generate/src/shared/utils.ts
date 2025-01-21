import { randomUUID } from "crypto";
import { printer, fs } from "./constants";
import { ImageData } from "./types";
// import { useApi } from "@directus/extensions-sdk";
require('dotenv').config();

// const api = useApi();

export function generatePdf(documentDefinition: any, downloadName: string, title: string | null = null, folderID: string | null = null): Promise<any> {
    var pdfDoc = printer.createPdfKitDocument(documentDefinition);
    const generatedFileId = randomUUID();

	// Notes: remove use of STORAGE_LOCAL_ROOT, and replace with direct path to the file; See git commit message 180424-03
    const STORAGE_LOCATIONS = process.env.STORAGE_LOCATIONS || 'local';
    console.log(`[generatePdf] generated doc ${generatedFileId} will be stored to ${STORAGE_LOCATIONS}`);
    if (STORAGE_LOCATIONS === 'local') {
        pdfDoc.pipe(fs.createWriteStream(`uploads/formatting/${downloadName}.pdf`));
        pdfDoc.end();
        return Promise.resolve(undefined); // Will cause local running to not upload the file to GCS
    }

    // generate file buffer
    return new Promise((resolve, reject) => {
        // var pdfDoc = printer.createPdfKitDocument(documentDefinition);
        const chunks: any[] = [];
        pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
        pdfDoc.on('end', () => {
            // const date = new Date();
            const data = Buffer.concat(chunks);
            const base64Data = data.toString('base64');
            console.log(`folder=${folderID}`)
            const fileData = {
                id: generatedFileId,
                file: base64Data,
                filename_disk: `${generatedFileId}.pdf`,
                filename_download: `${downloadName}.pdf`,
                title: title ?? downloadName,
                type: "application/pdf",
                storage: "gcs", // hardcoded to gcs for now, make it dynamic based on env used in the future, other option is 'local'
                folder: folderID,
                // uploaded_by: "307bde19-c4d6-443b-9929-c34e2ee64494",
                // uploaded_on: date.toISOString(),
                // modified_by: "307bde19-c4d6-443b-9929-c34e2ee64494",
                // modified_on: date.toISOString(),
                charset: null,
                filesize: base64Data.length,
                width: null,
                height: null,
                duration: null,
                embed: null,
                description: null,
                location: null,
                tags: null,
                metadata: null
            };
            resolve(fileData);
        });
        pdfDoc.on('error', reject);
        pdfDoc.end();
    });
}

export function replaceSpacesWithUnderscore(input: string | number) {
    // if input is a number, convert it to a string
    if (typeof input === 'number') {
        input = input.toString();
    }
    // a function that replaces all space characters with a - in an input string
    if (!input) {
        return 'undefined';
    }
	return input.replace(/\s/g, '_');
};

export function formatNumber(number: any, decimalPlaces: number = 4, showZero: boolean = true) {
    if (isNaN(number) || number === null) {
        return '-';
    }
    // round off number to decimalPlaces decimal places
    const roundedNumber = Math.round(number * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);

    // convert number to string and split into array of integer and decimal parts
    const [integerPart, decimalPart] = roundedNumber.toString().split('.');
    // convert integer part to string with digit group separator
    const formattedIntegerPart = (integerPart ?? '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (!decimalPart && !showZero) {
        // if there is no decimal part, return formatted integer part
        return formattedIntegerPart;
    }

    // fill with zeroes to the right of decimal point to specified number of decimal places, if decimal part is not defined, let it start with an empty string and be padded
    const formattedDecimalPart = (decimalPart ?? '').padEnd(decimalPlaces, '0');

    // return formatted number
    return `${formattedIntegerPart}.${formattedDecimalPart}`;
}

export function formatNumberAndBracketIfNegative(num: string | number, decimalPlaces: number = 2) {
    let numberString;
    if (typeof num === 'number') {
        numberString = formatNumber(num, decimalPlaces);
    } else {
        numberString = num;
    }
    if (!numberString || numberString === '-') {
        return '-';
    }
    if (numberString.startsWith('-')) {
        return `(${numberString.slice(1)})`;
    }
    return numberString;

}

// export function fetchImagePathIfExists(imageData: string): string | null {
//     if (!imageData) {
//         return null;
//     }
// 	// Notes: remove use of STORAGE_LOCAL_ROOT, and replace with direct path to the file; See git commit message 180424-03
//     // const STORAGE_LOCAL_ROOT = process.env.STORAGE_LOCAL_ROOT || 'uploads';
//     // check if a file exists in ${STORAGE_LOCAL_ROOT} folder with name imageName, it can have different image file types
//     let imageFileType;
//     if (!imageData) {
//         console.log('No image found');
//     } else if (fs.existsSync(`${imageData}.png`)) {
//         console.log(`searching for ${imageData}.png`);
//         imageFileType = 'png';
//     } else if (fs.existsSync(`${imageData}.jpg`)) {
//         console.log(`searching for ${imageData}.jpg`);
//         imageFileType = 'jpg';
//     } else {
//         console.log(`No image found for ${imageData}`);
//     }
//     return !!imageFileType ? `${imageData}.${imageFileType}` : null;
// }

export function generateImageForPdf(image: ImageData): string | null {
    if (!image) {
        return null;
    }

    return `data:${image.imageType};base64,${image.imageData}`;
}

export function getCurrentDateTime() {
    const date = new Date();
    // return local date time in ISO format
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);
    // Get local timezone GMT offset in hours
    const offsetHours = (date.getTimezoneOffset() / 60)*(-1);

    // replace : with '' and add GMT offset
    return `${isoLocal}GMT${offsetHours > 0 ? '+' : ''}${offsetHours}`.replace(/:/g, '');
}

export function formatDateInIso(dateString: string) {
    const date =  new Date(dateString);
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 10);

    // replace : with '' and add GMT offset
    return isoLocal;
}

export function bottomBorderForTableContentWithColumnsAmount(columnAmount: number) {
    // return an array of { text: '', border: [false, false, false, true] } with columnAmount elements
    return Array(columnAmount).fill({ text: '', border: [false, false, false, true] });
}

export function bottomBorderForRightMostCellWithColumnsAmount(columnAmount: number) {
    // return an array of empty string but the last element is { text: '', border: [false, false, false, true] }
    return Array(columnAmount - 1).fill('').concat({ text: '', border: [false, false, false, true] });
}