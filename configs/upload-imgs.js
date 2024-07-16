import multer from 'multer'
import { v4 } from 'uuid'

const extMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const fileFilter = (req, file, callback) => {
  callback(null, !!extMap[file.mimetype])
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/img')
    // 這裡的路徑和此js 檔所在位置無關，和執行的資料夾有關
  },
  filename: (req, file, cb) => {
    const ext = extMap[file.mimetype] // 取得副檔名
    cb(null, v4() + ext)
  },
})

export default multer({ fileFilter, storage })
