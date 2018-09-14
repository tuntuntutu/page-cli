const download = require('download-git-repo')
const ora = require('ora')
const path = require('path')

module.exports = (target) => {
  target = path.join(target || '.', '.download-temp')

  return new Promise((resolve, reject) => {
    const url = 'http://git.51caocao.cn:caocao-center/c3-page-template'
    const spinner = ora(`正在下载项目模板，源地址：${url}`)

    spinner.start()

    download(url, target, {clone: true}, (err) => {
      if (err) {
        spinner.fail()
        reject(err)
      } else {
        spinner.succeed()
        resolve(target)
      }
    })
  })
}