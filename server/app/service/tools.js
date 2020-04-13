const { Service } = require('egg')
const fse = require('fs-extra')
const path = require('path')
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
    async mergeFile(filePath, hash, size) {
        const chunkDir = path.resolve( filePath) // 切片文件夹
        const chunks = await fse.readdir(chunkDir)
        chunks.sort((a, b) => a.split('-')[1] - b.split('-')[1])
        chunks.map(cp => path.resolve(chunkDir, cp))
        await this.mergeChunks(chunks, filePath, size)
    }
    async mergeChunks(files, dest, size) {
        const pipStream = (filePath, writeStream) => new Promise(resolve => {
            const readStream = fse.createReadStream(filePath)
            readStream.on('end', () => {
                fse.unlinkSync(filePath)
                resolve()
            })
            readStream.pipe(writeStream)
        })

        await Promise.all(
            files.map((file, index) => {
                pipStream(file, fse.createWriteStream(dest, {
                    start: index * size,
                    end: (index + 1) * size
                }))
            })
        )
    }
}

module.exports = ToolService