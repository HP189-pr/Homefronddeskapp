const { Op } = require("sequelize");
const {
  InwardRegister,
  OutwardRegister,
} = require("../models/inoutRegister");

/* ================= RUNNING NUMBER ================= */

async function generateRunningNo(model, docType, fieldName) {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `${year}/${docType}/`;

  const last = await model.findOne({
    where: { [fieldName]: { [Op.like]: `${prefix}%` } },
    order: [[fieldName, "DESC"]],
  });

  let next = 1;

  if (last && last[fieldName]) {
    const seq = parseInt(last[fieldName].split("/")[2]);
    if (!isNaN(seq)) next = seq + 1;
  }

  return `${prefix}${String(next).padStart(4, "0")}`;
}

/* ================= CREATE ================= */

async function createInward(data) {
  data.inward_no = await generateRunningNo(
    InwardRegister,
    data.inward_type,
    "inward_no"
  );

  return InwardRegister.create(data);
}

async function createOutward(data) {
  data.outward_no = await generateRunningNo(
    OutwardRegister,
    data.outward_type,
    "outward_no"
  );

  return OutwardRegister.create(data);
}

/* ================= LIST WITH FILTER ================= */

function buildDateFilter(query, field) {
  const where = {};

  if (query.date_from) where[field] = { [Op.gte]: query.date_from };

  if (query.date_to) {
    where[field] = {
      ...(where[field] || {}),
      [Op.lte]: query.date_to,
    };
  }

  return where;
}

async function listInward(query) {
  const where = buildDateFilter(query, "inward_date");

  if (query.type) where.inward_type = query.type;
  if (query.rec_type) where.rec_type = query.rec_type;
  if (query.search)
    where.inward_from = { [Op.iLike]: `%${query.search}%` };

  return InwardRegister.findAll({
    where,
    order: [["inward_date", "DESC"]],
  });
}

async function listOutward(query) {
  const where = buildDateFilter(query, "outward_date");

  if (query.type) where.outward_type = query.type;
  if (query.send_type) where.send_type = query.send_type;
  if (query.search)
    where.outward_to = { [Op.iLike]: `%${query.search}%` };

  return OutwardRegister.findAll({
    where,
    order: [["outward_date", "DESC"]],
  });
}

/* ================= NEXT NUMBER ================= */

async function getNextInwardNumber(type = "Gen") {
  return generateRunningNo(InwardRegister, type, "inward_no");
}

async function getNextOutwardNumber(type = "Gen") {
  return generateRunningNo(OutwardRegister, type, "outward_no");
}

module.exports = {
  createInward,
  createOutward,
  listInward,
  listOutward,
  getNextInwardNumber,
  getNextOutwardNumber,
};
