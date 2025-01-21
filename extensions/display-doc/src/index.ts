import { defineEndpoint } from '@directus/extensions-sdk';
var fs = require('fs');
require('dotenv').config();

// use encodeURIComponent when building the link, and decodeURIComponent when reading the link

export default defineEndpoint((router) => {
	// Notes: remove use of STORAGE_LOCAL_ROOT, and replace with direct path to the file; See git commit message 180424-03
    // const STORAGE_LOCAL_ROOT = process.env.STORAGE_LOCAL_ROOT || 'uploads';
	router.get('/', (req: any, res: any) => {
		const pdfPath = `${decodeURIComponent(req.query.docname)}`;
		console.log(`Fetching document from path=${pdfPath}`);
		// Check if the PDF file exists
		if (!fs.existsSync(pdfPath)) {
			res.status(404).send('PDF file not found');
			return;
		}
	
		// Set the response headers
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'inline; filename=sample.pdf');
	
		// Read and stream the PDF file to the response
		const stream = fs.createReadStream(pdfPath);
		stream.pipe(res);
	});
});
