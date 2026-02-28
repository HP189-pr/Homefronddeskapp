const db = require("../db");
const { Op } = require("sequelize");

/* =========================
   EXCEL FEE ALIAS NORMALIZER
========================= */

const FEE_ALIAS = {
  examfees: "EXAM_FEES",
  exam fee: "EXAM_FEES",
  rechk: "RECHECK",
  pdf: "PROV_DEGREE_FEES",
  svf: "STU_VER_FEES",
  phd: "PHD_TUTION",
  phdform: "PHD_FORM",
  unidev: "UNI_DEV_FEES",
  kya: "KYA",
  other: "OTHER_FEES",
};

exports.resolveFeeCode = (value) => {
  if (!value) return null;
  const key = value.toLowerCase().trim();
  return FEE_ALIAS[key] || value.toUpperCase();
};

/* =========================
   CREATE RECEIPT
========================= */

exports.createReceipt = async (payload) => {
  const { items, ...main } = payload;

  const receipt = await db.Receipt.create(main);

  let total = 0;

  for (const item of items) {
    const code = exports.resolveFeeCode(item.fee_code);

    const fee = await db.FeeType.findOne({ where: { code } });

    const amount = Number(item.amount);
    total += amount;

    await db.ReceiptItem.create({
      receipt_id: receipt.id,
      fee_type_id: fee.id,
      amount,
    });
  }

  receipt.total_amount = total;
  await receipt.save();

  return receipt;
};

/* =========================
   CASH SUMMARY
========================= */

exports.getCashSummary = async (date) => {
  const receipts = await db.Receipt.sum("total_amount", {
    where: { date },
  });

  const deposits = await db.CashOutward.sum("amount", {
    where: { date, txn_type: "DEPOSIT" },
  });

  const expenses = await db.CashOutward.sum("amount", {
    where: { date, txn_type: "EXPENSE" },
  });

  const expected =
    (receipts || 0) - (expenses || 0) - (deposits || 0);

  return {
    receipts: receipts || 0,
    deposits: deposits || 0,
    expenses: expenses || 0,
    expected,
  };
};
