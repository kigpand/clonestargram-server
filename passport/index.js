const passport = require('passport');
const local = require('./local');
const { User } = require('../models')

module.exports = () =>{
    passport.serializeUser((user, done)=>{
        done(null, user.id); //쿠키랑 묶어줄 id저장.
    });

    passport.deserializeUser(async (id, done)=>{  // 로그인 성공하고나서부터의 요청처리. 
        try{
            const user = await User.findOne({ where: { id } });
            done(null, user); //req.user
        }catch(error){
            console.error(error);
            done(error);
        }
    });

    local();
}