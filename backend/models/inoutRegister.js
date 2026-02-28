const { Sequelize, DataTypes, Op } = require("sequelize");
const config = require("../config/db");

const sequelize = new Sequelize(config);

/* =====================================================
   CONSTANTS (CHOICES)
===================================================== */

const TYPE_CHOICES = ["Gen", "Exam", "Enr", "Can", "Doc"];
const REC_SEND_TYPES = ["Internal", "External"];

/* =====================================================
   INWARD REGISTER MODEL
===================================================== */
const InwardRegister = sequelize.define(
  "InwardRegister",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    inward_no: {
      type: DataTypes.STRING(20),
      unique: true,
    },

    inward_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    inward_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [TYPE_CHOICES] },
    },

    inward_from: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    rec_type: {
      type: DataTypes.STRING(20),
      validate: { isIn: [REC_SEND_TYPES] },
    },

    details: DataTypes.TEXT,
    remark: DataTypes.TEXT,
  },
  {
    tableName: "inward_register",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

/* =====================================================
   OUTWARD REGISTER MODEL
===================================================== */
const OutwardRegister = sequelize.define(
  "OutwardRegister",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    outward_no: {
      type: DataTypes.STRING(20),
      unique: true,
    },

    outward_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    outward_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { isIn: [TYPE_CHOICES] },
    },

    outward_to: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    send_type: {
      type: DataTypes.STRING(20),
      validate: { isIn: [REC_SEND_TYPES] },
    },

    details: DataTypes.TEXT,
    remark: DataTypes.TEXT,
  },
  {
    tableName: "outward_register",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

/* =====================================================
   RUNNING NUMBER GENERATOR
   Format: YY/TYPE/0001
===================================================== */
async function generateRunningNo(model, docType, fieldName) {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `${year}/${docType}/`;

  const last = await model.findOne({
    where: {
      [fieldName]: { [Op.like]: `${prefix}%` },
    },
    order: [[fieldName, "DESC"]],
  });

  let nextSeq = 1;

  if (last && last[fieldName]) {
    const parts = last[fieldName].split("/");
    const seq = parseInt(parts[2]);
    if (!isNaN(seq)) nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/* =====================================================
   HOOKS: AUTO NUMBER GENERATION
===================================================== */

InwardRegister.beforeCreate(async (record) => {
  record.inward_no = await generateRunningNo(
    InwardRegister,
    record.inward_type,
    "inward_no"
  );
});

OutwardRegister.beforeCreate(async (record) => {
  record.outward_no = await generateRunningNo(
    OutwardRegister,
    record.outward_type,
    "outward_no"
  );
});

/* =====================================================
   FILTER HELPERS
===================================================== */

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

/* =====================================================
   CONTROLLERS (Express Ready)
===================================================== */

/* -------- CREATE -------- */

async function createInward(req, res) {
  try {
    const record = await InwardRegister.create(req.body);
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function createOutward(req, res) {
  try {
    const record = await OutwardRegister.create(req.body);
    res.json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

/* -------- LIST WITH FILTERS -------- */

async function listInward(req, res) {
  const where = buildDateFilter(req.query, "inward_date");

  if (req.query.type) where.inward_type = req.query.type;
  if (req.query.rec_type) where.rec_type = req.query.rec_type;
  if (req.query.search)
    where.inward_from = { [Op.iLike]: `%${req.query.search}%` };

  const data = await InwardRegister.findAll({ where });
  res.json(data);
}

async function listOutward(req, res) {
  const where = buildDateFilter(req.query, "outward_date");

  if (req.query.type) where.outward_type = req.query.type;
  if (req.query.send_type) where.send_type = req.query.send_type;
  if (req.query.search)
    where.outward_to = { [Op.iLike]: `%${req.query.search}%` };

  const data = await OutwardRegister.findAll({ where });
  res.json(data);
}

/* -------- NEXT NUMBER -------- */

async function getNextInwardNumber(req, res) {
  const type = req.query.type || "Gen";
  const next = await generateRunningNo(
    InwardRegister,
    type,
    "inward_no"
  );
  res.json({ next_no: next });
}

async function getNextOutwardNumber(req, res) {
  const type = req.query.type || "Gen";
  const next = await generateRunningNo(
    OutwardRegister,
    type,
    "outward_no"
  );
  res.json({ next_no: next });
}

/* =====================================================
   EXPORT
===================================================== */

module.exports = {
  sequelize,
  Sequelize,
  Op,
  InwardRegister,
  OutwardRegister,

  createInward,
  createOutward,
  listInward,
  listOutward,
  getNextInwardNumber,
  getNextOutwardNumber,
};
