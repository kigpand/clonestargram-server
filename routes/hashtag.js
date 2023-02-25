const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const { Post, User, Image, Comment, Hashtag } = require('../models');

router.get('/:hashtag', async(req,res,next)=>{
    try{
        console.log("액션액션액션");
        const where = {};
        console.log(req.params.hashtag);
        const posts = await Post.findAll({
            where,
            limit : 9,
            order: [
                ['createdAt', 'DESC'],
                [Comment, 'createdAt', 'DESC'],
            ],
            include: [{
                model : Hashtag,
                where:{ name: req.params.hashtag },
            }, {
                model: User,
                attributes: ['id','nickname','userImg'],
            }, {
                model: Image,
            }, {
                model : Comment,
                include: [{
                    model: User,
                    attributes: ['id','nickname','userImg'],
                }]
            }],
        });
        res.status(200).json(posts);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

module.exports = router;