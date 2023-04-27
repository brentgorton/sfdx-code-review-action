#!/usr/bin/node
main();

async function main() {
	if(process.argv.length < 4) {
		_error();
	}

	switch(process.argv[2].toLowerCase()) {
		case 'check':
			return check();
		default:
			_error();
	}

}

async function check() {
	const check = require('./check.js');
	if(process.argv.length === 4 && process.argv[3].toLowerCase() === 'init'){
		return check.init();
	} else if(process.argv.length === 5 && process.argv[3].toLowerCase() === 'upload') {
		return check.uploadReport(process.argv[4]);
	} else {
		_error();
	}
}

function _error(){
	console.error('Invalid command');
	console.error('Usage: node createCheck.js check init');
	console.error('Usage: node createCheck.js check upload <report.json>');
	process.exit(1);
}
