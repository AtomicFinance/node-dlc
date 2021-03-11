import { Application } from 'express';
import WalletRoutes from './wallet';
import { Arguments, DB } from '../../utils/config'
import { ConsoleTransport, Logger, LogLevel } from "@node-lightning/logger";
// import { LessonValidator, lessonSchema } from './validators/lessonValidator';

export class RoutesV1 {
  wallet: WalletRoutes;

  // lessonValidator = new LessonValidator();

  constructor(app: Application, argv: Arguments, db: DB, logger: Logger) {
    this.wallet = new WalletRoutes(argv, db, logger)
    // wallet routes
    app.route('/v1/wallet/create').post(this.wallet.postCreate.bind(this.wallet));
  }
}
