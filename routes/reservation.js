import express from 'express'
const router = express.Router()
import db from '../configs/mysql.js' // MySQL 連接模組

//查詢所有預約資料
router.get('/reservations', async (req, res) => {
  try {
    const query = `
      SELECT rs.id, rs.member_id, mps.member_name, mps.mobile, rs.numberOfPeople, 
             rs.selectedDate, rs.selectedTime, rs.menuSelect, rs.selectedTableType, 
             rs.textAreaInput, rs.created_at
      FROM reservationSimple rs
      JOIN member_profile_simple mps ON rs.member_id = mps.id
    `
    const [rows] = await db.execute(query)

    const reservationsWithSteps = rows.map((reservation) => ({
      ...reservation,
      currentStep: 1, // 初始化每筆訂單的 currentStep
    }))

    res.status(200).json(reservationsWithSteps)
  } catch (error) {
    console.error('Error fetching reservations:', error)
    res.status(500).send('伺服器錯誤')
  }
})

// 查詢單筆特定預約資料
// 查詢特定會員的預約
router.get('/reservations/:memberId', async (req, res) => {
  const memberId = req.params.memberId

  try {
    const query = 'SELECT * FROM reservationSimple WHERE member_id = ?'
    const [results] = await db.query(query, [memberId])

    if (results.length > 0) {
      res.status(200).json(results)
    } else {
      res.status(404).json({ message: '找不到此會員的預約' })
    }
  } catch (error) {
    console.error('Error fetching reservations:', error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
})
// 查詢特定會員的預約並排序後取離自己最近的第一筆資料
router.get('/reservationsOrder/:memberId', async (req, res) => {
  const memberId = req.params.memberId

  try {
    const query =
      'SELECT * FROM reservationSimple WHERE member_id = ? ORDER BY ABS(DATEDIFF(selectedDate, CURDATE())) LIMIT 1;'
    const [results] = await db.query(query, [memberId])

    if (results.length > 0) {
      res.status(200).json(results[0]) // 返回找到的第一筆資料
    } else {
      res.status(404).json({ message: '找不到此會員的預約' })
    }
  } catch (error) {
    console.error('Error fetching reservations:', error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
})
// 更新單筆特定預約資料
router.put('/ReservationEdit/:id', async (req, res) => {
  const reservationId = req.params.id
  const {
    numberOfPeopleId,
    numberOfPeople,
    selectedDate,
    menuSelect,
    selectedTime,
    selectedTableType,
    textAreaInput,
  } = req.body

  try {
    const query =
      'UPDATE reservationSimple SET numberOfPeople = ?, selectedDate = ?, menuSelect = ?, selectedTime = ?, selectedTableType = ?, textAreaInput = ? WHERE id = ?'
    const values = [
      numberOfPeople,
      selectedDate,
      menuSelect,
      selectedTime,
      selectedTableType,
      textAreaInput,
      reservationId,
    ]

    const [result] = await db.execute(query, values)
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Reservation not found' })
    }

    res.json({ message: '預約更新成功' })
  } catch (error) {
    console.error('Error updating reservation:', error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
})
// POST 路由處理函式
router.post('/reserveAdd', async (req, res) => {
  const {
    storedMemberId,
    numberOfPeople,
    numberOfPeopleId,
    selectedDate,
    menuSelect,
    formattedTime,
    selectedTableType,
    textAreaInput,
  } = req.body

  try {
    // 根據 storedMemberId 查詢會員名稱和手機號碼
    const query =
      'SELECT member_name, mobile FROM member_profile_simple WHERE id = ?'
    const [rows] = await db.execute(query, [storedMemberId])

    if (rows.length === 0) {
      // 如果找不到會員資料，回傳錯誤
      return res.status(404).send('找不到會員資料')
    }

    // 從查詢結果中獲取會員名稱和手機號碼
    const { member_name, mobile } = rows[0]

    // 插入預約資料到 reservationSimple 表中
    const insertQuery = `
      INSERT INTO reservationSimple 
        (member_id, member_name, mobile, numberOfPeople, selectedDate, menuSelect, selectedTime, selectedTableType, textAreaInput) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [
      storedMemberId,
      member_name,
      mobile,
      numberOfPeople,
      selectedDate,
      menuSelect,
      formattedTime,
      selectedTableType,
      textAreaInput,
    ]

    await db.execute(insertQuery, values)

    // 回應成功訊息
    res.status(201).send('預約成功')
  } catch (error) {
    console.error('插入資料庫時出錯', error)
    res.status(500).send('伺服器錯誤')
  }
})
//新增回饋評論
router.post('/ReservationSmileBack', async (req, res) => {
  const { rating, textarea } = req.body
  try {
    const query =
      'INSERT INTO ReservationSmileBack (rating, textarea, created_at) VALUES (?, ?, NOW())'
    const values = [rating, textarea]

    await db.execute(query, values)

    // 回應成功訊息
    res.status(201).send('預約成功')
  } catch (error) {
    console.error('插入資料庫時出錯', error)
    res.status(500).send('伺服器錯誤')
  }
})
// 透過id刪除特定資料，並獲取最新的預約資料
// 操你的我弄半天結果在這裡query寫錯 連打字都不會膩
router.delete('/reservationDelete/:id', async (req, res) => {
  const reservationId = req.params.id
  const deleteQuery = 'DELETE FROM reservationSimple WHERE id = ?'
  const selectQuery = 'SELECT * FROM reservationSimple'

  try {
    // 刪除預約
    await db.query(deleteQuery, [reservationId])

    // 查詢最新的預約資料
    const [rows] = await db.query(selectQuery)

    // 發送最新的預約資料給前端
    res.status(200).json(rows)
  } catch (error) {
    console.error('刪除或獲取預約時出錯:', error)
    res.status(500).json({ message: '伺服器錯誤' })
  }
})
//更新特定會員的特定預約的預約狀態step
router.put('/updateStatus/:id', async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    await db.query('UPDATE reservationSimple SET status = ? WHERE id = ?', [
      status,
      id,
    ])
    res.send({ success: true })
  } catch (error) {
    console.error('更新預約狀態step時錯誤:', error)
    res.status(500).send({ error: '更新預約狀態step時錯誤' })
  }
})

//儲值
router.post('/SaveMoneySystem', async (req, res) => {
  const { StoredMemberId, name, email, PayMoney, cardNumber, expiry, cvc } =
    req.body

  if (
    !StoredMemberId ||
    !name ||
    !email ||
    !PayMoney ||
    !cardNumber ||
    !expiry ||
    !cvc
  ) {
    return res.status(400).send('所有字段都是必需的')
  }

  try {
    // 根據 StoredMemberId 查詢會員名稱和手機號碼
    const query =
      'SELECT member_name, mobile FROM member_profile_simple WHERE id = ?'
    const [memberRows] = await db.execute(query, [StoredMemberId])

    if (memberRows.length === 0) {
      // 如果找不到會員資料，回傳錯誤
      return res.status(404).send('找不到會員資料')
    }

    // 從查詢結果中獲取會員名稱和手機號碼
    const { member_name, mobile } = memberRows[0]

    // 檢查會員是否已存在於 SaveMoneySystem 表中
    const balanceQuery =
      'SELECT balance FROM SaveMoneySystem WHERE member_id = ?'
    const [balanceRows] = await db.execute(balanceQuery, [StoredMemberId])

    if (balanceRows.length > 0) {
      // 如果會員已存在，更新餘額
      const newBalance = balanceRows[0].balance + parseInt(PayMoney, 10)
      const updateBalanceQuery =
        'UPDATE SaveMoneySystem SET balance = ?, name = ?, email = ?, cardNumber = ?, expiry = ?, cvc = ? WHERE member_id = ?'
      await db.execute(updateBalanceQuery, [
        newBalance,
        name,
        email,
        cardNumber,
        expiry,
        cvc,
        StoredMemberId,
      ])

      // 回應成功訊息
      res.status(200).send('儲值成功，餘額已更新')
    } else {
      // 如果會員不存在，插入新的記錄
      const insertQuery =
        'INSERT INTO SaveMoneySystem (member_id, member_name, mobile, name, email, PayMoney, cardNumber, expiry, cvc, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
      const values = [
        StoredMemberId,
        member_name,
        mobile,
        name,
        email,
        PayMoney,
        cardNumber,
        expiry,
        cvc,
        parseInt(PayMoney, 10), // 初始餘額即為儲值金額
      ]

      await db.execute(insertQuery, values)

      // 回應成功訊息
      res.status(201).send('儲值成功，新的記錄已插入')
    }
  } catch (error) {
    console.error('插入或更新資料庫時出錯', error)
    res.status(500).send('伺服器錯誤')
  }
})

// 更新餘額
// 獲取會員餘額的路由
// 儲值金查詢餘額路由
router.get('/SaveMoneySystem/balance/:memberId', async (req, res) => {
  const { memberId } = req.params

  try {
    const [balance] = await db.query(
      'SELECT balance FROM savemoneysystem WHERE member_id = ?',
      [memberId]
    )
    if (balance.length > 0) {
      res.json({ balance: balance[0].balance })
    } else {
      res.status(404).json({ error: 'Member not found' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message })
  }
})

// 扣除餘額的路由
// 支付訂金路由
router.post('/pay', async (req, res) => {
  const { memberId, amount } = req.body

  try {
    // 查詢對應的會員
    const [member] = await db.query(
      'SELECT balance FROM savemoneysystem WHERE member_id = ?',
      [memberId]
    )

    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    const currentBalance = member[0].balance

    if (currentBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // 更新會員餘額
    await db.query(
      'UPDATE savemoneysystem SET balance = balance - ? WHERE member_id = ?',
      [amount, memberId]
    )

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Database error', details: error.message })
  }
})

export default router
