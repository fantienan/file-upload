<template>
  <div>
    <h1>用户中心</h1>
    <div ref="drag" id="drag">
      <input type="file" name="file" @change="handleFileChange" />
    </div>
    <div>
      <el-progress :stroke-width="20" :text-inside="true" :percentage="uploadProgress"></el-progress>
    </div>
    <el-button @click="uploadFlie">上传</el-button>
    <div>计算哈希进度条</div>
    <el-progress :stroke-width="20" :text-inside="true" :percentage="hashProgress"></el-progress>
    <div>
      <!-- chunk.progress
      progress<0 报错 显示红色
      progress =100 成功
      别的数字 方块高度显示
      尽可能让方块看起来是正方形
      比如10个方块 4*4
      9 3*3
      100 10*10 -->
      <div class="cube-container" :style="{width:cubeWidth+'px'}">
        <div class="cube" v-for="chunk in chunks" :key="chunk.name">
          <div
            :class="{
              'uploading': chunk.progress>0&&chunk.progress<100,
              'success': chunk.progress==100,
              'error': chunk.progress<0
            }"
            :style="{height:chunk.progress+ '%'}"
          >
            <i
              class="el-icon-loading"
              style="color: #f56c6c"
              v-if="chunk.progress<100 && chunk.progress>0"
            ></i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import sparkMD5 from "spark-md5"
const CHUNK_SIZE = 1 * 1024 * 1024 // 切片大小
export default {
  async mounted() {
    const ret = this.$http.post("/user/info")
    this.bindEvetns()
  },
  data() {
    return {
      file: null,
      // uploadProgress: 0,
      hashProgress: 0,
      chunks: []
    }
  },
  computed: {
    cubeWidth() {
      return Math.ceil(Math.sqrt(this.chunks.length)) * 16
    },
    uploadProgress() {
      if (!this.file || this.chunks.length) {
        return 0
      }
      const loaded = this.chunks
        .map(item => item.chunk.size * item.progress)
        .reduce((acc, cur) => acc * cur, 1)
      return Number((loaded / this.file.size * 100).toFixed(2)) 
    }
  },
  methods: {
    bindEvetns() {
      const drag = this.$refs.drag
      drag.addEventListener("dragover", e => {
        drag.style.borderColor = "red"
        e.preventDefault()
      })

      drag.addEventListener("dragleave", e => {
        drag.style.borderColor = "#eee"
        e.preventDefault()
      })

      drag.addEventListener("drop", e => {
        drag.style.borderColor = "#eee"
        const fileList = e.dataTransfer.files
        this.file = fileList[0]
        e.preventDefault()
      })
    },
    blobToString(blob, isPng) {
      return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = function(e) {
          const ret = reader.result
            .split("")
            .map(v => v.charCodeAt())
            .map(v => v.toString(16).toUpperCase())
            .join(" ")
          resolve(ret)
        }
        reader.readAsBinaryString(blob)
      })
    },
    async isGif(file) {
      // 前面6个16进制：'47 49 46 38 39 61'(GIF89a) 或 '47 49 46 38 37 61'(GIF87a)
      // 16进制的转换
      const ret = await this.blobToString(file.slice(0, 6))
      const isGif = ret == "47 49 46 38 39 61" || ret == "47 49 46 38 37 61"
      return isGif
    },
    async isPng(file) {
      const ret = await this.blobToString(file.slice(0, 4))
      const isPng = ret == "89 50 4E 47"
      return isPng
    },
    async isJpg(file) {
      // FF D8 FF
      const ret = await this.blobToString(file.slice(0, 3))
      const isJpg = ret == "FF D8 FF"
      return isJpg
    },
    async isImage(file) {
      // 通过文件16进制信息判断
      return (
        (await this.isGif(file)) ||
        (await this.isPng(file)) ||
        (await this.isJpg(file))
      )
    },
    // 文件切片
    createFileThunk(file, size = CHUNK_SIZE) {
      const chunks = []
      let cur = 0
      while (cur < this.file.size) {
        chunks.push({
          index: cur,
          file: this.file.slice(cur, cur + size)
        })
        cur += size
      }
      return chunks
    },
    // web worker 计算文件md5值
    calculateHashWorker(chunks) {
      this.hashProgress = 0
      return new Promise(resolve => {
        this.worker = new Worker("/hash.js")
        this.worker.postMessage({ chunks: chunks })
        this.worker.onmessage = e => {
          const { progress, hash } = e.data
          this.hashProgress = Number(progress.toFixed(2))
          hash && resolve(hash)
        }
      })
    },
    // 时间切片计算文件md5值
    calculateHashIdle(chunks) {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer()
        let count = 0
        // 计算md5
        const appendToSpark = file => {
          return new Promise(resolve => {
            const reader = new FileReader()
            reader.readAsArrayBuffer(file)
            reader.onload = e => {
              spark.append(e.target.result)
              resolve()
            }
          })
        }
        const workLoop = async deadline => {
          // 空闲时间 且 有任务
          while (count < chunks.length && deadline.timeRemaining() > 1) {
            await appendToSpark(chunks[count].file)
            count++
            if (count < chunks.length) {
              this.hashProgress = Number(
                ((count / chunks.length) * 100).toFixed(2)
              )
            } else {
              this.hashProgress = 100
              resolve(spark.end())
            }
          }
          count < chunks.length && window.requestIdleCallback(workLoop)
        }
        window.requestIdleCallback(workLoop)
      })
    },
    // 抽样切片参考布隆过滤器的设计方法，丧失部分精度换来速度提升
    // 1个G的文件，抽样后5M以内
    async calculateHashSample() {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer()
        const reader = new FileReader()

        const file = this.file
        const size = file.size
        const offset = 1 * 1024 * 1024
        // 第一个2M，最后一个区块数据全覆盖
        let chunks = [file.slice(0, offset)]

        let cur = offset
        while (cur < size) {
          if (cur + offset >= size) {
            // 最后一个区块
            chunks.push(file.slice(cur, cur + offset))
          } else {
            // 中间的区块
            const mid = cur + offset / 2
            const end = cur + offset
            chunks.push(file.slice(cur, cur * 2))
            chunks.push(file.slice(mid, mid * 2))
            chunks.push(file.slice(end - 2, end))
          }
          cur += offset
        }
        // 中间的取前中后个2个字节
        reader.readAsArrayBuffer(new Blob(chunks))
        reader.onload = e => {
          spark.append(e.target.result)
          this.hashProgress = 100
          resolve(spark.end())
        }
      })
    },
    async uploadFlie() {
      // 根据16进制格式校验
      // if (!(await this.isImage(this.file))) {
      //   console.log("文件格式不正确")
      //   return
      // } else {
      //   console.log("格式正确")
      // }
      /**
       * 大文件断点续传、计算文件指纹（防止文件名称重复）
       * 1. 文件切片
       * 2. 计算文件md5值
       *    1. 运用web worker、spark-md5（支持增量计算md5）计算文件md5值
       *    2. 时间切片计算md5值
       *    3. @TODO 抽样切片然后合并后进行计算md5值(布隆过滤器)
       * **/
      // 1.
      const chunks = this.createFileThunk(this.file)
      // 2.1
      // const hash1 = await this.calculateHashWorker(chunks)
      // const hash2 = await this.calculateHashIdle(chunks)
      // console.log("hash1", hash1)
      // console.log("hash2", hash2)
      const hash = await this.calculateHashSample()
      this.hash = hash
      this.chunks = chunks.map((chunk, index) => {
        // 文件切片的名字 hash + index
        const name = hash + "-" + index
        return {
          hash,
          name,
          index,
          chunk: chunk.file,
          progress: 0
        }
      })
      await this.uploadChunks()
    },
    // 上传切片
    async uploadChunks() {
      const requests = this.chunks
        .map((chunk, index) => {
          // 转成promise
          const form = new FormData()
          form.append("chunk", chunk.chunk)
          form.append("hash", chunk.hash)
          form.append("name", chunk.name)
          // form.append('index', chunk.index)
          return form
        })
        .map((form, index) =>
          this.$http.post("/uploadFile", form, {
            onUploadProgress: progress => {
              // 不是整体的进度条，而是每个区块自己的进度条，整体的进度条需要计算
              this.chunks[index].progress = Number(
                ((progress.loaded / progress.total) * 100).toFixed(2)
              )
            }
          })
        )
      // @todo 并发控制
      await Promise.all(requests)
      await this.mergeRequest()
      // const form = new FormData()
      // form.append("name", "file")
      // form.append("file", this.file)
      // const ret = await this.$http.post("/uploadFile", form, {
      //   onUploadProgress: progress => {
      //     const { loaded, total } = progress
      //     this.uploadProgress = Number(((loaded / total) * 100).toFixed(2))
      //   }
      // })
    },
    async mergeRequest() {
      this.$http.post('/mergeFile', {
        ext: this.file.name.split('.').pop(),
        size: CHUNK_SIZE,
        hash: this.hash
      })
    },
    handleFileChange(e) {
      const [file] = e.target.files
      if (!file) {
        return
      }
      this.file = file
    }
  }
}
</script>
<style lang="stylus">
#drag
  height: 100px
  line-height: 100px
  border: 2px #eee dashed
  text-align: center
.cube-container 
  .cube
    width 14px
    height 14px
    line-height 12px
    border 1px solid black 
    background #eee
    float left 
    >.success
      background green
    >.oploading
      background blue
    >.error
      background red
</style>