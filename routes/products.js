// backend/routes/products.js

import express from 'express'
const router = express.Router()

// 資料庫使用
import sequelize from '#configs/db.js'
const { Product } = sequelize.models

// 測試連結
router.get('/test', (req, res) => {
  res.send('API is working')
})

// GET 獲得所有資料
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({ raw: true })
    res.json({ status: 'success', data: { products } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ status: 'error', message: '無法查詢到資料' })
  }
})

// 獲得單筆資料
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  try {
    const product = await Product.findByPk(id, { raw: true })
    if (product) {
      res.json({ status: 'success', data: { product } })
    } else {
      res.status(404).json({ status: 'error', message: '商品未找到' })
    }
  } catch (e) {
    console.error(e)
    res.status(500).json({ status: 'error', message: '無法查詢到資料' })
  }
})

export default router
