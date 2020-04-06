'use strict'

/** @type Egg.EggPlugin */
// module.exports = {
//   // had enabled by egg
//   // static: {
//   //   enable: true,
//   // }
// }
// 下载插件配置
exports.mongoose = {
  enable: true,
  package: 'egg-mongoose'
}
exports.routerGroup = {
  enable: true,
  package: 'egg-router-group'
}
exports.validate = {
  enable: true,
  package: 'egg-validate'
}
