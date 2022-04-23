import express, { Request } from "express";
import { MongoError } from "mongodb";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { IUser } from "../types";
import { checkAuth, checkLogin, isLoggedIn } from "../middlewares/auth";

const router = express.Router();

router.use(checkAuth);

router.get("/", (req, res) => {  
  return res.render("index");
});

router.get("/register", (req, res) => {
  if(isLoggedIn(req)) return res.redirect("/dashboard");

  return res.render("register", { csrfToken: req.csrfToken() });
});

router.post("/register", (req, res) => {
  req.body.password = bcrypt.hashSync(req.body.password, 14);
  const user = new User(req.body);

  user.save((err) => {
    if(err) {
      let error = "Something went wrong!";

      if((err as MongoError).code === 11000) {
        error = "Email exists!";
      }

      console.log(err);

      return res.render("register", { error: error });
    }

    return res.redirect("/dashboard");
  });
});

router.get("/login", (req, res) => {
  if(isLoggedIn(req)) return res.redirect("/dashboard");

  return res.render("login", { csrfToken: req.csrfToken() });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err: MongoError, user: IUser) => {
    if(err || !user || !bcrypt.compareSync(req.body.password, user.password)) {
      return res.render("login", { error: "Incorrect email or password!" });
    }

    req.session.userId = user._id;
    return res.redirect("/dashboard");
  });
});

router.get("/dashboard", checkLogin, (req, res, next) => {
  return res.render("dashboard");
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    return res.redirect("/");
  });
});

router.get("*", (req, res) => {
  return res.redirect("/");
});

export default router;