const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const passport = require("passport");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const multerS3 = require("multer-s3");
const AWS = require("aws-sdk");

const { User, Post } = require("../models");
const { isLoggedIn, isNotLoggedIn } = require("./middlewares");
const db = require("../models");

try {
  fs.accessSync("uploads");
} catch (error) {
  fs.mkdirSync("uploads");
}

// AWS.config.update({
//   accessKeyId: process.env.S3_ACCESS_KEY_ID,
//   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
//   region: "ap-northeast-2",
// });

// const upload = multer({
//   storage: multerS3({
//     s3: new AWS.S3(),
//     bucket: "jigram",
//     key(req, file, cb) {
//       cb(null, `original/${Date.now()}_${path.basename(file.originalname)}`);
//     },
//   }),
//   limits: { fileSize: 20 * 1024 * 1024 },
// });

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      done(null, "uploads");
    },
    filename(req, file, done) {
      const ext = path.extname(file.originalname);
      const basename = path.basename(file.originalname, ext);
      done(null, basename + new Date().getTime() + ext);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

router.get("/:id", async (req, res, next) => {
  try {
    const fulluser = await User.findOne({
      where: { id: req.params.id },
      attribute: {
        exclude: ["password"],
      },
      include: [
        {
          model: Post,
          attribute: ["id"],
        },
        {
          model: User,
          as: "Followings",
          attribute: ["id"],
        },
        {
          model: User,
          as: "Followers",
          attribute: ["id"],
        },
      ],
    });
    res.status(200).json(fulluser);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/login", isNotLoggedIn, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (info) {
      return res.status(401).send(info.reason);
    }
    return req.login(user, async (loginErr) => {
      //passport??? index.js??? serializeUser??? ?????????.
      if (loginErr) {
        console.error(loginErr);
        return next(loginErr);
      }
      const fulluser = await User.findOne({
        where: { id: user.id },
        attribute: {
          exclude: ["password"],
        },
        include: [
          {
            model: Post,
          },
          {
            model: User,
            as: "Followings",
          },
          {
            model: User,
            as: "Followers",
          },
        ],
      });
      return res.status(200).json(fulluser);
    });
  })(req, res, next);
});

router.post("/check", isNotLoggedIn, async (req, res) => {
  try {
    const exUser = await User.findOne({
      where: {
        userid: req.body.data,
      },
    });

    if (exUser) {
      return res.send("false");
    } else {
      return res.send("true");
    }
  } catch (error) {
    console.error(error);
  }
});

router.post("/", isNotLoggedIn, async (req, res, next) => {
  try {
    const hashedPasssword = await bcrypt.hash(req.body.pw, 10);

    await User.create({
      userid: req.body.id,
      password: hashedPasssword,
      email: req.body.email,
      phone: req.body.phone,
      nickname: req.body.id,
    });
    res.status(201).send("ok");
  } catch (error) {
    console.error(error);
    next(error); // status 500
  }
});

router.post("/logout", (req, res, next) => {
  req.logout();
  req.session.destroy();
  return res.send("ok");
});

router.patch("/edit", async (req, res, next) => {
  try {
    const updateUser = await User.update(
      {
        nickname: req.body.nickname,
        email: req.body.email,
        phone: req.body.phone,
        intro: req.body.intro,
        userImg: req.body.userImg,
      },
      {
        where: { id: req.body.id },
      }
    );
    console.log(updateUser);
    res.status(200).json(updateUser);
  } catch (error) {
    console.error(error);
  }
});

router.patch("/:userid/follow", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.userid } });
    if (!user) {
      res.status(403).send("???????????? ????????? ???????????? ????????????.");
    }
    await user.addFollower(req.user.id);
    res.status(200).json({ userid: parseInt(req.params.userid, 10) });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete("/:userid/follow", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.userid } });
    if (!user) {
      res.status(403).send("???????????? ????????? ???????????? ????????????.");
    }
    await user.removeFollower(req.user.id);
    res.status(200).json({ userid: parseInt(req.params.userid, 10) });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/followers", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(403).send("???????????? ????????????");
    }
    const followers = await user.getFollowers();
    res.status(200).json(followers);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/followings", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(403).send("???????????? ????????????");
    }
    const followings = await user.getFollowings();
    res.status(200).json(followings);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/find", isLoggedIn, async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.body.userid } });
    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.post("/image", upload.single("image"), (req, res, next) => {
  res.json(req.file.filename);
});

module.exports = router;
