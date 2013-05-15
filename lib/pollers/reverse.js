/**
 * Module dependencies.
 */

var util = require('util');
var http = require('http');
var url = require('url');
var BasePoller = require('./base');
var HttpsPoller = require('./https');

/**
 * Poller constructor
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this
 * duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
function ReversePoller(check, config, callback) {
	this.check = check;
	this.config = config;
	// timeout defaults to 5 mins
	var timeout = config.timeout || 1000 * 60 * 5;

	ReversePoller.super_.call(this, check.url, timeout, callback);
}

util.inherits(ReversePoller, BasePoller);

ReversePoller.prototype.initialize = function() {
	if ( typeof (this.target) == 'string') {
		this.target = url.parse(this.target);
	}
};

/**
 * Set the User Agent, which identifies the poller to the outside world
 *
 * @param {String} user agent
 * @api   public
 */
ReversePoller.prototype.setUserAgent = function(userAgent) {
	if ( typeof this.target.headers == 'undefined') {
		this.target.headers = {};
	}
	this.target.headers['User-Agent'] = userAgent;
};

/**
 * Launch the actual polling
 *
 * @api   public
 */
ReversePoller.prototype.poll = function() {
	ReversePoller.super_.prototype.poll.call(this);
	var options = url.parse(this.config.apiUrl + '/pings/check/' + this.check._id);
	this.request = http.get(options, this.onResponseCallback.bind(this));
	this.request.on('error', this.onErrorCallback.bind(this));
};

/**
 * Response callback
 *
 * Note that all responses may not be successful, as some return non-200 status
 * codes,
 * and others return too slowly.
 * This method handles redirects.
 *
 * @api   private
 */
ReversePoller.prototype.onResponseCallback = function(res) {
	var statusCode = res.statusCode;
	var poller = this;
	if (statusCode == 200) {
		var body = '';
		this.debug(this.getTime() + "ms - Status code 200 OK");
		res.on('data', function(chunk) {
			body += chunk.toString();
			poller.debug(poller.getTime() + 'ms - BODY: ' + chunk.toString().substring(0, 100) + '...');
		});
		res.on('end', function() {
			// reverse poller expects JSON
			var pings = JSON.parse(body);
			if (!pings.length) {
				poller.onErrorCallback({
					name: "NoPingsForCheck",
					message: "No Pings Found"
				});
				return;
			}
			var latestPing = pings[0];

			if ((new Date() - new Date(latestPing.timestamp)) > poller.check.interval) {
				poller.onErrorCallback({
					name: "ReversePingTimeout",
					message: "Timeout Exceeded"
				});
			} else {
				poller.timer.stop();
				poller.debug(poller.getTime() + "ms - Request Finished");
				poller.callback(undefined, latestPing.time.toString());
			}
		});
	} else {
		this.request.abort();
		this.onErrorCallback({
			name: "NonOkStatusCode",
			message: "HTTP status " + statusCode
		});
	}
};

/**
 * Timeout callback
 *
 * @api   private
 */
ReversePoller.prototype.timeoutReached = function() {
	ReversePoller.super_.prototype.timeoutReached.call(this);
	this.request.removeAllListeners('error');
	this.request.on('error', function() {/* swallow error */
	});
	this.request.abort();
};

module.exports = ReversePoller;
