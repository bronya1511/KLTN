import { LopHoc } from "../models/lopHoc.model.js";

export const lopHocService = {
  list: (q) => LopHoc.list(q),
  get: (id) => LopHoc.get(id),
  create: (data) => LopHoc.create(data),
  update: (id, data) => LopHoc.update(id, data),
  remove: (id, options) => LopHoc.remove(id, options),
  students: (id) => LopHoc.students(id),
  attendance: (id, q) => LopHoc.attendance(id, q)
};
