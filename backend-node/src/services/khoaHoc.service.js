import { SinhVien } from "../models/sinhVien.model.js";

export const khoaHocService = {
  async setKhoaHocChoSinhVien(sinh_vien_id, khoa_hoc) {
    return SinhVien.update(sinh_vien_id, { khoa_hoc });
  }
};
