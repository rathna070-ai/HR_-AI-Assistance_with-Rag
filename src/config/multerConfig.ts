import fs from "fs";
import path from "path";
import multer from "multer";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${uniquePrefix}-${safeName}`);
  },
});

export class InvalidFileTypeError extends Error {
  constructor() {
    super("Only PDF allowed");
  }
}

// Clients (e.g. Postman) often send PDFs as application/octet-stream, so the
// mimetype alone is not reliable; the real content is verified by isPdfFile().
const ALLOWED_MIME_TYPES = ["application/pdf", "application/x-pdf", "application/octet-stream"];

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const isPdf =
    ALLOWED_MIME_TYPES.includes(file.mimetype) &&
    path.extname(file.originalname).toLowerCase() === ".pdf";

  if (!isPdf) {
    return cb(new InvalidFileTypeError());
  }
  cb(null, true);
};

// Checks the "%PDF-" signature at the start of the saved file.
export const isPdfFile = async (filePath: string): Promise<boolean> => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const header = Buffer.alloc(5);
    await handle.read(header, 0, 5, 0);
    return header.toString("latin1") === "%PDF-";
  } finally {
    await handle.close();
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});
