/**
 * DNS lookup cache
 *
 * Eliminate dns lookup conflicts according to: https://github.com/joyent/node/issues/7729
 * @author devswede@gmail.se (Reine Olofsson)
 * @return {object} Expose public accessible methods.
 */

(function(exports, module) {
  'use strict';

  var dns = require('dns'),
      cacheTtl = 5000,
      dnsCache = {};

  module.exports = function(ttl) {

    cacheTtl = ttl || cacheTtl;

    /***
     * Add cache support on top of default dns.lookup functionality
     */
    dns._lookup = dns.lookup;

    /***
     * Extend dns.lookup functionality
     */
    dns.lookup = function(hostname, options, callback) {
      let key = hostname,
          ip;

      if (!callback) {
        callback = options;
        options = undefined;
      } else if (typeof options === 'object') {
        key = key + (options.family || '-') + (options.hints || '-') + (options.all || '-');
      } else if (options) {
        key = key + options;
      }

      ip = dnsCache[key];
      if (ip && ip.ttl >= Date.now()) {

        // Return cached ip address
        return process.nextTick(function() {
		  if(Array.isArray(ip.address))
		  {
			ip.arguments[1]=JSON.parse(JSON.stringify(ip.address));		
		  }
		 
          callback.apply(null, ip.arguments);
        });

      } else {

        if (ip) {
          dnsCache[key].ttl = Date.now() + cacheTtl;
        }

        // Perform default lookup and cache result
        dns._lookup(hostname, options, function(err, address, family) {
          if (!err) {
            //Do not cache unsuccessful look-ups, backup the address object/array
            dnsCache[key] = {arguments: arguments, ttl: (Date.now() + cacheTtl), address: address};
			const el = dnsCache[key]; 
		    if(Array.isArray(el.address))
		    {
			  //put a copy of the address array in the argument list of the callback
			  arguments[1]=JSON.parse(JSON.stringify(el.address)); 			
		    }
          }
		 
          callback.apply(null, arguments);
        });

      }
    };
  }

})(exports, module);
