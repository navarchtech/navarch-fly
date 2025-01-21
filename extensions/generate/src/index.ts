import { defineEndpoint } from '@directus/extensions-sdk';
import { createAssayExchangeCertDocDescription } from './services/assayExchange';
import { createInvoiceDocumentDescription } from './services/invoice';
import { createCertOfOriginDocumentDescription } from './services/certOfOrigin';
import { createWeightAndAssayCertDocumentDescription } from './services/weightAndAssayCert';
import { createPenaltyElementsDocumentDefintion } from './services/penaltyCommodities';
import { createShipmentLatestDocumentDefintion } from './services/shipmentLatest';
import { createLoadportDisportComparisonDocumentDefinition } from './services/loadportDisportCompare';

export default defineEndpoint((router) => {
	router.post('/assay-exchange', (req: any, res: any) => {
		createAssayExchangeCertDocDescription(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Assay Exchange Certificate document. Error=${error}`);
		});
	});
	router.post('/cert-of-origin', (req: any, res: any) => {
		createCertOfOriginDocumentDescription(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Certificate of Origin document. Error=${error}`);
		});
	});
	router.post('/loadport-disport-compare', (req: any, res: any) => {
		createLoadportDisportComparisonDocumentDefinition(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Loadport - Disport Comparison document. Error=${error}`);
		});
	});
	router.post('/shipment-latest', (req: any, res: any) => {
		createShipmentLatestDocumentDefintion(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Shipment Latest document. Error=${error}`);
		});
	});
	router.post('/penalty-elements', (req: any, res: any) => {
		createPenaltyElementsDocumentDefintion(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Penalty Element document. Error=${error}`);
		});
	});
	router.post('/weight-and-assay-cert', (req: any, res: any) => {
		createWeightAndAssayCertDocumentDescription(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Provisional/Final Weight And Assay Certificate document. Error=${error}`);
		});
	});
	router.post('/invoice', (req: any, res: any) => {
		createInvoiceDocumentDescription(req).then((fileData) => {
			res.send(fileData);
		}).catch((error) => {
			console.error(error);
			res.status(400).send(`An error occurred while generating the Invoice document. Error=${error}`);
		});
	});
});
