import { IBalanceKeyWordsType, TMessageType } from './interface';

declare const getBalance: (message: TMessageType, keyWordType?: IBalanceKeyWordsType) => string | null;
export default getBalance;
