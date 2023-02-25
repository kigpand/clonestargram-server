
module.exports = (sequelize, DataTypes) =>{
    const User = sequelize.define('User',{  // MYSQL에는 users 테이블 생성
        userid: {
            type : DataTypes.STRING(20),
            unique : true, //고유한 값
            allowNull : false, //필수
        },
        phone : {
            type : DataTypes.STRING(20),
            allowNull : false, //필수
        },
        email: {
            type: DataTypes.STRING(30),
            allowNull : false,
        },
        nickname : {   
            type : DataTypes.STRING(20),
            allowNull : true,
        },
        password: {
            type: DataTypes.STRING(100),
            allowNull : false,
        },
        userImg:{
            type: DataTypes.STRING(200),
            allowNull : true,
        },
        intro:{
            type:DataTypes.STRING(200),
            allowNull: true,
        }
    },{
        charset : 'utf8',
        collate : 'utf8_general_ci', //한글 저장
    });
    User.associate = (db) =>{
        db.User.hasMany(db.Post);
        db.User.hasMany(db.Comment);
        db.User.belongsToMany(db.Post, { through: 'Like', as: 'Liked' })
        db.User.belongsToMany(db.User, { through: 'Follow', as: 'Followers', foreignKey: 'FollowingId' });
        db.User.belongsToMany(db.User, { through: 'Follow', as: 'Followings', foreignKey: 'FollowerId' });
    };
    return User;
};