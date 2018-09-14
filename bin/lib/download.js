const download = require('download-git-repo')
const ora = require('ora')
const path = require('path')

module.exports = (target) => {
  target = path.join(target || '.', '.download-temp')

  return new Promise((resolve, reject) => {
    const url = 'github:tuntuntutu/tuntuntutu-cli-templates'
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