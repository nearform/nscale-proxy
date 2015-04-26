/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var async = require('async');
var portscanner = require('portscanner');
var sshCheck = require('nscale-util').sshcheck();
var forwarder = require('remote-forwarder');
var path = require('path');
var POLL_INTERVAL = 5000;
var MAX_POLLS = 30;


module.exports = function(config, commands, logger) {
  var ssh = require('nscale-util').sshexec();
  var pollCount = 0;

  /*
  function createTunnel(mode, user, identity, host, cb) {
    var forwarderOpts = {
      target: host,
      identityFile: identity,
      user: user,
      port: config.registryPort,
      retries: 20
    };

    var forward = forwarder(forwarderOpts);

    logger.debug(forwarderOpts, 'setting up SSH tunnel');

    forward.once('connect', function() {
      logger.info(forwarderOpts, 'SSH tunnel setted up');
      cb(null, forward);
    });

    forward.on('reconnect failed', function() {
      logger.warn(forwarderOpts, 'unable to set up the SSH tunnel');
      cb(new Error('unable to set up tunnel'));
    });

    if (mode === 'preview') {
      // we are running in preview mode
      // don't set up the tunnel, be fast
      cb(null, forward);
    } 
    else {
      forward.start();
    }
  }
  */



  var pollForConnectivity = function(mode, user, sshKeyPath, ipaddress, out, cb) {
    if (mode !== 'preview' && ipaddress && ipaddress !== '127.0.0.1' && ipaddress !== 'localhost') {
      logger.info({
        user: user,
        identityFile: sshKeyPath,
        ipAddress: ipaddress
      }, 'waiting for connectivity');

      portscanner.checkPortStatus(22, ipaddress, function(err, status) {
        if (status === 'closed') {
          if (pollCount > MAX_POLLS) {
            pollCount = 0;
            cb('timeout exceeded - unable to connect to: ' + ipaddress);
          }
          else {
            pollCount = pollCount + 1;
            setTimeout(function() { pollForConnectivity(mode, user, sshKeyPath, ipaddress, out, cb); }, POLL_INTERVAL);
          }
        }
        else if (status === 'open') {
          pollCount = 0;
          sshCheck.check(ipaddress, user, sshKeyPath, out, function(err) {
            cb(err);
          });
        }
      });
    }
    else {
      cb();
    }
  };



  /**
   * generate new nginx configuration from an nscale analysis file
   */
  var generate = function generate(analyzed, cb) {
    gen.generate(analyzed, cb);
  };



  /**
   * push the updated config to a container and hup haproxy
   */
  var hupAll = function hup(analyzed, cb) {
  };


  return {
    generate: generate,
    hup: hup
  };
};

