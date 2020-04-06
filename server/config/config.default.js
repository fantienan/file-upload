/* eslint valid-jsdoc: "off" */

'use strict'
const path = require('path')
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
  /**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
  const config = exports = {}

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1584778164513_3540'

  // add your middleware config here
  config.middleware = []
  config.mongoose = { // 数据库配置
    client: {
      url: 'mongodb://127.0.0.1:27017/tthub',
      options: {}
    }
  }
  config.security = {
    csrf: {
      enable: false, // 关闭egg内置的安全系统
    }
  }
  config.jwt = {
    secret: '@1ffKKpe_-=' // 解密字符串
  }
  // 上传文件
  config.multipart = {
    mode: 'file',
    whitelist: () => true // 白名单
  }
  // 配置静态目录
  config.UPLOAD_DIR = path.resolve(__dirname, '..', 'app/public')
  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  }

  return {
    ...config,
    ...userConfig,
  }
}
