const { Sequelize, DataTypes, Op } = require("sequelize");
const config = require("../config/db"); // your DB config

const sequelize = new Sequelize(config);

/* ======================================================
   INVENTORY ITEM (MASTER)
====================================================== */
const InventoryItem = sequelize.define(
  "InventoryItem",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    item_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: { notEmpty: true },
    },

    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "inventory_item",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

/* ======================================================
   STOCK INWARD
====================================================== */
const InventoryInward = sequelize.define(
  "InventoryInward",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    inward_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },

    details: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "inventory_inward",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    hooks: {
      beforeValidate(instance) {
        if (instance.qty <= 0) {
          throw new Error("Quantity must be positive");
        }
      },
    },
  }
);

/* ======================================================
   STOCK OUTWARD
====================================================== */
const InventoryOutward = sequelize.define(
  "InventoryOutward",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    outward_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    item_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1 },
    },

    receiver: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },

    received_qty: {
      type: DataTypes.INTEGER,
    },

    remark: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "inventory_outward",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    hooks: {
      beforeValidate(instance) {
        if (instance.qty <= 0) {
          throw new Error("Quantity must be positive");
        }
      },
    },
  }
);

/* ======================================================
   ASSOCIATIONS
====================================================== */
InventoryItem.hasMany(InventoryInward, {
  foreignKey: "item_id",
  as: "inward_entries",
});

InventoryItem.hasMany(InventoryOutward, {
  foreignKey: "item_id",
  as: "outward_entries",
});

InventoryInward.belongsTo(InventoryItem, {
  foreignKey: "item_id",
  as: "item",
});

InventoryOutward.belongsTo(InventoryItem, {
  foreignKey: "item_id",
  as: "item",
});

/* ======================================================
   STOCK HELPER FUNCTIONS
====================================================== */

// Get current balance of an item
async function getItemBalance(itemId) {
  const inward =
    (await InventoryInward.sum("qty", { where: { item_id: itemId } })) || 0;

  const outward =
    (await InventoryOutward.sum("qty", { where: { item_id: itemId } })) || 0;

  return inward - outward;
}

// Validate outward stock before saving
async function validateOutwardStock(itemId, qty) {
  const balance = await getItemBalance(itemId);

  if (qty > balance) {
    throw new Error(`Insufficient stock. Available balance: ${balance}`);
  }
}

/* ======================================================
   STOCK SUMMARY (like Django APIView)
====================================================== */
async function getStockSummary() {
  const items = await InventoryItem.findAll({
    order: [["item_name", "ASC"]],
  });

  const summary = [];

  for (const item of items) {
    const inward =
      (await InventoryInward.sum("qty", {
        where: { item_id: item.id },
      })) || 0;

    const outward =
      (await InventoryOutward.sum("qty", {
        where: { item_id: item.id },
      })) || 0;

    summary.push({
      item_id: item.id,
      item_name: item.item_name,
      description: item.description,
      inward_total: inward,
      outward_total: outward,
      balance: inward - outward,
    });
  }

  return summary;
}

/* ======================================================
   EXPORT
====================================================== */
module.exports = {
  sequelize,
  Sequelize,
  Op,
  InventoryItem,
  InventoryInward,
  InventoryOutward,
  getItemBalance,
  validateOutwardStock,
  getStockSummary,
};
