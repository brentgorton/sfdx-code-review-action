#!/usr/bin/node
main();

async function main() {
	const checkId = process.env.CHECK_ID;
	const githubAction = require('@actions/github');
	const pullRequest = githubAction.context.payload.pull_request;
	const check = require('./check.js');
	let data = check.getExisting(pullRequest, checkId);
	data.status = 'completed';
	data.conclusion = 'success';
	const github = require('./github.js');

	const fs = require('fs');
	const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
	let annotations = [];
	let actionRequired = false;
	results.forEach( (file) => {
		file.violations.forEach( (violation) => {
			let a = {
				path: file.fileName.replace(process.env.GITHUB_WORKSPACE, ''),
				annotation_level: (violation.severity <= 2 ? 'failure' : (violation.severity > 3 ? 'notice' : 'warning')),
				start_line: parseInt(violation.line),
				end_line: parseInt(violation.endLine),
				message: `${violation.message.trim()}\n${violation.url}`,
				title: violation.ruleName
			};
			if(violation.line === violation.endLine) {
				a.start_column = parseInt(violation.column);
				a.end_column = parseInt(violation.endColumn);
			}
			if (violation.severity <= 4) {
				actionRequired = true;
			}
			annotations.push(a);
		});
	});
	if(actionRequired) {
		data.conclusion = 'action_required';
	}
	data.output = {
		title: 'Salesforce Code Quality',
		summary: 'Complete',
		annotations: annotations
	}
	console.log(annotations);
	return await github.annotate(data);
}