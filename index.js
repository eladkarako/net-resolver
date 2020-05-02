"use strict";


function natural_compare(a, b) {
  var ax = []
     ,bx = []
     ;

  a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
  b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });

  while(ax.length && bx.length) {
    var an, bn, nn;
    an = ax.shift();
    bn = bx.shift();
    nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
    if(0 !== nn) return nn;
  }

  return ax.length - bx.length;
}


const  FS           = require("fs")
      ,PATH         = require("path")
      ,URL          = require("url")
      ,resolve4_opt = (function(){            //allow DNS resolving using local('resolve4_opt.local'), Google('resolve4_opt.independent_google'), OpenDNS('resolve4_opt.independent_opendns') and AdGuard('resolve4_opt.independent_adguard').   
                        const opts = {}
                             ,{ Resolver } = require("dns")
                             ;

                        opts.local = require("dns").resolve4;  //will use machine DNS-service (if running), HOSTS-file rules (if existing) and your machine's gateway (router's address, usually 192.168.0.1) .
                        opts.independent_google  = (function(){
                                                      const resolver = new Resolver();
                                                      resolver.setServers(['8.8.8.8','8.8.4.4']);
                                                      return resolver.resolve4;
                                                   }());
                        opts.independent_opendns = (function(){
                                                      const resolver = new Resolver();
                                                      resolver.setServers(['208.67.222.222','208.67.220.220']);
                                                      return resolver.resolve4;
                                                   }());
                        opts.independent_adguard = (function(){
                                                      const resolver = new Resolver();
                                                      resolver.setServers(['176.103.130.130','176.103.130.131']);
                                                      return resolver.resolve4;
                                                   }());
                        return opts;
                      }())
      ,path_resolve = function(path){ //normalize to Unix-slash (will work on Windows too).
                        path = path.replace(/\"/g,"");
                        path = path.replace(/\\+/g,"/");
                        path = PATH.resolve(path); 
                        path = path.replace(/\\+/g,"/"); 
                        path = path.replace(/\/\/+/g,"/"); 
                        return path;
                      }
      ,ARGS                         = process.argv.filter(function(s){return false === /node\.exe/i.test(s) && false === /index\.js/i.test(s);})
      ,FILE                         = path_resolve(ARGS[0])
      ,FILE_PARTS                   = PATH.parse(FILE)

      ,WAY_OF_RESOLVING             = (true === /^(localdns|googledns|opendns|adguard)$/i.test(ARGS[1] || "")) ? ARGS[1] : "localdns"    //force to null/undefined to empty string, limit to specific one of three strings, fallback to "localdns".
      ,CHOOSEN_RESOLVER             = "googledns" === WAY_OF_RESOLVING ? resolve4_opt.independent_google    :
                                      "opendns"   === WAY_OF_RESOLVING ? resolve4_opt.independent_opendns   : 
                                      "adguard"   === WAY_OF_RESOLVING ? resolve4_opt.independent_adguard   :
                                                                         resolve4_opt.local                   //choose function right-now, fallback to local dns.

      ,FILE_OUT                     = path_resolve(FILE_PARTS.dir + "/" + FILE_PARTS.name + "_resolved" + "__using_" + WAY_OF_RESOLVING + FILE_PARTS.ext)
      ,REGEX_HOSTNAME_ALPHANUMERIC  = /[a-z]/i
      ;

     
var   content         = FS.readFileSync(FILE,{encoding:"utf8"})
     ,ip_to_url       = {}
     ,hostname_to_url = {}
     ,counter
     ;

//process text-content
content = content.replace(/[\r\n]+/gm, "\n").replace(/\n+/gm, "\n")      //unify newline character.
                 .replace(/^.{0,6}$/gm, "")                              //remove too-short lines.
                 .replace(/^.*[^a-z0-9\.\-\_\:\/\?\&\=\r\n]+.*$/igm, "") //lines with unsupported-characters will be deleted (the whole-line).
                 .replace(/^\s*/g, "").replace(/(\s*$|^\s*)/gm, "")   //trim lines'-whitespace, remove empty lines.
                 ;

//extract hostnames (alpha-numeric hostnames and pure numeric hostnames -- IPs).


//populate collection where the hostname is the key and the value are the urls (lines) with that hostname.
ip_to_url       = {};
hostname_to_url = {};

content.split("\n")
       .forEach(function(line, index){
          console.log("░ [INFO]  parsing:  [LINE" + index + "]   [" + line + "]");
          var key = URL.parse(line)
                       .hostname
                       .toLowerCase()
                       ;
          if(true === REGEX_HOSTNAME_ALPHANUMERIC.test(key))
            hostname_to_url[key] = ("undefined" === typeof hostname_to_url[key]) ? [line] : hostname_to_url[key].concat(line);
          else
            ip_to_url[key]       = ("undefined" === typeof ip_to_url[key])       ? [line] :       ip_to_url[key].concat(line);
       })
       ;

  
counter   = Object.keys(hostname_to_url).length;


Object.keys(hostname_to_url).forEach(function(hostname){
  CHOOSEN_RESOLVER(hostname, {ttl:false}, function(err, ips){  //you can use 'resolve4_opt.local'/'resolve4_opt.independent_google'/'resolve4_opt.independent_opendns'/'resolve4_opt.independent_adguard'
    var urls, regex;

    counter-=1;

    if(null !== err || "undefined" === typeof ips || (1 === ips.length && "0.0.0.0" === ips[0]) || (1 === ips.length && "127.0.0.1" === ips[0])){ //error-cases where the resolved-IP isn't workable.
      console.log("▓ [ERROR] resolve error: " + hostname);     
      delete hostname_to_url[hostname];                     //remove dead-hostname and its related-url-entries

      if(0 === counter) write_result_end();
      return;
    }

    console.log("░ [INFO]  resolve success: " + hostname + " " + JSON.stringify(ips));     
    urls  = [].concat(hostname_to_url[hostname]);   //byVal copy.
    regex = new RegExp("\/\/" + hostname, "igm");
    
    ips.forEach(function(ip){
      urls.forEach(function(url){
        hostname_to_url[hostname].push(url.replace(regex, "//" + ip));
      });
    });

    if(0 === counter) write_result_end();
  })
});






function write_result_end(){
  //quick flat and join all urls
  content = JSON.stringify(Object.values(hostname_to_url))
          + ","
          + JSON.stringify(Object.values(ip_to_url))
          ;
  content = "[" + content.replace(/[\[\]]+/gm, "") + "]";
  content = content.replace(/\,+\]/gm, "]");
  content = JSON.parse(content);

  content = content.reduce(function(carry, current, index, array){        //fix the large amount of duplicates.
                      carry[current] = "";
                      return (index === array.length -1) ? Object.keys(carry) : carry;
                    }, {})
                  //.sort(natural_compare)
                    .join("\r\n\r\n")
                    + "\r\n"
                    ;
  FS.writeFileSync(FILE_OUT, content, {flag:"w", encoding:"utf8"}); //overwrite
}

/*
console.log(hostname_to_url);









                         
       .forEach(function(hostname){
          if(true === REGEX_HOSTNAME_ALPHANUMERIC.test(hostname))
            hostnames.push(hostname);
          else
            ips.push(hostname);
       })
       ;

console.log("hostnames",hostnames);
console.log("ips",ips);

console.log("resolving just hostnames-to-IPs (IPv4) for now...");

// resolve hostname to IP.
// * since there might be a lot of IPs, and we're "not contextually-connected to the original hostname" we'll going to duplicate the 'content' variable for each IP.

counter = hostnames.length;  //cheap async-helper, so we'll know when the last-one was done.

hostnames.forEach(function(hostname, index){
  var regex = new RegExp("\/\/" + hostname, "igm");           // the double-unix-slash prefix stricts the regex for better/safer replacement.  - it will replace 'google.com' with the IP(s) in  '//google.com'  but not in  '//notgoogle.com' .

  resolve4_opt.independent_google(hostname, {ttl:false}, function(err, ips){  //you can use '.local'/'.independent_google'/'.independent_opendns'/'.independent_adguard'
    if(null === err && "undefined" !== typeof ips){
      content = content 
              + "\n"
              + ips.map(function(ip){
                      return content.replace(regex, "\/\/" + ip)    //duplicates the content... :[  needs to be uniqued later..
                   })
                   .join("\n")
                   ;
    }
    
    counter-=1;
    
    if(0 === counter){  //finished 
      content = content.replace(/^.*\/127\.0\.0\.1\/.*$/igm, "")
                       .replace(/^.*\/0\.0\.0\.0\/.*$/igm,   "")
                       .split("\n")
                       .reduce(function(carry, current, index, array){        //fix the large amount of duplicates.
                          carry[current] = "";
                          return (index === array.length -1) ? Object.keys(carry) : carry;
                       }, {})
                     //.sort(natural_compare)
                       .join("\r\n")
                       ;

      FS.writeFileSync(FILE_OUT, content, {flag:"w", encoding:"utf8"}); //overwrite
    }
  });
});

*/