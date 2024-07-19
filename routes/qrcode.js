import express from 'express'
const router = express.Router()

// 查詢菜單品項
import db from '##/configs/mysql.js'
// 串接綠界
import sequelize from '#configs/db.js'
const { Qrcode_Ecpay } = sequelize.models
// line pay使用npm套件
import { createLinePayClient } from 'line-pay-merchant'
// 產生uuid用
import { v4 as uuidv4 } from 'uuid'

// 存取`.env`設定檔案使用
import 'dotenv/config.js'
// 定義安全的私鑰字串
const linePayClient = createLinePayClient({
  channelId: process.env.LINE_PAY_CHANNEL_ID,
  channelSecretKey: process.env.LINE_PAY_CHANNEL_SECRET,
  env: process.env.NODE_ENV,
})

// GET - 得到所有產品資料
router.get('/product', async function (req, res) {
  const [rows] = await db.query(`SELECT * FROM one`)
  const products = rows

  // 標準回傳JSON
  return res.json({
    status: 'success',
    data: {
      products,
    },
  })
})

router.get('/dessert', async function (req, res) {
  const [rows] = await db.query(`SELECT * FROM dessert`)
  const products = rows

  // 標準回傳JSON
  return res.json({
    status: 'success',
    data: {
      products,
    },
  })
})

router.get('/drink', async function (req, res) {
  const [rows] = await db.query(`SELECT * FROM drink`)
  const products = rows

  // 標準回傳JSON
  return res.json({
    status: 'success',
    data: {
      products,
    },
  })
})

router.get('/liquor', async function (req, res) {
  const [rows] = await db.query(`SELECT * FROM liquor`)
  const products = rows

  // 標準回傳JSON
  return res.json({
    status: 'success',
    data: {
      products,
    },
  })
})

// 成立訂單
router.post('/order', async function (req, res) {
  // Assuming the request body contains member_id, amount, and detail
  const { amount, detail } = req.body

  // Check if all required fields are provided
  if (!amount || !detail) {
    return res.status(400).json({
      status: 'error',
      message: 'Missing required fields: amount, detail',
    })
  }

  try {
    // Insert into database
    const insertQuery = `
      INSERT INTO qrcode ( amount, detail)
      VALUES ( ?, ?)
    `
    const values = [amount, detail]
    const [result] = await db.query(insertQuery, values)

    // Return success response
    return res.status(201).json({
      status: 'success',
      data: {
        amount,
        detail,
      },
    })
  } catch (error) {
    console.error('Error inserting order:', error)
    return res.status(500).json({
      status: 'error',
      message: 'Failed to insert order',
    })
  }
})

// 在資料庫建立order資料(綠界)
router.post('/ecpay', async (req, res) => {
  // 會員id由authenticate中介軟體提供
  // const userId = req.user.id

  //產生 orderId與packageId
  const orderId = uuidv4()
  const packageId = uuidv4()

  // 要傳送給line pay的訂單資訊
  const order = {
    orderId: orderId,
    currency: 'TWD',
    amount: req.body.amount,
    packages: [
      {
        id: packageId,
        amount: req.body.amount,
        products: req.body.products,
      },
    ],
    options: { display: { locale: 'zh_TW' } },
  }

  //console.log(order)

  // 要儲存到資料庫的order資料
  const dbOrder = {
    id: orderId,
    user_id: 1,
    amount: req.body.amount,
    status: 'pending', // 'pending' | 'paid' | 'cancel' | 'fail' | 'error'
    order_info: JSON.stringify(order), // 要傳送給line pay的訂單資訊
  }

  // 儲存到資料庫
  await Qrcode_Ecpay.create(dbOrder)

  // 回傳給前端的資料
  res.json({ status: 'success', data: { order } })
})

router.post('/lottery', async function (req, res) {
  const { TradeAmt } = req.body
  if (TradeAmt > 1000) {
    // 可以進行抽獎或其他操作
    res.json({
      message: 'TradeAmt is greater than 1000. Proceed with lottery.',
    })
  } else {
    res.json({
      message:
        'TradeAmt is less than or equal to 1000. Cannot proceed with lottery.',
    })
  }
})
export default router
