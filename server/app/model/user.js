module.exports = app => {
    const mongoose = app.mongoose
    const Schema = mongoose.Schema
    // 数据库模型骨架
    // 用户模型
    const UserSchema = new Schema({
        __v: {type: Number, select:false},
        email: { type: String, require: true },
        passwd: { type: String, require: true, select: false },
        nickname: { type: String, require: true },
        avatar: { type: String, require: true }, // 头像
    }, { timestampa: true })
    return mongoose.model('User', UserSchema)
}