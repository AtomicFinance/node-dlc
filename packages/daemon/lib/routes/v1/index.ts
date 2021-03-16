import { Logger } from "@node-lightning/logger";
import { Application } from "express";
import { IArguments, IDB } from "../../utils/config";
import InfoRoutes from "./getinfo";
import WalletRoutes from "./wallet";

export class RoutesV1 {
  public wallet: WalletRoutes;
  public info: InfoRoutes;

  constructor(app: Application, argv: IArguments, db: IDB, logger: Logger) {
    this.wallet = new WalletRoutes(argv, db, logger);
    this.info = new InfoRoutes(argv, db, logger);

    app.route("/v1/wallet/create").post(this.wallet.postCreate.bind(this.wallet));
    app.route("/v1/getinfo").get(this.info.getInfo.bind(this.info));
  }
}
