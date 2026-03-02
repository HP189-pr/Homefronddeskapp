// backend/models/chat_message.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  from_userid: { type: DataTypes.INTEGER, allowNull: false, field: 'from_user_id' },
  to_userid: { type: DataTypes.INTEGER, allowNull: false, field: 'to_user_id' },
  text: { type: DataTypes.TEXT, allowNull: true },
  file_name: { type: DataTypes.STRING, allowNull: true },
  file_path: { type: DataTypes.STRING, allowNull: true }, // relative under media/chats
  file_mime: { type: DataTypes.STRING, allowNull: true },
  file_size: { type: DataTypes.BIGINT, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Per-user hide flags (clear history per side without deleting data)
  hide_for_sender: { type: DataTypes.BOOLEAN, defaultValue: false },
  hide_for_receiver: { type: DataTypes.BOOLEAN, defaultValue: false },
  delivered: { type: DataTypes.BOOLEAN, allowNull: true },
  seen: { type: DataTypes.BOOLEAN, allowNull: true },
  file_delivered: { type: DataTypes.BOOLEAN, defaultValue: false },
  file_downloaded: { type: DataTypes.BOOLEAN, defaultValue: false },
  downloaded_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'chat_messages',
  timestamps: false,
});

export default ChatMessage;
