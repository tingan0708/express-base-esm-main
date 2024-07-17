import { DataTypes } from 'sequelize'

export default async function (sequelize) {
  return sequelize.define(
    'Purchase_Order',
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
        comment: 'UUID',
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      payment: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'LINE Pay, 信用卡, ATM',
      },
      shipping: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '7-11, Family Mart, Hi-Life, OK Mart, 郵局, 宅配',
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'pending, paid, fail, cancel, error',
      },
      order_info: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'send to line pay',
      },
      reservation: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'get from line pay',
      },
      confirm: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'confirm from line pay',
      },
      return_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order_name1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_phone1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_zip1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_county1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_district1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_address1: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_name2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_phone2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_zip2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_county2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_district2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      order_address2: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'purchase_order', //直接提供資料表名稱
      timestamps: true, // 使用時間戳
      paranoid: false, // 軟性刪除
      underscored: true, // 所有自動建立欄位，使用snake_case命名
      createdAt: 'created_at', // 建立的時間戳
      updatedAt: 'updated_at', // 更新的時間戳
    }
  )
}
