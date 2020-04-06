const { Service } = require('egg')
const nodemailer = require('nodemailer')

const userEmail = 'fantienanvip@163.com'
const transporter = nodemailer.createTransport({
    secvice: "163",
    secureConnection: false,
    port: 465,
    // secure: true, // use SSL
    auth: {
        user: userEmail,
        pass: 'a123456789'
    }
})

class ToolService extends Service {
    // 发送邮件
    async sendMail(email, subject, text, html) {
        const emailOptions = {
            from: userEmail,
            cc: userEmail,
            to: email,
            subject,
            text,
            html
        }
        try {
            await transporter.sendMail(emailOptions)
            return true
        } catch (err) {
            // console.log('send email error', err)
            return false
        }
    }
}

module.exports = ToolService