const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {

  /* =====================================================
     FEE TYPE
  ===================================================== */
  const FeeType = sequelize.define("FeeType", {
    code: { type: DataTypes.STRING(20), unique: true },
    name: DataTypes.STRING,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    tableName: "fee_type",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  /* =====================================================
     RECEIPT
  ===================================================== */

  const Receipt = sequelize.define("Receipt", {
    date: DataTypes.DATEONLY,
    payment_mode: DataTypes.STRING,
    rec_ref: DataTypes.STRING,
    rec_no: DataTypes.INTEGER,
    receipt_no_full: DataTypes.STRING,
    total_amount: { type: DataTypes.DECIMAL(14,2), defaultValue: 0 },
    remark: DataTypes.TEXT,
    is_cancelled: DataTypes.BOOLEAN,
    cancel_reason: DataTypes.TEXT,
    created_by: DataTypes.INTEGER,
  }, {
    tableName: "receipt",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  });

  const ReceiptItem = sequelize.define("ReceiptItem", {
    amount: DataTypes.DECIMAL(12,2),
    remark: DataTypes.TEXT,
  }, {
    tableName: "receipt_item",
    timestamps: false,
  });

  Receipt.hasMany(ReceiptItem, { foreignKey: "receipt_id", as: "items" });
  ReceiptItem.belongsTo(Receipt, { foreignKey: "receipt_id" });

  ReceiptItem.belongsTo(FeeType, { foreignKey: "fee_type_id" });

  /* =====================================================
     CASH OUTWARD
  ===================================================== */

  const CashOutward = sequelize.define("CashOutward", {
    date: DataTypes.DATEONLY,
    txn_type: DataTypes.STRING, // DEPOSIT / EXPENSE
    ref_no: DataTypes.STRING,
    amount: DataTypes.DECIMAL(14,2),
    remark: DataTypes.TEXT,
    created_by: DataTypes.INTEGER,
  }, {
    tableName: "cash_outward",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  });

  /* =====================================================
     CASH ON HAND
  ===================================================== */

  const CashOnHand = sequelize.define("CashOnHand", {
    date: { type: DataTypes.DATEONLY, unique: true },

    system_cash: DataTypes.DECIMAL(14,2),
    total_deposit: DataTypes.DECIMAL(14,2),
    total_expense: DataTypes.DECIMAL(14,2),
    expected_cash: DataTypes.DECIMAL(14,2),

    physical_cash: DataTypes.DECIMAL(14,2),
    difference: DataTypes.DECIMAL(14,2),

    status: { type: DataTypes.STRING, defaultValue: "OPEN" },
    closed_by: DataTypes.INTEGER,
    closed_at: DataTypes.DATE,
  }, {
    tableName: "cash_on_hand",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  });

  const CashOnHandItem = sequelize.define("CashOnHandItem", {
    denomination: DataTypes.INTEGER,
    is_coin: DataTypes.BOOLEAN,
    qty: DataTypes.INTEGER,
    amount: DataTypes.DECIMAL(12,2),
  }, {
    tableName: "cash_on_hand_item",
    timestamps: false,
  });

  CashOnHand.hasMany(CashOnHandItem, {
    foreignKey: "cash_on_hand_id",
    as: "items",
  });

  CashOnHandItem.belongsTo(CashOnHand, {
    foreignKey: "cash_on_hand_id",
  });

  CashOnHandItem.beforeSave((item) => {
    item.amount = item.denomination * item.qty;
  });

  return {
    FeeType,
    Receipt,
    ReceiptItem,
    CashOutward,
    CashOnHand,
    CashOnHandItem,
  };
};
