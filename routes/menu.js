//import 匯入
import express from 'express' //espress套件
import db from '#configs/mysql.js' //連線料庫

const menuRouter = express.Router()

// menuRouter - Top-level middlewares

//api - 使用get 前面的使用者端都都只能【看】 !!不能做任何修改或者新增的動做!!!

//菜單主分頁
menuRouter.get('/', (req, res) => {
  res.json({ set: '有設定正確' })
})
//單點
menuRouter.get('/product', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image`,`popularity` FROM `one` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})
//合菜
menuRouter.get('/combo_meal', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image` ,`popularity` FROM `combo_meal` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})
//酒類
menuRouter.get('/liquor', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image`,`popularity` FROM `liquor` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})
//飲料
menuRouter.get('/drink', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image`,`popularity` FROM `drink` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})
//甜點
menuRouter.get('/dessert', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image`,`popularity` FROM `dessert` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})
//便當
menuRouter.get('/bento', async (req, res) => {
  const sql =
    'SELECT `id`, `name`, `price`, `image`,`popularity` FROM `bento` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})

menuRouter.get('/kcal', async (req, res) => {
  const sql = 'SELECT `id`, `p_name`, `kcal`,`image` FROM `kcal` WHERE 1'
  const [rows] = await db.query(sql)

  res.json({ rows })
})

export default menuRouter
