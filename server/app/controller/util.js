const BaseController = require("./base")
const svgCaptcha = require("svg-captcha")
const path = require('path')
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
    async mergeFile() {
        const { ext, hash, size } = this.ctx.request.body
        const filePath = path.resolve(this.config.UPLOAD_DIR, `${hash}.${ext}`)
        await this.ctx.service.tools.mergeFile(filePath, hash, size)
        this.success({
            url: `/public/${hash}.${ext}`
        })
    }
    async checkfile() {
        const {ctx} = this
        const {ext, hash} = ctx.request.body
        const filePath = path.resolve(this.config.UPLOAD_DIR, `${hash}.${ext}`)

        let uploaded = false
        let uploadedList = []
        if (fse.existsSync(filePath)) {
            // 文件存在
            uploaded = true 
        } else {
            uploadedList = await this.getUploadedList(path.resolve(this.config.UPLOAD_DIR, hash))
        }
        this.success({
            uploaded,
            uploadedList
        })
    }
    async getUploadedList(dirPath) {
        return fse.existsSync(dirPath) ? 
        fse.readdirSync(dirPath).filter(name => name[0] !== '.') // 规避隐藏文件
        : []
    }
    async uploadfile() {
        // 模拟报错
        // if (Math.random() > 0.2) {
            return this.ctx.status = 500
        // }
        const { ctx } = this
        const [file] = ctx.request.files
        const { hash, name } = ctx.request.body
        // /public/hash/(hahs + index) 存放chunks
        const chunkPath = path.resolve(this.config.UPLOAD_DIR, hash)
        // const filePath = path.resolve() // 文件最终存储的位置，合并之后的存储位置
        if (!fse.existsSync(chunkPath)) {
            await fse.mkdir(chunkPath)
        }
        await fse.move(file.filepath, `${chunkPath}/${name}`)
        this.message('切片上传成成功')
        // this.success({
        //     url: `/public/${file.filename}`
        // })
    }
}

module.exports = UtilController