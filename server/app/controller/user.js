const BaseController = require('./base')
const md5 = require('md5')
const HashSalt = '!_-FAnKk45698UiO'
const jwt = require('jsonwebtoken')
const createRule = {
    email: { type: 'email' },
    nickname: { type: 'string' },
    passwd: { type: 'string' },
    captcha: { type: 'string' },
}

class UserController extends BaseController {
    async login() {
        const { ctx, app } = this
        const { email, nickname, passwd, captcha } = ctx.request.body
        if (captcha.toUpperCase() !== ctx.session.captcha.toUpperCase()) {
            this.error('验证码错误')
            return
        }
        const user = await ctx.model.User.findOne({
            email,
            passwd: md5(passwd + HashSalt)
        })
        if (!user) {
            return this.error('用户名或密码错误')
        }
        const token = jwt.sign({
            _id: user._id,
            email
        }, app.config.jwt.secret, {
            expiresIn: '1h' // 过期时间
        })
        this.success({ token, email, nickname: user.nickname })
    }
    async register() {
        const { ctx } = this
        try {
            ctx.validate(createRule)
        } catch (e) {
            // 继承BaseController的方法
            return this.error('参数校验失败', -1, e.errors)
        }

        const { email, emailCode, nickname, passwd, captcha } = ctx.request.body
        if (captcha.toUpperCase() !== ctx.session.captcha.toUpperCase()) {
            this.error('验证码错误')
            return
        }

        // if (emailCode !== ctx.session.emailCode) {
        //     this.error('邮箱验证码错误')
        //     return
        // }


        // 邮箱是否重复
        if (await this.checkEmail(email)) {
            this.error('邮箱重复了')
            return
        }
        const ret = await ctx.model.User.create({
            email,
            nickname,
            passwd: md5(passwd + HashSalt) // 加盐
        })
        if (ret._id) {
            this.message('注册成功')
        }
    }
    async checkEmail(email) {
        const user = await this.ctx.model.User.findOne({ email })
        return user
    }
    async verify() {

    }
    async info() {
        const { ctx } = this
        // 在middle中完成用户验证并从token中获取用户信息
        const { email } = ctx.state
        const user = await this.checkEmail(email)
        this.success(user)
    }
}

module.exports = UserController