import { LopHoc } from "../models/lopHoc.model.js";

export const khungGioService = {
  list: () => LopHoc.list(),
  setKhungGio: (lop_id, { thoi_gian_bat_dau, thoi_gian_ket_thuc, thu }) =>
    LopHoc.update(lop_id, { thoi_gian_bat_dau, thoi_gian_ket_thuc, thu })
};
