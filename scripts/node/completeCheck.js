#!/usr/bin/node
main();

async function main() {
	const checkId = process.env.CHECK_ID;
	const githubAction = require('@actions/github');
	const pullRequest = githubAction.context.payload.pull_request;
	const check = require('./check.js');
	let data = check.getExisting(pullRequest, checkId);
	/*data.status = 'completed';
	data.conclusion = 'success';*/
	const github = require('./github.js');

	const fs = require('fs');
	const results = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
	let annotations = [];
	results.forEach( (file) => {
		file.violations.forEach( (violation) => {
			annotations.push({
				path: file.fileName,
				annotation_level: (violation.severity <= 2 ? 'failure' : (violation.severity > 3 ? 'notice' : 'warning')),
				start_line: parseInt(violation.line),
				// start_column: parseInt(violation.column),
				end_line: parseInt(violation.endLine),
				// end_column: parseInt(violation.endColumn),
				message: violation.message.trim()//`${violation.message.trim()}\n${violation.url}`,
				//title: violation.ruleName
			});
		});
	});
	data.output = {
		title: 'Salesforce Code Quality',
		summary: 'Complete',
		annotations: annotations
	}
	return await github.annotate(data);
}