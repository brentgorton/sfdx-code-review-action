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
	let summary = {};
	let severities = [new Set(),new Set(),new Set(),new Set(),new Set()];
	const severityHeaders = ['Critical', 'Error', 'Warning', 'Info', 'Hint'];
	let reportContent = '## Files\n';
	results.forEach( (file) => {
		reportContent += `### ${file.fileName}\n`;
		reportContent += '<table><tr><th>Violation</th><th>Rule</th><th>Severity</th><th>Line</th></tr>\n';
		// reportContent += '--- | --- | --- | ---\n';
		file.violations.forEach( (violation) => {
			reportContent += `${violation.message.trim()} | ${violation.ruleName} | ${violation.severity} | ${violation.line}\n`;
			let a = {
				path: file.fileName.replace(process.env.GITHUB_WORKSPACE + '/', ''),
				annotation_level: (violation.severity <= 1 ? 'failure' : (violation.severity > 2 ? 'notice' : 'warning')),
				start_line: parseInt(violation.line),
				end_line: parseInt(violation.endLine),
				message : `${violation.message.trim()}\n${violation.url}`,
				title: `${violation.category} : ${violation.ruleName}`
			};
			if(violation.line === violation.endLine) {
				a.start_column = parseInt(violation.column);
				a.end_column = parseInt(violation.endColumn);
			}

			annotations.push(a);
			if(!summary[violation.ruleName]) {
				summary[violation.ruleName] = {
					count: 0,
					severity: violation.severity,
					ruleName: violation.ruleName
				};
			}
			summary[violation.ruleName].count++;
			severities[violation.severity - 1].add(violation.ruleName);
		});
		reportContent += '<tr><td><img width="600" height="1" /></td><td><img width="200" height="1" /></td><td><img width="100" height="1" /></td><td><img width="100" height="1" /></td></tr></table>\n';
	});
	let summaryText = '';
	for(let i = 0; i < severities.length; i++) {
		if(severities[i].size > 0) {
			summaryText += `### ${severityHeaders[i]}\n`;
			summaryText += '<table><tr><th>Rule Name</th><th>Count</th></tr>\n';
			//summaryText += '--- | ---\n';
			for(const ruleName of [...severities[i]].sort()) {
				summaryText += `<tr><td>${summary[ruleName].ruleName}</td><td>${summary[ruleName].count}</td></tr>\n`;
			}
			summaryText += '<tr><td><img width="900" height="1" /></td><td><img width="100" height="1" /></td></tr</table>\n';
		}

	}

	if(severities[0].size > 0){
		data.conclusion = 'failure';
	} else if (severities[1].size > 0) {
		data.conclusion = 'action_required';
	} else if (severities[2].size > 0 || severities[3].size > 0) {
		data.conclusion = 'neutral';
	} else {
		data.conclusion = 'success';
	}

	const testTable = `<table>
	<tr>
	  <td><img width="500" height="1" /><p>One</p></td>
	  <td><img width="100" height="1" /><p>Two</p></td>
	</tr>
	<tr>
	  <td colspan="2">Three</td>
	</tr>
  </table>`
	data.output = {
		title: 'Code Quality Report',
		summary: summaryText + '\n\n' + reportContent + '\n\n' + testTable,
		annotations: annotations
	}
	return await github.annotate(data);
}