'use strict'

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller, middleware } = app
  const jwt = middleware.jwt({ app })
  router.get('/', controller.home.index)

  // 验证码
  router.get('/captcha', controller.util.captcha)
  // 邮箱验证码
  router.get('/sendcode', controller.util.sendcode)
  // 文件上传
  router.post('/uploadFile', controller.util.uploadfile)
  // 合并文件chunks
  router.post('/mergeFile', controller.util.mergeFile)
  // 断点续传
  router.post('/checkfile', controller.util.checkfile)
  // 注册路由
  router.group({ name: 'user', prefix: '/user' }, router => {
    const { info, register, login, verify } = controller.user

    router.post('/register', register)
    router.post('/login', login)
    // 暂时只对info接口进行token校验
    router.post('/info', jwt, info)
    router.post('/verify', verify)
  })
}
