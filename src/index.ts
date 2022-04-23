import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import session from "express-session";
import csurf from "csurf";
import helmet from "helmet";

dotenv.config();

mongoose.connect(process.env.MONGO_URI!);
mongoose.connection.on("error", (error) => console.error(error));

const PORT = process.env.PORT || 3000;

const app = express();

app.set("view engine", "pug");
app.set("views", "./src/views");
app.set("trust proxy", 1);
app.use(helmet());
app.use(session({
  name: "mid",
  resave: true,
  cookie: { httpOnly: true, secure: true, sameSite: true },
  secret: process.env.SESSION_SECRET!,
  saveUninitialized: false
}));
app.use(express.urlencoded({ extended: false  }));
app.use(csurf());

import routes from "./routes";
app.use("/", routes);

app.listen(PORT, () => {
  console.log(`Moard running at http://localhost:${PORT}`);
});