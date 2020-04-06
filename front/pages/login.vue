<template>
  <div class="login-container">
    <el-form class="login-form" label-width="100px" :model="form" :rules="rules" ref="loginForm">
      <div class="title-container"></div>
      <el-form-item prop="email" label="邮箱">
        <el-input v-model="form.email" placeholder="请输入邮箱"></el-input>
      </el-form-item>
      <el-form-item prop="captcha" label="验证码" class="captcha-item">
        <el-input v-model="form.captcha" class="captcha-input" placeholder="请输入验证码"></el-input>
		<div class="captcha">
          <img :src="code.captcha" alt @click="resetCaptcha" />
        </div>
      </el-form-item>

      <el-form-item prop="emailCode" label="邮箱验证码" class="email-code-container">
        <el-input v-model="form.emailCode" placeholder="请输入邮箱验证码"></el-input>
        <el-button :disabled="send.timer > 0" @click="sendEmailCode" type="primary">{{sendText}}</el-button>
      </el-form-item>

      <el-form-item prop="passwd" label="密码">
        <el-input type="password" v-model="form.passwd" placeholder="请输入密码"></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click.native.prevent="handleLogin">登录</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import md5 from "md5";
export default {
  layout: "login",
  methods: {
    async sendEmailCode() {
		await this.$http.get('/sendcode?email=' + this.form.email)
		this.send.timer = 10
		this.timer = setInterval(() => {
			this.send.timer -= 1
			if (this.send.timer == 0) {
				clearInterval(this.timer)
			}
		}, 1000)
	},
    handleLogin() {
      this.$refs.loginForm.validate(async valid => {
        if (valid) {
          const param = {
            email: this.form.email,
            passwd: md5(this.form.passwd),
            captcha: this.form.captcha,
            emailCode: this.form.emailCode,
          };
          let ret = await this.$http.post("/user/login", param);
          if (ret.code == 0) {
			this.$message("登录成功");
			localStorage.setItem('token', ret.data.token)
            setTimeout(() => {
              this.$router.push("/");
            }, 500);
          } else {
            this.$message.error(ret.message);
          }
        } else {
          console.log("验证失败");
        }
      });
    },
    resetCaptcha() {
      this.code.captcha = "/api/captcha?_t" + new Date().getTime();
    }
  },
  computed: {
    sendText() {
      if (this.send.timer <= 0) {
        return "发送";
      } else {
        return `${this.send.timer}s后发送`;
      }
    }
  },
  data() {
    return {
      send: {
        timer: 0
      },
      form: {
        email: "363982607@qq.com",
        passwd: "123456789",
        captcha: ""
      },
      rules: {
        email: [
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入正确的邮箱格式" }
        ],
        captcha: [{ required: true, message: "请输入验证码" }],
        emailCode: [{ required: true, message: "请输入邮箱验证码" }],
        passwd: [
          {
            required: true,
            parrern: /^[\w_-]{6,12}$/g,
            message: "请输入6~12密码"
          }
        ]
      },
      code: {
        captcha: "/api/captcha"
      }
    };
  }
};
</script>

<style lang="stylus">
	.captcha-item, .email-code-container
		.el-form-item__content
			display flex
	.email-code-container
		.el-button
			width 100px
			margin-left 14px		

</style>