import express from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../configs/mysql.js'

const router = express.Router()

// 註冊
router.post('/register', async (req, res) => {
  const { member_name, gender, email, mobile, birthday, password } = req.body
  try {
    // 在這裡可以直接使用明文密碼，不需要加密
    const [result] = await db.query(
      'INSERT INTO member_profile_simple (member_name, gender, email, mobile, birthday, password, create_date) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [member_name, gender, email, mobile, birthday, password]
    )
    res.status(201).json({ message: 'User registered successfully!' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
// 登入
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const [rows] = await db.query(
      'SELECT * FROM member_profile_simple WHERE email = ?',
      [email]
    )
    if (rows.length === 0) {
      return res.status(400).json({ error: '沒找到你的資料' })
    }
    const user = rows[0]
    // 在這裡比較明文密碼
    if (password !== user.password) {
      return res.status(400).json({ error: '密碼有誤' })
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    })
    res.json({ token, memberId: user.id }) // 將 Token 發送給客戶端，同時返回 memberId
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 驗證登入狀態
router.get('/profile', async (req, res) => {
  const token = req.headers['authorization']
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const [rows] = await db.query(
      'SELECT * FROM member_profile_simple WHERE id = ?',
      [decoded.id]
    )
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
