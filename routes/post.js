const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const { Post, Image, Comment, User, Hashtag } = require('../models');
const { isLoggedIn } = require('./middlewares');

try{
    fs.accessSync('uploads');
}catch(error){
    fs.mkdirSync('uploads');
}

AWS.config.update({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: 'ap-northeast-2'
});

const upload = multer({
    storage: multerS3({
        s3: new AWS.S3,
        bucket: 'jigram',
        key(req, file, cb){
            cb(null, `original/${Date.now()}_${path.basename(file.originalname)}`)
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 },
});

router.post('/', isLoggedIn, upload.none(), async (req, res, next)=>{ // POST /post
    try{
        const post = await Post.create({
            content : req.body.content,
            UserId : req.user.id,
            nickname : req.user.nickname,
            tag : req.body.tag,
        });
        if(req.body.image){
            if(Array.isArray(req.body.image)){
                const images = await Promise.all(req.body.image.map((image) =>Image.create({src:image})));
                await post.addImages(images);
            } else {
                const image = await Image.create({ src: req.body.image });
                await post.addImages(image);
            }
        }

        const hashtags = req.body.tag.match(/#[^\s#]+/g);
        if(hashtags){
            const result = await Promise.all(hashtags.map((tag) =>Hashtag.findOrCreate({ 
                where : {name : tag.slice(1).toLowerCase() }
            })));
            await post.addHashtags(result.map((v)=>v[0]));
        }
        
        const fullPost = await Post.findOne({
            where : { id: post.id},
            include : [{
                model : Image,
            }, {
                model : Comment,
            }, {
                model : User,
            }, ]
        });
        res.status(201).json(fullPost);
    }catch(error){
        console.error(error);
        next(error);
    }
});

router.post('/:postid/comment', isLoggedIn, async (req, res, next)=>{ 
    try{
        const comment = await Comment.create({
            content: req.body.comment,
            PostId : parseInt(req.params.postid, 10),
            UserId : req.user.id,
            nickname : req.user.nickname,
        });
        res.status(201).json(comment);
    }catch(error){
        console.error(error);
        next(error);
    }
});

router.delete('/:postid', isLoggedIn, async (req, res, next)=>{ //DELETE /post
    try{
        await Post.destroy({
            where : { 
                id: req.params.postid, 
                UserId : req.user.id,
            },
        });
        res.status(200).json({ postid : parseInt(req.params.postid)});
    }catch(error){
        console.error(error);
        next(error);
    }
});

//한장만 올릴거면 upload.single
router.post('/images', isLoggedIn, upload.array('image'), async(req,res,next)=>{
    res.json(req.files.map((v) => v.location));
});

module.exports = router;