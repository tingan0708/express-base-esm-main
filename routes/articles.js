import express from 'express'
import moment from 'moment-timezone'
import db from '../configs/mysql.js'
import upload from '../configs/upload-imgs.js'

const dateFormat = 'YYYY-MM-DD'
const router = express.Router()

const getListData = async (req) => {
  let keyword = req.query.keyword || '' // 預設值為空字串
  let birthBegin = req.query.birthBegin || '' // 這個日期之後出生的
  let birthEnd = req.query.birthEnd || '' // 這個日期之前出生的
  const perPage = 20 // 每頁最多有幾筆
  let page = +req.query.page || 1

  if (page < 1) {
    return {
      success: false,
      redirect: `?page=1`,
      info: 'page 值太小',
    }
  }

  let where = 'WHERE 1 '
  if (keyword) {
    where += ` AND (title LIKE ${db.escape(`%${keyword}%`)} OR date LIKE ${db.escape(`%${keyword}%`)})`
  }

  birthBegin = moment(birthBegin)
  if (birthBegin.isValid()) {
    where += ` AND birthday >= '${birthBegin.format(dateFormat)}' `
  }
  birthEnd = moment(birthEnd)
  if (birthEnd.isValid()) {
    where += ` AND birthday <= '${birthEnd.format(dateFormat)}' `
  }

  const sql = `SELECT COUNT(*) totalRows FROM articles ${where}`
  const [[{ totalRows }]] = await db.query(sql)

  let totalPages = 0
  let rows = []
  if (totalRows > 0) {
    totalPages = Math.ceil(totalRows / perPage)
    if (page > totalPages) {
      return {
        success: false,
        redirect: `?page=${totalPages}`,
        info: 'page 值太大',
      }
    }

    const sql2 = `SELECT * FROM articles JOIN key_words ON key_word_id = key_words.k_id ORDER BY a_id DESC LIMIT ${(page - 1) * perPage}, ${perPage}`
    ;[rows] = await db.query(sql2)

    rows.forEach((r) => {
      if (r.date) {
        r.date = moment(r.date).format(dateFormat)
      }
    })
  }

  return {
    success: true,
    totalRows,
    totalPages,
    page,
    perPage,
    rows,
    qs: req.query,
  }
}

router.get('/', async (req, res) => {
  res.locals.pageName = 'ac-list'
  const result = await getListData(req)

  if (result.redirect) {
    return res.redirect(result.redirect)
  }
  if (req.session.admin) {
    res.render('address-book/list', result)
  } else {
    res.render('articles/news', result)
  }
})

router.get('/api', async (req, res) => {
  const result = await getListData(req)
  res.json(result)
})

router.get('/add', (req, res) => {
  res.locals.pageName = 'ac-add'
  res.render('articles/add')
})

router.post('/add', upload.single('photos'), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: {},
  }

  const sql2 = `INSERT INTO articles SET ?`
  const data = { ...req.body }
  if (req.file && req.file.filename) {
    data.photos = req.file.filename
  }

  try {
    const [result] = await db.query(sql2, [data])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.error = ex
  }
  res.json(output)
})

router.get('/api/:a_id', async (req, res) => {
  const { a_id } = req.params
  console.log('Received a_id:', a_id) // 打印 a_id

  // 驗證 a_id 是否為有效的數字
  if (!a_id || isNaN(Number(a_id))) {
    return res.status(400).json({ success: false, message: '無效的文章ID' })
  }

  const sql = 'SELECT * FROM articles WHERE a_id = ?' // 使用參數化查詢

  try {
    const [rows] = await db.query(sql, [a_id])
    console.log('Query result:', rows)

    if (rows.length > 0) {
      res.json({ success: true, article: rows[0] })
    } else {
      res.json({ success: false, message: '文章未找到' })
    }
  } catch (ex) {
    console.error('Error occurred:', ex) // 打印完整的錯誤信息
    res.status(500).json({ success: false, error: ex.message })
  }
})

router.delete('/:sid', async (req, res) => {
  const output = {
    success: false,
    result: {},
  }
  let sid = +req.params.sid || 0
  if (sid) {
    const sql = `DELETE FROM articles WHERE a_id = ?`
    const [result] = await db.query(sql, [sid])
    output.result = result
    output.success = !!result.affectedRows
  }
  res.json(output)
})

router.get('/edit/:sid', async (req, res) => {
  let sid = +req.params.sid || 0
  if (!sid) {
    return res.redirect('/articles')
  }
  const sql = `SELECT * FROM articles WHERE a_id = ?`
  const [rows] = await db.query(sql, [sid])
  if (rows.length === 0) {
    return res.redirect('/articles')
  }
  const row = rows[0]
  if (row.date) {
    row.date = moment(row.date).format(dateFormat)
  }
  res.render('articles/edit', row)
})

router.put('/edit/:sid', upload.single('photos'), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: null,
  }
  let sid = +req.params.sid || 0
  if (!sid) {
    return res.json({ success: false, info: '不正確的主鍵' })
  }
  const sql = 'UPDATE articles SET ? WHERE a_id = ?'
  const data = { ...req.body, photos: req.file.filename }
  try {
    const [result] = await db.query(sql, [data, sid])
    output.result = result
    output.success = !!(result.affectedRows && result.changedRows)
  } catch (ex) {
    output.error = ex
  }
  res.json(output)
})

export default router
