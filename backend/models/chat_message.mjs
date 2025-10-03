// backend/models/chat_message.mjs
import { DataTypes } from 'sequelize';
import { sequelize } from '../db.mjs';

export const ChatMessage = sequelize.define('ChatMessage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  from_userid: { type: DataTypes.INTEGER, allowNull: false },
  to_userid: { type: DataTypes.INTEGER, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: true },
  file_name: { type: DataTypes.STRING, allowNull: true },
  file_path: { type: DataTypes.STRING, allowNull: true }, // relative under media/chats
  file_mime: { type: DataTypes.STRING, allowNull: true },
  file_size: { type: DataTypes.INTEGER, allowNull: true },
  createdat: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // Per-user hide flags (clear history per side without deleting data)
  hide_for_sender: { type: DataTypes.BOOLEAN, defaultValue: false },
  hide_for_receiver: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'chat_messages',
  timestamps: false,
});

export default ChatMessage;
