var http = require('http');
var url = require('url');

function ping() {
	var payload = {
		path: '4f74e33d9264ed229d5a20e8',
		status: 'true',
		timestamp: Date.now(),
		name: 'test',
		type: 'reverse',
		error: ''
	};
	var body = JSON.stringify(payload);
	var options = url.parse('http://localhost:3000/api/pings');
	options.method = 'POST';
	options.headers = {
		'Content-Type': 'application/json',
		'Content-Length': body.length
	};
	var req = http.request(options, function(res) {
		res.setEncoding('utf-8');
		var responseString = '';
		res.on('data', function(data) {
			responseString += data;
		});
		res.on('end', function() {
			console.log(JSON.parse(responseString));
			console.log('Ping @ ' + new Date().toLocaleTimeString());
		});
	});
	req.on('error', function(err) {
		// TODO: handle error.
		console.log(err.code + ' @ ' + new Date().toLocaleTimeString());
	});
	req.write(body);
	req.end();
}

setInterval(ping, 5000);
