<template>
  <div>
    <!-- <div contenteditable="true">
          haha
      </div>
    document.execCommand('')-->

    <div class="write-btn">
      <el-button @click="submit" type="primary">提交</el-button>
    </div>
    <el-row>
      <el-col :span="12">
        <!-- markdown编辑器的基本操作 -->
        <textarea ref="editor" class="md-editor" :value="content" @input="update"></textarea>
      </el-col>
      <el-col :span="12">
        <div class="markdown" v-html="compiledContent"></div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import marked from "marked";
import hljs from "highlight.js";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/monokai-sublime.css";
/**
 * 富文本编辑器（待扩展）
 * 1. 刚开始用第三方：tinyMce,wangEditor
 * 2. 开源定制：slate.js
 * 3. 有专门的富文本编辑器开发团队，自己定制版非常复杂
 * **/
/**
 * marked编辑器
 * 1. marked、highlight.js
 * 2. 赋值粘贴、拖拽上传文件
 *
 * **/
export default {
  data() {
    return {
      content: `# 今天
* 学习
* 游戏
* 睡觉
\`\`\`javascript
let a = 9;
console.log(a)
\`\`\`
`
    };
  },
  computed: {
    compiledContent() {
      return marked(this.content, {});
    }
  },
  mounted() {
    this.timer = null;
    this.bindEvents();
    // 设置默认配置
    marked.setOptions({
      rendered: new marked.Renderer(),
      highlight(code) {
        hljs.highlightAuto(code);
      }
    });
  },
  methods: {
    async submit() {
      let ret = await this.$http.post("/article/create", {
        contnet: this.contnet,
        compiledContent: this.compiledContent
      });
    },
    update(e) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.content = e.target.value;
      }, 350);
    },
    bindEvents() {
      // 监听粘贴事件，粘贴上传图片
      this.$refs.editor.addEventListener("paste", async e => {
        const files = e.clipboardData.files;
      });
      this.$refs.editor.addEventListener("drop", async e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
      });
    }
  }
};
</script>
<style scoped>
.md-editor {
  width: 100%;
  height: 100vh;
  outline: none;
}
.writer-btn {
  position: fixed;
  z-index: 100;
  right: 30px;
  top: 10px;
}
</style>