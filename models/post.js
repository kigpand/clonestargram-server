
module.exports = (sequelize, DataTypes) =>{
    const Post = sequelize.define('Post',{  // MYSQL에는 users 테이블 생성
        content: {
            type: DataTypes.TEXT,
            allowNull : false,
        },
        nickname : {   
            type : DataTypes.STRING(20),
            allowNull : false,
        },
        tag : {
            type : DataTypes.STRING(100),
            allowNull : true,
        }
    },{
        charset : 'utf8mb4',
        collate : 'utf8mb4_general_ci', // 이모티콘 저장
    });
    Post.associate = (db) =>{
        db.Post.belongsTo(db.User);
        db.Post.belongsToMany(db.Hashtag, { through: 'PostHashtag' });
        db.Post.hasMany(db.Comment);
        db.Post.hasMany(db.Image);
        db.Post.belongsToMany(db.User, { through : 'Like', as: 'Likers'});
    };
    return Post;
}