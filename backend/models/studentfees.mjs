module.exports = (sequelize, DataTypes) => {
  const StudentFeesLedger = sequelize.define(
    "StudentFeesLedger",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      // 🔗 Enrollment Link
      enrollment_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: "enrollments",
          key: "id",
        },
      },

      // 📄 Receipt Info
      receipt_no: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },

      receipt_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },

      // 🏷️ Logical grouping
      term: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment:
          "e.g. 1st Term, 2nd Term, Extension-1, Exam Fee",
      },

      // 💰 Amount
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
      },

      // 📝 Remark
      remark: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // 🔐 Audit
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "student_fees_ledger",
      timestamps: false,
      indexes: [
        { fields: ["enrollment_id"] },
        { fields: ["receipt_date"] },
        { fields: ["term"] },
      ],
      defaultScope: {
        order: [
          ["receipt_date", "DESC"],
          ["id", "DESC"],
        ],
      },
    }
  );

  StudentFeesLedger.associate = (models) => {
    StudentFeesLedger.belongsTo(models.Enrollment, {
      foreignKey: "enrollment_id",
      as: "enrollment",
      onDelete: "CASCADE",
    });

    StudentFeesLedger.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
  };

  return StudentFeesLedger;
};
