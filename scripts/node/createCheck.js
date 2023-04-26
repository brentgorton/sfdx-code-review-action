#!/usr/bin/node
main();

async function main() {
	const githubAction = require('@actions/github');
	const core = require('@actions/core');
	const pullRequest = githubAction.context.payload.pull_request;
	const check = require('./check.js');
	const checkData = check.generate(pullRequest);
	const github = require('./github.js');
	const checkId = await github.createCheck(checkData);
	core.exportVariable('CHECK_ID', checkId);
}
