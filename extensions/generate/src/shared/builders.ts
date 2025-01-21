import { Signatory } from "./types"
import { generateImageForPdf } from "./utils";
require('dotenv').config();

export function footer(currentPage: any, pageCount: any, _pageSize: any) {
    return {
        margin: [40, 0, 40, 0],
        stack: [
            ' ',
            { text: 'Page ' + currentPage.toString() + ' of ' + pageCount.toString(), alignment: 'center' },
            { text: 'by Navarch Technologies', alignment: 'right', style: 'footer' }
        ]
    }
}

// export function baseHeader(_currentPage: any, _pageCount :any, _pageSize: any) {
//     return {
//         margin: [40, 60, 40, 0],
//         stack: [
//             {text: `${seller}\n`, style: 'bigfont', bold: true},
//             {text: `${seller_address}\n`, italics: true},
//             {text: `${seller_phone_number}\n\n`, italics: true},
//             {canvas: [{type: 'line', x1: 0, y1: 10, x2: 522, y2: 10, lineWidth: 2},]},
//             {
//                 style: 'tableSmlTopMarginLrgBottomMargin',
//                 table: {
//                     widths: [90, 220, '*', 100],
//                     body: [
//                         [
//                             {text: 'Buyer Information', style: 'tableHeader', decoration: 'underline', colSpan: 3},
//                             '', '', 
//                             {text: 'Shipment Information', style: 'tableHeader', decoration: 'underline', alignment: 'right'},
//                         ],
//                         [
//                             'Buyer:', {text: `${buyer}`, bold: true}, 'Vessel:', {text: `${vessel}`, alignment: 'right'}
//                         ],
//                         ['Seller Contract:', `${contract_ref}`, 'Port of Loading:', {text: `${port_of_loading}`, alignment: 'right'}],
//                         ['Parcel:', `${parcel_ref}`, 'B/L Date:', {text: `${bl_date}`, alignment: 'right'}],
//                         ['', '', 'Port of Discharge:', {text: `${port_of_discharge}`, alignment: 'right'}]
//                     ]
//                 },
//                 layout: 'noBorders'
//             },
//             {canvas: [{type: 'line', x1: 0, y1: 10, x2: 522, y2: 10, lineWidth: 2},]},
//         ]
//     }
// }

export function buildSignatoryBox(signatory: Signatory) {
    // const imagePath = fetchImagePathIfExists(signatory.signature);

    // signatory.signature is a Blob, convert it to base64
    // const signature = signatory.signature ? Buffer.from(signatory.signature).toString('base64') : null;
    const yValue = !!signatory.signature ? 0 : 80;

    return [
        !!signatory.signature ? {
			image: generateImageForPdf(signatory.signature),
            fit: [90, 80], // [width, height]
		} : null,
        {canvas: [{type: 'line', x1: 0, y1: yValue, x2: 100, y2: yValue, lineWidth: 1},]},
        `${signatory.signatoryName}\n${signatory.signatoryTitle}\n${signatory.company}`
    ]
}