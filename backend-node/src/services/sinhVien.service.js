import * as model from "../models/sinhVien.model.js";

export async function count(keyword = "") {
  return model.count(keyword);
}

export async function list(opts) {
  return model.list(opts);
}

export async function get(mssv) {
  return model.get(mssv);
}

export async function create(data) {
  return model.create(data);
}

export async function update(mssv, data) {
  return model.update(mssv, data);
}

export async function remove(mssv) {
  return model.remove(mssv);
}
