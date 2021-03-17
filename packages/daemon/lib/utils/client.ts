import { Client as WalletClient } from '@liquality/client';
import BitcoinJsWalletProvider from '@liquality/bitcoin-js-wallet-provider';
import BitcoinRpcProvider from '@liquality/bitcoin-rpc-provider';
import { Client as FinanceClient } from '@atomicfinance/client';
import BitcoinCfdProvider from '@atomicfinance/bitcoin-cfd-provider';
import BitcoinDlcProvider from '@atomicfinance/bitcoin-dlc-provider';
import BitcoinWalletProvider from '@atomicfinance/bitcoin-wallet-provider';

import { IArguments, IDB } from './config';

export class Client {
  constructor(db: IDB) {

  }
}

// const bitcoinWithJs = new Client()
// const bitcoinWithJsFinance = new FinanceClient(bitcoinWithJs);
// bitcoinWithJs.finance = bitcoinWithJsFinance
// bitcoinWithJs.addProvider(mockedBitcoinRpcProvider())
// bitcoinWithJs.addProvider(new BitcoinJsWalletProvider(network, generateMnemonic(256), 'bech32'))
// bitcoinWithJs.finance.addProvider(new BitcoinCfdProvider(network, cfdJs));
// bitcoinWithJs.finance.addProvider(new BitcoinDlcProvider(network, cfdDlcJs));
// bitcoinWithJs.finance.addProvider(new BitcoinWalletProvider(network));

// export default class InfoRoutes extends BaseRoutes {
//   constructor(argv: IArguments, db: IDB, logger: Logger) {
//     super(argv, db, logger);
//   }

//   public async getInfo(req: Request, res: Response, next: NextFunction) {
//     const dlcOffers = await this.db.dlc.findDlcOffers();
//     const dlcAccepts = await this.db.dlc.findDlcAccepts();
//     const dlcSigns = await this.db.dlc.findDlcSigns();

//     /**
//      * TODO:
//      * - check if testnet
//      * - block height
//      */

//     return res.json({
//       version,
//       num_dlc_offers: dlcOffers.length,
//       num_dlc_accepts: dlcAccepts.length,
//       num_dlc_signs: dlcSigns.length,
//     });
//   }
// }
