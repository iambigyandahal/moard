import express, { NextFunction, Request } from "express";
import { MongoError, ObjectId } from "mongodb";
import User from "../models/User";
import bcrypt from "bcryptjs";
import { IUser } from "../types";
import { checkAuth, checkLogin, isLoggedIn } from "../middlewares/auth";
import Message from "../models/Message";
import humango from "humango";
import { Response } from "express-serve-static-core";
import * as FileType from "file-type";

const whitelist = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp'
];

const router = express.Router();

router.use(checkAuth);

router.get("/", (req, res) => {  
  return res.render("index");
});

router.get("/register", (req, res) => {
  if(isLoggedIn(req)) return res.redirect("/home");

  return res.render("register", { csrfToken: req.csrfToken() });
});

const trimBodyString = (req: Request, res: Response, next: NextFunction) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof(value) === 'string') {
      req.body[key] = value.trim();
    }
  }

  next();
};

const validateRegister = (req: Request, res: Response<any, Record<string, any>, number>) => {
  let error;
  
  if(req.body.name !== "" || req.body.email !== "" || req.body.password !== "" || req.body.confirmPassword !== "") {
    if(req.body.email.match(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )) {
      if(req.body.password.length < 6) {
        error = "Please choose longer password!";
        return error;
      } else {
        if(req.body.password !== req.body.confirmPassword) {
          error = "Passwords don't match!";
          return error;
        }
        return;
      }
    } else {
      error = "Please enter valid email!";
      return error;
    }
  } else {
    error = "Please fill in all the fields!";
    return error;
  }
};

router.post("/register", trimBodyString, async (req, res) => {
  const error = validateRegister(req, res);
  if(error) {
    return res.render("register", { error: error, csrfToken: req.csrfToken() });
  }
  req.body.password = bcrypt.hashSync(req.body.password, 14);
  req.body.name = req.body.name.replace(/[^a-zA-Z ]/g, "");
  req.body.username = req.body.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
  const dbUser = await User.find({ username: new RegExp(`${req.body.username}`, "g") }).sort({$natural: -1}).limit(1);
  let user;
  if(dbUser.length) {
      const lastDbUsername = dbUser!.at(-1)!.username;
      const unusedUsername = lastDbUsername!.split(/(\d+)/);
      if(unusedUsername.length > 1) {
        req.body.username = `${req.body.username}${parseInt(unusedUsername[1])+1}`;
      } else {
        req.body.username = `${req.body.username}0`;
      }
      user = new User(req.body);
  } else {
    user = new User(req.body);
  }

  user.save((err) => {
    if(err) {
      let error = "Something went wrong!";

      console.log(err);

      if((err as MongoError).code === 11000) {
        if(err.message.includes("username")) {
          error = "Username exists!";
        }
        if(err.message.includes("email")) {
          error = "Email exists!";
        }
      }

      return res.render("register", { error: error, csrfToken: req.csrfToken()  });
    }

    return res.redirect("/home");
  });
});

router.get("/login", (req, res) => {
  if(isLoggedIn(req)) return res.redirect("/home");

  return res.render("login", { csrfToken: req.csrfToken() });
});

router.post("/login", (req, res) => {
  User.findOne({ email: req.body.email }, (err: MongoError, user: IUser) => {
    if(err || !user || !bcrypt.compareSync(req.body.password, user.password)) {
      return res.render("login", { error: "Incorrect email or password!", csrfToken: req.csrfToken()  });
    }

    req.session.userId = user._id;
    return res.redirect("/home");
  });
});

router.get("/home", checkLogin, async (req, res, next) => {
  let messages: any;
  messages = await Message.find({}).sort({$natural: -1}).limit(10);
  if(messages.length) {
    return res.render("home", { messages, humango, csrfToken: req.csrfToken() });
  }
  return res.render("home", { error: "No messages found!" });
});

router.get("/create", checkLogin, (req, res) => {
 return res.render("create", { csrfToken: req.csrfToken() });
});

router.post("/create", checkLogin, trimBodyString, (req, res) => {
  req.body.excerpt = req.body.description.substring(0, 30);
  req.body.author = res.locals.user;
  req.body.date = new Date();
  const message = new Message(req.body);

  message.save((err) => {
    if(err) {
      let error = "Something went wrong!";

      return res.render("create", { error: error, csrfToken: req.csrfToken() });
    }

    return res.redirect("home");
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    return res.redirect("/");
  });
});

router.get("/message/:id", checkLogin, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if(message) {
      return res.render("message", { message: message, csrfToken: req.csrfToken(), humango });
    }
    return res.redirect("home");
  } catch(err) {
    console.log(err);
    return res.redirect("home");
  }
});

router.post("/message/:id/comment", checkLogin, trimBodyString, async (req, res) => {
  try {
    if(req.body.text !== "") {
      req.body.author = res.locals.user;
      req.body.date = Date.now();
      await Message.findByIdAndUpdate(req.params.id, { $push: { comments: req.body } });
      await User.findByIdAndUpdate(req.session.userId, { $addToSet: { commentedOn: req.params.id } });
    }
    return res.redirect(`/message/${req.params.id}`);
  } catch(err) {
    console.log(err);
    return res.redirect("home");
  }
});

router.get("/message/:id/edit", checkLogin, async (req, res) => {
  let error = "";
  if(req.query.err === "1") {
    error = "Something went wrong!";
  }
  const dbMessage = await Message.findById({ _id: req.params.id });
  if(dbMessage) {
    if((dbMessage._id.toString() === req.params.id) && (dbMessage.author.username === res.locals.user.username)) {
      return res.render("edit", { msgTitle: dbMessage.title, msgDescription: dbMessage.description, mid: req.params.id, error: error, csrfToken: req.csrfToken() });
    }
  }
  return res.redirect("/home");
 });

router.post("/message/:id/edit", checkLogin, trimBodyString, async (req, res) => {
  try {
    const dbMessage = await Message.findById({ _id: req.params.id });
    if(dbMessage) {
      if((dbMessage._id.toString() === req.params.id) && (dbMessage.author.username === res.locals.user.username)) {
        let obj: {title?: string, description?: string, excerpt?: string} = {};
        if(req.body.title) {
          obj.title = req.body.title;
        }
        if(req.body.description) {
          obj.description = req.body.description;
          obj.excerpt = req.body.description.substring(0, 30);
        }
        await Message.findByIdAndUpdate(req.params.id, { $set: obj });
      }
    }
    return res.redirect("/home");
  } catch(err) {
    console.log(err);
  }

  console.log(req.params.id);

  return res.redirect(`/message/${req.params.id}/edit?err=1`);
});

router.delete("/message/:id/delete", checkLogin, async(req, res) => {
  try  {
    const dbMessage = await Message.findById({ _id: req.params.id });
    if(dbMessage) {
      if((dbMessage._id.toString() === req.params.id) && (dbMessage.author.username === res.locals.user.username)) {
        await Message.findByIdAndRemove(req.params.id);
        return res.json({ success: true, message: "success" });
      } else {
        return res.json({ success: false, message: "error" });
      }
    }
    return res.json({ success: false, message: "error" });
  } catch(err) {
    console.log(err);
  }
  return res.json({ success: false, message: "error" });
});

router.delete("/message/:id/comment/:commentId/delete", checkLogin, async(req, res) => {
  try  {
    const dbMessage = await Message.findOne({ _id: req.params.id, "comments._id": req.params.commentId });
    if(dbMessage) {
      for(let comment of dbMessage.comments) {
        if((comment._id.toString() === req.params.commentId) && (comment.author.username === res.locals.user.username)) {
          await Message.findOneAndUpdate({ _id: req.params.id }, { $pull: { comments: { _id: req.params.commentId } } });
          return res.json({ success: true, message: "success" });
        }
      }
      return res.json({ success: false, message: "error" });
    }
    return res.json({ success: false, message: "error" });
  } catch(err) {
    console.log(err);
  }
  return res.json({ success: false, message: "error" });
});

router.get("/account", checkLogin, (req, res) => {
  return res.render("account", { csrfToken: req.csrfToken() });
});

const validateUpdate = async (req: Request, res: Response<any, Record<string, any>, number>) => {
  let updateObject: {name?: string, username?: string, email?: string, password?: string, image?: string, confirmPassword?: string, error?: string} = {};
  let error;

  if((req.body.email !== "") || (req.body.name !== "") || (req.body.username !== "") || (req.body.password !== "") || (req.file)) {
    if(req.body.email !== "") {
      if(!req.body.email.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      )) {
        error = "Please enter valid email!";
        return { error };
      } else {
        if(req.body.email !== res.locals.user.email) {
          const dbUser = await User.find({ email: req.body.email });
          if(dbUser.length) {
            if(dbUser[0].email === req.body.email) return { error: "Account with this email exists!" };
          }
        }
      }
      updateObject.email = req.body.email;
    }

    if(req.body.password !== "") {
      if(req.body.password.length < 6) {
        error = "Please choose longer password!";
        return { error };
      } else {
        if(req.body.password !== req.body.confirmPassword) {
          error = "Passwords don't match!";
          return { error };
        }
      }

      updateObject.password = bcrypt.hashSync(req.body.password, 14);
    }

    if(req.body.name !== "") {
      if(!req.body.name.match(/^[a-zA-Z0-9 ]+$/g)) {
        error = "Invalid name!";
        return { error };
      }

      updateObject.name = req.body.name;
    }

    if(req.body.username !== "") {
      if(!req.body.username.match(/^[a-zA-Z0-9]+$/g)) {
        error = "Invalid username!";
        return { error };
      }

      const dbUser = await User.find({ username: req.body.username });
      if(dbUser.length) {
        if(dbUser[0].username === req.body.username) return { error: "Username already exists!" };
      }

      updateObject.username = req.body.username;
    }

    if(req.file) {
      const meta = await FileType.fromFile(req.file.path)!;

      if(meta) {
        if (!whitelist.includes(meta.mime)) {
          error = "Please upload an image file";
          return { error };
        } else {
          updateObject.image = `/static/uploads/${req.file.filename}`;
        }
      }
    }

    return updateObject;
  } else {
    return { error: "Nothing to update!" };
  }
};

router.post("/account", checkLogin, trimBodyString, async (req: Request, res: Response) => {
  const updateObject = await validateUpdate(req, res);

  if(updateObject.error) {
    return res.render("account", { error: updateObject.error, csrfToken: req.csrfToken() });
  } else {
    try {
      const updateUser = await User.findByIdAndUpdate(req.session.userId, { $set: updateObject }, {new: true}).lean();
      if(updateUser) {
        let flag = true;
        if(updateObject.username || updateObject.image) {
          try {
            const updateMessage = await Message.updateMany({ "author._id": req.session.userId }, { $set: { author: {...updateUser, ...updateObject } } }, { multi: true });
            const updateComments = await Message.updateMany({ _id: { $in: updateUser.commentedOn }, "comments.author._id": req.session.userId }, { $set: { "comments.$.author.username": updateUser.username, "comments.$.author.image": updateObject.image} }, { multi: true });
            if(!(updateMessage || updateComments)) flag = false;
          } catch(err) {
            flag = false;
            console.log(err);
          }
        }
        if(flag) {
          let { password, confirmPassword, error, ...localObject } = updateObject;
          req.user = { ...res.locals.user, ...localObject };
          res.locals.user = { ...res.locals.user, ...localObject };
          return res.render("account", { error: "Updated!", csrfToken: req.csrfToken() });
        } else {
          return res.render("account", { error: "Something went wrong!", csrfToken: req.csrfToken() });
        }
      }
      return res.render("account", { error: "Something went wrong!", csrfToken: req.csrfToken() });
    } catch(err) {
      return res.render("account", { error: "Something went wrong!", csrfToken: req.csrfToken() });
    }
  }
});

router.get("*", (req, res) => {
  return res.redirect("/");
});

export default router;
