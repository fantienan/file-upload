const BaseController = require("./base")
const svgCaptcha = require("svg-captcha")
const fse = require('fs-extra')

class UtilController extends BaseController {
    async captcha() {
        const captcha = svgCaptcha.create({
            size: 4,
            noise: 3,
            fontSize: 30,
            width: 100,
            height: 40
        })
        console.log('图片验证码' + captcha.text)
        this.ctx.session.captcha = captcha.text
        this.ctx.response.type = "image/svg+xml"
        this.ctx.body = captcha.data
    }
    async sendcode() {
        const { ctx } = this
        const { email } = ctx.query
        let code = Math.random().toString().slice(2, 6)
        console.log("邮箱验证码：" + code)
        ctx.session.emailcode = code
        const subject = '验证码'
        const text = ''
        const html = `<a href="https://kaikeba.com"><span>${code}</span></a>`
        // 引入egg service
        const hasSend = await this.service.tools.sendMail(email, subject, text, html)
        if (hasSend) {
            this.message('发送成功')
        } else {
            this.error('发送失败')
        }
    }
    async uploadfile() {
        const { ctx } = this
        const [file] = ctx.request.files
        const { name } = ctx.request.body
        await fse.move(file.filepath, this.config.UPLOAD_DIR +"/" + file.filename)
        this.success({
            url: `/public/${file.filename}`
        })
    }
}

module.exports = UtilController