# 同构文件上传

## 特点
> 拖拽上传、普通上传、复制粘贴上传
> 通过文件的十六进制信息进行文件校验
> 断点续传
> 计算文件指纹（web worker、时间切片）
> 并发数据
> 慢启动

## 解析
1. 拖拽上传、复制粘贴上传、普通上传
2. 通过文件16进制信息进行文件校验
   - 文件格式
   - 文件大小
   - 图片尺寸
3. 切片上传
   - 指定切片大小对文件切片
   - 每个切片都有自己的唯一id（文件指纹 + 切片索引值）
4. 计算文件指纹（解决md5计算高能耗问题）
   - 根据文件内容计算md5值（chunks）
   - 增量计算md5（spark-md5）
   - 影分身（web worker）
   - 时间切片，利用浏览器空闲时间（window.requestIdleCallback）
   - 抽样切片合并后进行计算md5（布隆过滤器）
5. 文件切片、文件指纹是实现断点续传的前置条件
6. 断点续传
   - 文件上传过（秒传）
   - 切片上传过（上传没有上传过的切片）
   - 都没有
7. 切片上传并发控制
   - 并发极限（limit）
   - 并发任务（task）
   - 上个请求结束后，发起下个请求
   - 持续发送请求直到所有切片都上传完
8. 区块上传报错（http status 500）重试机制
   - 设置每个切片重试次数，超过重试次数则不再重试
   - 报错的切片进度条飘红
9. 网速控制
   - 参考TCP慢启动策略
   - 根据当前网速情况动态调整切片大小

## front

> My bedazzling Nuxt.js project

## Build Setup

```bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn dev

# build for production and launch server
$ yarn build
$ yarn start

# generate static project
$ yarn generate
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).