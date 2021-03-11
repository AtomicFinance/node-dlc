import { Application } from 'express';
import WalletRoutes from './wallet';
// import { LessonValidator, lessonSchema } from './validators/lessonValidator';

export class RoutesV1 {
  wallet = new WalletRoutes();

  // lessonValidator = new LessonValidator();

  constructor(app: Application) {
    // wallet routes
    app.route('/v1/wallet/create').post(this.wallet.postCreate);
  }
}