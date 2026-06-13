import multer from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';

const dir = join(process.cwd(), 'uploads', 'eventos');
mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`),
});

export const uploadFoto = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
}).single('foto');

export function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  res.status(201).json({ url: `/uploads/eventos/${req.file.filename}` });
}
