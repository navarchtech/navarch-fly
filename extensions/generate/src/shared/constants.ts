var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
	}
};

var PdfPrinter = require('pdfmake');
export var printer = new PdfPrinter(fonts);
export var fs = require('fs');

// Data from Directus for the folder ids to store files, beware in case these configs are different in different machines/databases for different clients
export const DIRECTUS_FOLDERS = {
	"Penalty Elements": "090913c3-bbf2-46bc-bf92-1ecc1cc5e710",
	"Assay Exchange": "0af6dcb9-2dc1-4995-8b5e-b9defc64f5fa",
	"Invoices": "155d1307-ac57-428f-9c16-d8142de4b7ce",
	"Cert Of Origin": "2ff2a3a5-ec3a-47e0-b339-fd48164dce6a",
	"Weight & Assay Cert": "8ee45d63-0f84-45da-b6db-3ef17102829d",
	"Cashflow": "a98217ec-7d96-4d15-b729-e831802d6665",
	"Shipment Latest": "d11ee6b7-274d-4806-884a-2e9bc275f44d",
	"Loadport-Disport Comparison": "d6439ce0-fe0e-404a-949c-6958a24e9239"
}

export const styles = {
	footer: {
		fontSize: 9,
		bold: true,
		color: "lightgrey",
	},
	bigfont: {
		fontSize: 15
	},
	midfont: {
		fontSize: 13
	},
	smlfont: {
		fontSize: 9
	},
	xsmlfont: {
		fontSize: 6
	},
	marginBottom5: {
		margin: [0, 0, 0, 5]
	},
	tableSmlTopMarginLrgBottomMargin: {
		margin: [0, 5, 0, 15],
		fontSize: 6
	},
	tableSmlTopMargin: {
		margin: [0, 5, 0, 0],
		fontSize: 6
	},
	tableSmlBottomMargin: {
		margin: [0, 0, 0, 5],
		fontSize: 6
	},
	tableSmlBottomMarginSmlTopMargin: {
		margin: [0, 5, 0, 5],
		fontSize: 6
	},
	tableHeader: {
		bold: true,
		fontSize: 9,
		color: 'black'
	},
	tableHeaderCell: {
		bold: true,
		color: 'black',
		// margin: ['*', '*', '*', '*']
	},
	sectionHeader: {
		bold: true,
		fontSize: 9,
		color: 'black',
		decoration: 'underline'
	},
	bigSectionHeader: {
		margin: [0, 12, 0, 12],
		bold: true,
		fontSize: 15,
		color: 'black',
	},
	bigDocTitleInHeaderWithTop10Padding: {
		margin: [10, 10, 0, 10],
		bold: true,
		fontSize: 15,
		color: 'black',
	},
	bigDocTitleInHeaderWithTop27Padding: {
		margin: [10, 27, 0, 10],
		bold: true,
		fontSize: 15,
		color: 'black',
	},
	bigDocUnderlinedTitleInHeaderWithTop27Padding: {
		margin: [10, 27, 0, 10],
		bold: true,
		fontSize: 15,
		color: 'black',
		decoration: 'underline'
	},
	bigUnderlinedTitleForHeader: {
		margin: [10, 0, 0, 10],
		bold: true,
		fontSize: 15,
		color: 'black',
		decoration: 'underline'
	},
	bigTitleForHeader: {
		margin: [10, 0, 0, 10],
		bold: true,
		fontSize: 15,
		color: 'black',
	},
}