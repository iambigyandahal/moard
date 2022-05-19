import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import csurf from "csurf";
import helmet from "helmet";
import path from "path";
import multer from "multer";

dotenv.config();

mongoose.connect(process.env.MONGO_URI!);
mongoose.connection.on("error", (error) => console.error(error));

const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "pug");
app.set("views", path.resolve(__dirname, "../views"));
//app.set("trust proxy", 1);
app.use(helmet());
app.use(session({
  name: "mid",
  resave: false,
  cookie: {
    httpOnly: true,
    //secure: true, 
    sameSite: true
  },
  secret: process.env.SESSION_SECRET!,
  saveUninitialized: false
}));
app.use(express.urlencoded({ extended: false }));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.resolve(__dirname, "../public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `${req.session.userId}${path.extname(file.originalname)}`);
  }
});
const whitelist = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];
const upload = multer({
  storage: storage,
  fileFilter: async (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      return cb(new Error("Please upload an image file!"));
    }

    cb(null, true);
  }
});
app.use(upload.single("image"));
app.use(csurf());

import routes from "./routes";
app.use("/static", express.static(path.join(__dirname, "../public")));
app.use("/", routes);

app.listen(PORT, () => {
  console.log(`Moard running at http://localhost:${PORT}`);
});
