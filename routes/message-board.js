import express from 'express'
import moment from 'moment-timezone'
import db from '../configs/mysql.js'
import multer from 'multer'

const dateFormat = 'YYYY-MM-DD'
const router = express.Router()
const upload = multer() // 初始化 multer

const getAllComments = async () => {
  const sql = `SELECT * FROM comments ORDER BY c_id DESC LIMIT 10 `
  const [rows] = await db.query(sql)

  const comments = rows.map((comment) => ({
    ...comment,
    created_at: comment.created_at
      ? moment(comment.created_at).format(dateFormat)
      : 'Invalid Date',
  }))

  return {
    success: true,
    comments,
  }
}

router.get('/', async (req, res) => {
  res.locals.pageName = 'am-list'
  const result = await getAllComments()

  if (req.session && req.session.admin) {
    res.render('address-book/list', result)
  } else {
    res.render('message-board/list', result)
  }
})

router.get('/api', async (req, res) => {
  const result = await getAllComments()
  res.json(result)
})

router.get('/add', (req, res) => {
  res.locals.pageName = 'am-add'
  // 呈現新增資料的表單
  res.render('message-board/add')
})

router.post('/add', upload.none(), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: {},
  }
  console.log('Received data:', req.body) // 打印接收到的數據

  const sql2 = `INSERT INTO comments SET ?`
  const data = { ...req.body, created_at: new Date() }
  console.log('Data to insert:', data) // 打印即將插入的數據

  try {
    const [result] = await db.query(sql2, data)
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.error('SQL Error:', ex) // 紀錄錯誤
    output.error = ex.message // 打印詳細錯誤信息
  }
  res.json(output)
})

export default router
