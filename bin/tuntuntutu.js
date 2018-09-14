#!/usr/bin/env node
const program = require('commander')

program.version('1.0.0')
	.usage('<command> [项目名称]')
	.command('init', '新建页面')
	.parse(process.argv)
