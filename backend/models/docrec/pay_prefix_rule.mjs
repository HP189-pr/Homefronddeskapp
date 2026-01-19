// backend/models/pay_prefix_rule.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../../db.mjs';

export const PayPrefixRule = sequelize.define('PayPrefixRule', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

  pay_by: { type: DataTypes.ENUM('CASH','BANK','UPI','NA'), allowNull: false },
  year_full: { type: DataTypes.INTEGER, allowNull: true },
  pattern: { type: DataTypes.STRING(50), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

  createdat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  updatedat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pay_prefix_rule',
  timestamps: false,
  indexes: [
    { fields: ['pay_by','year_full'], name: 'idx_payprefix_by_year' },
    { fields: ['is_active'], name: 'idx_payprefix_active' }
  ]
});

export default PayPrefixRule;
