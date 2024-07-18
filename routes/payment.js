// 使用 ES6 語法匯入需要的模組
import express from 'express' // 匯入 Express 模組，用於建立路由
import crypto from 'crypto' // 匯入 crypto 模組，用於加密操作
import ecpay_payment from 'ecpay_aio_nodejs' // 匯入綠界支付模組，用於處理支付
import dotenv from 'dotenv' // 匯入 dotenv 模組，用於讀取環境變數

dotenv.config() // 加載環境變數，從 .env 文件讀取

const router = express.Router() // 建立一個 Express 路由實例
const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env // 從環境變數中解構賦值獲取支付相關的參數

const options = {
  OperationMode: 'Test', // 設定運行模式為測試環境，正式環境應為 'Production'
  MercProfile: {
    MerchantID: MERCHANTID, // 商店 ID
    HashKey: HASHKEY, // Hash Key，用於生成 CheckMacValue
    HashIV: HASHIV, // Hash IV，用於生成 CheckMacValue
  },
  IgnorePayment: [
    // 忽略的支付方式，例如信用卡、網路 ATM 等，目前為空
  ],
  IsProjectContractor: false, // 設定是否為專案承包商，預設為 false
}

let TradeNo // 宣告交易編號變數

router.get('/', (req, res) => {
  const { totalAmount } = req.query // 從請求中獲取總金額
  console.log(totalAmount)
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) // 生成符合綠界要求的交易日期格式

  TradeNo = `test${new Date().getTime()}` // 生成唯一的交易編號，使用當前時間戳

  const base_param = {
    MerchantTradeNo: TradeNo, // 設定商店交易編號
    MerchantTradeDate, // 設定商店交易日期
    TotalAmount: totalAmount, // 設定交易總金額
    TradeDesc: '測試交易描述', // 設定交易描述
    ItemName: '測試商品等', // 設定商品名稱
    ReturnURL: `${HOST}/return`, // 設定交易完成後的回傳 URL
    ClientBackURL: `${HOST}/clientReturn`, // 設定用戶返回 URL
    OrderResultURL: 'http://localhost:3000/ReservationGet', // 設定交易結果返回 URL
  }

  const create = new ecpay_payment(options) // 創建綠界支付實例
  const html = create.payment_client.aio_check_out_all(base_param) // 生成支付表單的 HTML 代碼
  console.log(html) // 輸出 HTML 代碼至控制台

  // 直接將生成的 HTML 代碼作為回應的一部分發送回前端
  res.send({
    html, // 將生成的 HTML 代碼傳遞給前端
  })
})

// 設定 /return 路徑的 POST 請求處理器，處理綠界回傳的支付結果
router.post('/return', async (req, res) => {
  console.log('req.body:', req.body) // 輸出請求主體至控制台

  const { CheckMacValue } = req.body // 從請求主體中解構賦值獲取 CheckMacValue
  const data = { ...req.body } // 複製請求主體的資料
  delete data.CheckMacValue // 刪除 CheckMacValue，不包含在驗證中

  const create = new ecpay_payment(options) // 創建綠界支付實例
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data) // 生成本地計算的 CheckMacValue

  console.log(
    '確認交易正確性：',
    CheckMacValue === checkValue, // 比較回傳的 CheckMacValue 和本地計算的是否相同
    CheckMacValue, // 輸出回傳的 CheckMacValue
    checkValue // 輸出本地計算的 CheckMacValue
  )

  res.send('1|OK') // 交易成功後，需要回傳 '1|OK' 給綠界
})

// 設定 /clientReturn 路徑的 GET 請求處理器，處理用戶支付完成後的返回
router.get('/clientReturn', (req, res) => {
  console.log('clientReturn:', req.body, req.query) // 輸出請求主體和查詢參數至控制台
})

export default router // 將路由模組匯出
