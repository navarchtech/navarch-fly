export type Signatory = {
    signatoryName: string;
    signatoryTitle: string;
    signature?: ImageData | null;
    company: string;
}

export type ImageData = {
	imageData: string;
	imageType: ImageType;
}

export enum ImageType {
	PNG = 'image/png',
	JPEG = 'image/jpeg',
	JPG = 'image/jpg'
}