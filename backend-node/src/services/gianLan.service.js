import { CanhBaoGianLan } from "../models/canhBaoGianLan.model.js";

export const gianLanService = {
  list: (q) => CanhBaoGianLan.list(q)
};
