var AWS = require('aws-sdk'),
	util = require('util'),
	Promise = require('bluebird'),
	response = require('./cfn-response'),
	SshClient = require('ssh2').Client,
    s3 = Promise.promisifyAll(require('node-s3-encryption-client'))

exports.handle = function(event, context) {
	if (event.RequestType === 'Create'){
		try{
			return exports.testFTP(event, context);
		}
		catch(error){
			console.error(error);
			response.send(event, context, response.FAILED, {}, "");
		}
	}
	else response.send(event, context, response.SUCCESS, {}, "");
		
};

exports.testFTP = function(event, context) {
  return Promise.try(function() {
	  console.info("Retrieving sftp variables");
	  var config = {
			  "host": event.ResourceProperties.host,
			  "port": event.ResourceProperties.port,
			  "password": event.ResourceProperties.password,
			  "username": event.ResourceProperties.username,
			  "sftpLocation": event.ResourceProperties.sftpLocation
	  };
            	var configKeys = Object.keys(config)//.filter(function(key) {
            	if (configKeys.length === 0) console.warn("No configured SFTP destination");

                var bodydata = "This file is a test";

                var sftpDirPath = exports.getFilePathArray(config["sftpLocation"]);
                console.info("sftpDirPath:" + sftpDirPath);
                return exports.getSftpConfig(config)
                  .then(function(sftpConfig) {
                    return exports.withSftpClient(sftpConfig, function(sftp) {
                    	var utc = new Date().toJSON().slice(0,16).replace(/:/g,'')
                    	var sftpFileName = sftpDirPath.concat("testfile_" + utc + ".txt");

                      console.info("Writing " + sftpFileName + "...");
                      return exports.writeFile(
                        sftp,
                        sftpFileName.toString("utf8"),
                        bodydata.toString("utf8")
                      )
                      .then(function() {
                        console.info("[" + sftpFileName + "]: Created one file via SFTP");
                        response.send(event, context, response.SUCCESS, {}, "");
                      });
                    });
                  })
          });
        };


exports.getFilePathArray = function(filePath) {
  return (filePath || '').split('/').filter(function(s) { return s ? true : false });
};

exports.getSftpConfig = function(config) {
  return Promise.try(function() {
    if (!config["host"]) throw new Error("SFTP config not found");
    console.info("Host found: " + config["host"]);
    var sftpconfig = {
    		"host" : config["host"],
    		"port" : config["port"],
    		"username" : config["username"],
    		"password" : config["password"],
    };
    if (config["s3PrivateKey"]) {
      var bucketDelimiterLocation = config.sftpConfig.s3PrivateKey.indexOf("/");
      return s3.getObjectAsync({
        Bucket: config.sftpConfig.s3PrivateKey.substr(0, bucketDelimiterLocation),
        Key: config.sftpConfig.s3PrivateKey.substr(bucketDelimiterLocation + 1)
      })
      .then(function(objectData) {
        sftpconfig.privateKey = objectData.Body.toString();
        delete config.s3PrivateKey;
        return sftpconfig;
      });
    } else return sftpconfig;
  });
};

function flatten(arr) {
  return arr.reduce(function(a, b) {
    if (Array.isArray(b)) {
      return a.concat(flatten(b));
    } else if (b) {
      a.push(b);
      return a;
    } else {
      return a;
    }
  }, []);
}

//Returns a Disposer
exports.getSshClient = function(config) {
  var conn = new SshClient();
  var promise = new Promise(function(resolve, reject) {
    conn
    .on('ready', function() {
      resolve(conn);
    })
    .on('error', function(e) {
    	response.send(event, context, response.FAILED, {}, "");
     })
    .connect(config);
  });
  return promise.disposer(function(conn, promise) {
    conn.end();
  });
}

// Don't attempt to use the sftp object outside of the 'process' function (i.e.
// in a .then hung off the resultant Promise) - the connection will be closed.
exports.withSftpClient = function(config, process) {
  return Promise.using(exports.getSshClient(config), function(conn) {
    return Promise.promisify(conn.sftp, {context: conn})()
    .then(function(sftp) {
      return process(Promise.promisifyAll(sftp));
    });
  });
}

/*
sftp: SFTP client from ssh2, assumed to already be promisified.
fileName: The full path of the file to be written
body: A string containing the body to write to the file. UTF-8.
*/
exports.writeFile = function(sftp, fileName, body) {
	console.info("In WriteFile module.");
  return sftp.openAsync(fileName.toString(), 'w')
  .then(function(handle) {
	  console.info("Opened sftp file.");
    return sftp.writeAsync(handle, new Buffer(body), 0, body.length, 0)
    .then(function() {
    	console.info("Closing SFTP file.");
      return sftp.closeAsync(handle);
    });
  });
}

exports.getConfig = function(event) {
	  var data = {
			  "host": event.ResourceProperties.host,
			  "port": event.ResourceProperties.port,
			  "password": event.ResourceProperties.password,
			  "username": event.ResourceProperties.username,
			  "sftpLocation": event.ResourceProperties.sftpLocation
	  };
	  console.info("Returning sftp info: " + Object.keys(data));
	  return data;
	}