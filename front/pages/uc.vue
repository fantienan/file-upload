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
  </div>
</template>

<script>
import sparkMD5 from "spark-md5";
const CHUNK_SIZE = 1 * 1024 * 1024; // 切片大小
export default {
  async mounted() {
    const ret = this.$http.post("/user/info");
    this.bindEvetns();
  },
  data() {
    return {
      file: null,
      uploadProgress: 0,
      hashProgress: 0,
      chunks: []
    };
  },
  methods: {
    bindEvetns() {
      const drag = this.$refs.drag;
      drag.addEventListener("dragover", e => {
        drag.style.borderColor = "red";
        e.preventDefault();
      });

      drag.addEventListener("dragleave", e => {
        drag.style.borderColor = "#eee";
        e.preventDefault();
      });

      drag.addEventListener("drop", e => {
        drag.style.borderColor = "#eee";
        const fileList = e.dataTransfer.files;
        this.file = fileList[0];
        e.preventDefault();
      });
    },
    blobToString(blob, isPng) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const ret = reader.result
            .split("")
            .map(v => v.charCodeAt())
            .map(v => v.toString(16).toUpperCase())
            .join(" ");
          resolve(ret);
        };
        reader.readAsBinaryString(blob);
      });
    },
    async isGif(file) {
      // 前面6个16进制：'47 49 46 38 39 61'(GIF89a) 或 '47 49 46 38 37 61'(GIF87a)
      // 16进制的转换
      const ret = await this.blobToString(file.slice(0, 6));
      const isGif = ret == "47 49 46 38 39 61" || ret == "47 49 46 38 37 61";
      return isGif;
    },
    async isPng(file) {
      const ret = await this.blobToString(file.slice(0, 4));
      const isPng = ret == "89 50 4E 47";
      return isPng;
    },
    async isJpg(file) {
      // FF D8 FF
      const ret = await this.blobToString(file.slice(0, 3));
      const isJpg = ret == "FF D8 FF";
      return isJpg;
    },
    async isImage(file) {
      // 通过文件16进制信息判断
      return (
        (await this.isGif(file)) ||
        (await this.isPng(file)) ||
        (await this.isJpg(file))
      );
    },
    // 文件切片
    createFileThunk(file, size = CHUNK_SIZE) {
      const chunks = [];
      let cur = 0;
      while (cur < this.file.size) {
        chunks.push({
          index: cur,
          file: this.file.slice(cur, cur + size)
        });
        cur += size;
      }
      return chunks;
    },
    // web worker 计算文件md5值
    calculateHashWorker() {
      this.hashProgress = 0;
      return new Promise(resolve => {
        this.worker = new Worker("/hash.js");
        this.worker.postMessage({ chunks: this.chunks });
        this.worker.onmessage = e => {
          const { progress, hash } = e.data;
          this.hashProgress = Number(progress.toFixed(2));
          hash && resolve(hash);
        };
      });
    },
    // 时间切片计算文件md5值
    calculateHashIdle() {
      return new Promise(resolve => {
        const spark = new sparkMD5.ArrayBuffer();
        let count = 0;
        // 计算md5
        const appendToSpark = file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = e => {
              spark.append(e.target.result);
              resolve();
            };
          });
        };
        const workLoop = async deadline => {
          // 空闲时间 且 有任务
          while (count < this.chunks.length && deadline.timeRemaining() > 1) {
            await appendToSpark(this.chunks[count].file);
            count++;
            if (count < this.chunks.length) {
              this.hashProgress = Number((count/this.chunks.length * 100).toFixed(2))
            } else {
              this.hashProgress = 100
              resolve(spark.end())
            }
          }
          count < this.chunks.length && window.requestIdleCallback(workLoop)
        };
        window.requestIdleCallback(workLoop)
      });
    },
    async uploadFlie() {
      // 根据16进制格式校验
      if (!(await this.isImage(this.file))) {
        console.log("文件格式不正确");
        return;
      } else {
        console.log("格式正确");
      }
      /**
       * 大文件断点续传、计算文件指纹（防止文件名称重复）
       * 1. 文件切片
       * 2. 计算文件md5值
       *    1. 运用web worker、spark-md5（支持增量计算md5）计算文件md5值
       *    2. 时间切片计算md5值
       *    3. @TODO 抽样切片然后合并后进行计算md5值
       * **/
      // 1.
      this.chunks = this.createFileThunk(this.file);
      // 2.1
      const hash = await this.calculateHashWorker();
      const hash1 = await this.calculateHashIdle();
      console.log("hash", hash);
      console.log("hash1", hash1);
      return;
      const form = new FormData();
      form.append("name", "file");
      form.append("file", this.file);
      const ret = await this.$http.post("/uploadFile", form, {
        onUploadProgress: progress => {
          const { loaded, total } = progress;
          this.uploadProgress = Number(((loaded / total) * 100).toFixed(2));
        }
      });
    },
    handleFileChange(e) {
      const [file] = e.target.files;
      if (!file) {
        return;
      }
      this.file = file;
    }
  }
};
</script>
<style lang="stylus">
#drag {
  height: 100px;
  line-height: 100px;
  border: 2px #eee dashed;
  text-align: center;
}
</style>