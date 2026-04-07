import * as sv from "../models/sinhVien.model.js";

export async function create(data) {
  return sv.create(data);
}

export async function list(opts) {
  return sv.list(opts);
}

export async function count() {
  return sv.countAll();
}
