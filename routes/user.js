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

router.get("/", async (req, res, next) => {
  try {
    if (req.user) {
      const fulluser = await User.findOne({
        where: { id: req.user.id },
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
    } else {
      res.status(200).json(null);
    }
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
      //passport의 index.js의 serializeUser가 실행됨.
      if (loginErr) {
        console.error(loginErr);
        return next(loginErr);
      }
      const fulluser = await User.findOne({
        where: { id: user.id },
        attributes: {
          exclude: ["password"],
        },
        include: [
          {
            model: Post,
          },
          {
            model: User,
            as: "Followings",
            attributes: {
              exclude: ["password"],
            },
          },
          {
            model: User,
            as: "Followers",
            attributes: {
              exclude: ["password"],
            },
          },
        ],
      });
      return res.status(200).json(fulluser);
    });
  })(req, res, next);
});

router.post("/check", async (req, res) => {
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

router.post("/", async (req, res, next) => {
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
        where: { id: req.user.id },
      }
    );
    res.status(200).json(updateUser);
  } catch (error) {
    console.error(error);
  }
});

router.patch("/:userid/follow", async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.userid } });
    if (!user) {
      res.status(403).send("팔로우할 사람이 존재하지 않습니다.");
    }
    await user.addFollower(req.user.id);
    res.status(200).json({ userid: parseInt(req.params.userid, 10) });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete("/:userid/follow", async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.params.userid } });
    if (!user) {
      res.status(403).send("팔로우할 사람이 존재하지 않습니다.");
    }
    await user.removeFollower(req.user.id);
    res.status(200).json({ userid: parseInt(req.params.userid, 10) });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get("/followers", async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(403).send("로그인을 해주세요");
    }
    const followers = await user.getFollowers();
    res.status(200).json(followers);
  } catch (error) {
    next(error);
  }
});

router.get("/followings", async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { id: req.user.id } });
    if (!user) {
      res.status(403).send("로그인을 해주세요");
    }
    const followings = await user.getFollowings();
    res.status(200).json(followings);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post("/find", async (req, res, next) => {
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
