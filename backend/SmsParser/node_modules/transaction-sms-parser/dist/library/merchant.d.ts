import { TMessageType } from './interface';

declare const extractMerchantInfo: (message: TMessageType) => {
    merchant: string | null;
    referenceNo: string | null;
};
export default extractMerchantInfo;
