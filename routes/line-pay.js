import express from 'express'
import sequelize from '#configs/db.js'
import authenticate from '#middlewares/authenticate.js'
import { createLinePayClient } from 'line-pay-merchant'
import { v4 as uuidv4 } from 'uuid'
import 'dotenv/config.js'

// 初始化 Express 路由
const router = express.Router()

// 從 Sequelize 配置中獲取資料模型
const { Purchase_Order, Recipient } = sequelize.models

// 設定 Line Pay 客戶端
const linePayClient = createLinePayClient({
  channelId: process.env.LINE_PAY_CHANNEL_ID,
  channelSecretKey: process.env.LINE_PAY_CHANNEL_SECRET,
  env: process.env.NODE_ENV,
})

// 獲取用戶的收件人資料
router.get('/recipients', authenticate, async (req, res) => {
  try {
    // 查詢與用戶ID相關的所有收件人資料
    const recipients = await Recipient.findAll({
      where: { user_id: req.user.id },
    })
    res.json({ status: 'success', data: recipients })
  } catch (error) {
    console.error('Error fetching recipients:', error)
    res
      .status(500)
      .json({ status: 'error', message: 'Error fetching recipients' })
  }
})

// 創建一個新訂單
router.post('/create-order', authenticate, async (req, res) => {
  const userId = req.user.id
  const orderId = uuidv4()
  const packageId = uuidv4()

  // 從請求中獲取地址信息
  const selectedAddress = req.body.selectedAddress
  const address = selectedAddress === 1 ? req.body.address1 : req.body.address2

  // 創建訂單對象
  const order = {
    orderId,
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

  // 資料庫訂單對象
  const dbOrder = {
    id: orderId,
    user_id: userId,
    amount: req.body.amount,
    status: '已付款',
    order_info: JSON.stringify(order),
    order_name1: address.name,
    order_phone1: address.phone,
    order_zip1: address.zip,
    order_county1: address.county,
    order_district1: address.district,
    order_address1: address.address,
  }

  try {
    // 將訂單儲存到資料庫
    await Purchase_Order.create(dbOrder)
    res.json({ status: 'success', data: { order } })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({ message: 'Error creating order' })
  }
})

// 處理付款導向
router.get('/reserve', async (req, res) => {
  if (!req.query.orderId) {
    return res.json({ status: 'error', message: 'order id不存在' })
  }

  const orderId = req.query.orderId

  const redirectUrls = {
    confirmUrl: process.env.REACT_REDIRECT_CONFIRM_URL,
    cancelUrl: process.env.REACT_REDIRECT_CANCEL_URL,
  }

  // 從資料庫獲取訂單資訊
  const orderRecord = await Purchase_Order.findByPk(orderId, { raw: true })

  const order = JSON.parse(orderRecord.order_info)

  try {
    // 發送付款請求到 Line Pay
    const linePayResponse = await linePayClient.request.send({
      body: { ...order, redirectUrls },
    })

    // 更新訂單預約信息
    const reservation = {
      ...JSON.parse(JSON.stringify(order)),
      ...linePayResponse.body.info,
    }

    await Purchase_Order.update(
      {
        reservation: JSON.stringify(reservation),
        transaction_id: reservation.transactionId,
      },
      {
        where: { id: orderId },
      }
    )

    res.redirect(linePayResponse.body.info.paymentUrl.web)
  } catch (e) {
    console.error('Error redirecting to payment:', e)
    res
      .status(500)
      .json({ status: 'error', message: 'Error redirecting to payment' })
  }
})

// 確認支付交易
router.get('/confirm', async (req, res) => {
  const transactionId = req.query.transactionId

  const dbOrder = await Purchase_Order.findOne({
    where: { transaction_id: transactionId },
    raw: true,
  })

  const transaction = JSON.parse(dbOrder.reservation)
  const amount = transaction.amount

  try {
    // 確認支付
    const linePayResponse = await linePayClient.confirm.send({
      transactionId,
      body: {
        currency: 'TWD',
        amount,
      },
    })

    let status = linePayResponse.body.returnCode === '0000' ? '已付款' : 'fail'

    // 更新訂單狀態
    await Purchase_Order.update(
      {
        status,
        return_code: linePayResponse.body.returnCode,
        confirm: JSON.stringify(linePayResponse.body),
      },
      {
        where: { id: dbOrder.id },
      }
    )

    return res.json({ status: 'success', data: linePayResponse.body })
  } catch (error) {
    return res.status(500).json({ status: 'fail', data: error.data })
  }
})

// 檢查交易狀態
router.get('/check-transaction', async (req, res) => {
  const transactionId = req.query.transactionId

  try {
    const linePayResponse = await linePayClient.checkPaymentStatus.send({
      transactionId,
      params: {},
    })

    res.json(linePayResponse.body)
  } catch (e) {
    res.status(500).json({ error: e })
  }
})

export default router
