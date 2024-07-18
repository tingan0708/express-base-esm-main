//import 匯入
import express from 'express' //express套件
import db from '#configs/mysql.js' //連線料庫
import moment from 'moment-timezone'
import upload from '#configs/upload-imgs.js'

const couponsRouter = express.Router()
const dateFormat = 'YYYY-MM-DD'

// restful api -> get- 取得顯示資料 /put - 修改現有數據 / post -新增數據 / delete - 刪除數據
//折價卷-增(送出折價卷時寫入資料表 - 總共有 4種卷
couponsRouter.post('/add/:id', upload.none(), async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: {},
  }

  console.log('Received request with ID:', req.params.id)
  console.log('Request body:', req.body)

  const m_id = req.params.id
  let tomorrow = moment().add(1, 'day').toDate()
  let nextMonth = moment().add(1, 'month').toDate()

  try {
    const sqlTotalAmount = `
      SELECT SUM(amount) AS totalAmount
      FROM purchase_order
      WHERE user_id = ? AND (status = '已付款' OR status = '完成訂單')
    `
    const [amountRows] = await db.query(sqlTotalAmount, [m_id])

    if (amountRows.length === 0) {
      console.error('Member not found')
      res.status(404).json({ error: 'Member not found' })
      return
    }

    let accumulation = amountRows[0].totalAmount || 0
    let cs_id = 0

    if (accumulation >= 20000) {
      cs_id = 4
    } else if (accumulation >= 12000) {
      cs_id = 3
    } else if (accumulation >= 7000) {
      cs_id = 2
    } else if (accumulation >= 5000) {
      cs_id = 1
    } else {
      console.error('Accumulation amount too low:', accumulation)
      res
        .status(400)
        .json({ error: 'Accumulation amount too low', accumulation })
      return
    }

    const [validCsIds] = await db.query('SELECT cs_id FROM coupons_sample')
    const validCsIdSet = new Set(validCsIds.map((row) => row.cs_id))

    if (!validCsIdSet.has(cs_id)) {
      console.error('Invalid cs_id value:', cs_id)
      res.status(400).json({
        error: 'Invalid cs_id value',
        assignedCsId: cs_id,
        validCsIds: Array.from(validCsIdSet),
      })
      return
    }

    const sql = `INSERT INTO coupons (user_id, cs_id, coupons_sentDate, coupons_maxAge) VALUES (?, ?, ?, ?)`
    const data = [m_id, cs_id, tomorrow, nextMonth]

    const [result] = await db.query(sql, data)
    output.result = result
    output.success = !!result.affectedRows
    res.json({ output })
  } catch (error) {
    console.error('Error executing SQL query:', error.message, error.stack)
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message })
  }
})

// 折價卷-查，查詢該會員有無折價卷
couponsRouter.get('/history/:id', async (req, res) => {
  const output = {
    success: false,
    result: [],
  }
  const member_id = req.params.id
  // 假設會員ID從session中獲取，這裡寫死一個會員ID供測試用
  // const member_id = req.session.memberId || null;

  // 更新所有過期的折價券
  const sql2 = `UPDATE coupons SET over_maxAge = true WHERE coupons_maxAge < ?`
  const currentDate = moment().format(dateFormat)

  try {
    await db.query(sql2, [currentDate])

    const sql = `SELECT  user_id,\`name\`,coupons_sentDate,
coupons_maxAge,coupons_sample_price,coupons_explain,
used 
FROM coupons 
JOIN coupons_sample 
ON coupons.cs_id =  coupons_sample.cs_id
JOIN \`user\`  
ON user_id = \`user\`.id
WHERE user_id = 1
ORDER BY coupons_maxAge`

    const [rows] = await db.query(sql, [member_id])

    //將日期格式轉換成不是格林威治時間!!! 使用mySQL2取出資料時都會自動將時間格是更換成原生js的日期格式，所以需要使用套件進行轉換!
    rows.forEach((r) => {
      r.coupons_sentDate = moment(r.coupons_sentDate).format(dateFormat)
      r.coupons_maxAge = moment(r.coupons_maxAge).format(dateFormat)
    })

    if (rows.length > 0) {
      output.success = true
      output.result = rows
    } else {
      output.message = '無任何折價卷!累積消費滿額5000即贈送折價卷500元'
    }
  } catch (error) {
    console.error('Error executing SQL query:', error.message, error.stack)
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message })
    return
  }

  res.json(output)
})

// 折價卷-查，查詢該會員有無折價卷 --給【訂單】的 如果coupons maxAge < moment()查詢的當天代表過期就不顯示於前端
couponsRouter.get('/historyCar/:id', async (req, res) => {
  const output = {
    success: false,
    result: [],
  }
  const member_id = req.params.id
  // 假設會員ID從session中獲取，這裡寫死一個會員ID供測試用
  // const member_id = req.session.memberId || null;

  // 更新所有過期的折價券
  const sql2 = `UPDATE coupons SET over_maxAge = true WHERE coupons_maxAge < ?`
  const currentDate = moment().format(dateFormat)

  try {
    await db.query(sql2, [currentDate])

    const sql = `SELECT coupons_sample.cs_id,user_id,\`name\`,coupons_sentDate,coupons_maxAge,coupons_sample_price,coupons_explain,used FROM coupons JOIN coupons_sample ON coupons.cs_id =  coupons_sample.cs_id JOIN \`user\`ON user_id = \`user\`.id WHERE user_id = ? AND coupons_maxAge > CURDATE()  AND  used = 0 ORDER BY coupons_maxAge`

    const [rows] = await db.query(sql, [member_id])

    //將日期格式轉換成不是格林威治時間!!! 使用mySQL2取出資料時都會自動將時間格是更換成原生js的日期格式，所以需要使用套件進行轉換!
    rows.forEach((r) => {
      r.coupons_sentDate = moment(r.coupons_sentDate).format(dateFormat)
      r.coupons_maxAge = moment(r.coupons_maxAge).format(dateFormat)
    })

    if (rows.length > 0) {
      output.success = true
      output.result = rows
    } else {
      output.message = '無任何折價卷!累積消費滿額5000即贈送折價卷500元'
    }
  } catch (error) {
    console.error('Error executing SQL query:', error.message, error.stack)
    res
      .status(500)
      .json({ error: 'Internal server error', details: error.message })
    return
  }

  res.json(output)
})

//折價卷-改  使用了所以要寫入已使用
//這裡不用給使用者畫面!!!只是改資料庫的部分
couponsRouter.put('/edit/:id/', async (req, res) => {
  const output = {
    success: false,
    bodyData: req.body,
    result: null,
  }

  // 從請求頭中獲取user_id和cs_id
  let user_id = +req.headers['user_id'] || 0
  let cs_id = +req.headers['cs_id'] || 0

  // 輸出日誌來檢查獲取的參數
  console.log(`user_id: ${user_id}, cs_id: ${cs_id}`)

  try {
    // 更新優惠券的 used = 1
    const sql2 = `UPDATE coupons SET used = 1 WHERE user_id = ? AND cs_id = ?`
    const [result] = await db.query(sql2, [user_id, cs_id])

    // 輸出日誌來檢查SQL查詢結果
    console.log(`SQL結果: ${JSON.stringify(result)}`)

    output.result = result
    output.success = !!(result.affectedRows && result.changedRows)
  } catch (error) {
    console.error(error)
    output.error = error.message
  }
  res.json({ output })
})

export default couponsRouter
