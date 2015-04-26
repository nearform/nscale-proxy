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

var fs = require('fs');
var _ = require('lodash');

module.exports = function() {


  var readIpDetails = function readIpDetails(analyzed, c) {
    var containers = analyzed.topology.containers;
    var ipaddress;
    var port;

    if (c.specific && c.specific.servicePort) {
      port = c.specific.servicePort;
      if (c.containedBy && containers[c.containedBy] && containers[c.containedBy].specific) {
        ipaddress = containers[c.containedBy].specific.privateIpAddress || containers[c.containedBy].specific.ipAddress;
      }
    }
    return {ipaddress: ipaddress, port: port};
  };



  /**
   * transform the topology into a format for haproxy config generation
   *
   * {
   *  services: [
   *    {name: 'asdf',
   *     port: 1234,
   *     nodes: [{ ipaddress: '1.2.3.4' port: 2233 }
   *             { ipaddress: '1.2.3.5' port: 2233 }]},
   *    {name: 'abcd',
   *     port: 1212,
   *     nodes: [{ ipaddress: '1.2.3.4' port: 8881}
   *             { ipaddress: '1.2.3.5' port: 8882}]},
   *    ]
   * }
   */
  var transformTopology = function transformTopology(analyzed) {
    var services = [];

    _.each(analyzed.containerDefinitions, function(cdef) {
      if (cdef.type === 'docker' && cdef.specific && cdef.specific.proxyPort) {

        var containers = _.filter(analyzed.topology.containers, function(c) { return c.containerDefinitionId === cdef.id; });

        var nodes = [];
        _.each(containers, function(c) {
          var ip = readIpDetails(analyzed, c);
          if (ip.ipaddress && ip.port) {
            nodes.push(ip);
          }
        });

        if (nodes.length > 0) {
          services.push({name: cdef.name, port: cdef.specific.proxyPort, nodes: nodes});
        }
      }
    });
    return services;
  };



  /**
   * generate new nginx configuration from an nscale analysis file
   */
  var generate = function generate(analyzed, cb) {
    var tmpl;
    var services;

    services = transformTopology(analyzed);
    fs.readFile(__dirname + '/hap.tmpl', 'utf8', function(err, templateString) {
      if (err) { return cb(err); }
      tmpl = _.template(templateString);
      cb(null, tmpl({services: services}));
    });
  };



  return {
    generate: generate,
  };
};

