var AWS = require('aws-sdk'),
	util = require('util'),
	Promise = require('bluebird'),
    conf = Promise.promisifyAll(require('./configHelper')),
    s3 = Promise.promisifyAll(require('node-s3-encryption-client')),
    awsS3 = new AWS.S3(),
    sftpHelper = require('./sftpHelper'),
    json2csv = require('./jsontocsv'),
    sqs = new AWS.SQS();
var objIsCSV  = true;

exports.handle = function(event, context) {
    console.log(event);
    console.log(context);
	return exports.pollSqs(context);
};

exports.pollSqs = function(context) {
  return sqs.getQueueUrl({
    QueueName: context.functionName
  }).promise()
  .then(function(queueData) {
    return Promise.mapSeries(
      Array.apply(null, {length: 10}).map(Number.call, Number), 
      function(i) {
        return sqs.receiveMessage({
          QueueUrl: queueData.QueueUrl,
          MaxNumberOfMessages: 10
        }).promise()
        .then(function(messages) {
	          return Promise.mapSeries(
	            messages.Messages || [],
	            function(message) {
	              return internalNewS3Object(JSON.parse(message.Body), context)
	              .then(function(results) {
	                return sqs.deleteMessage({
	                  QueueUrl: queueData.QueueUrl,
	                  ReceiptHandle: message.ReceiptHandle
	                }).promise()
	                .then(function(data) {
	                  return results;
	                });
	              });
	            });
        });
      }
    );
  });
};

function internalNewS3Object(event, context) {
	return Promise.try(function () {
		if (!event.Records) {
			console.log("Not a valid record entry.");
		} else {
			console.info("Retrieving sftp variables");
			return conf.getConfigAsync(context)
				.then(function (config) {
					    console.log("Config: \n", config);
						return Promise.map(
							event.Records,
							function (record) {
								//console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
								console.log("Record: \n", record);
								var srcBucket = event.Records[0].s3.bucket.name;
								var srcKey = event.Records[0].s3.object.key;
								var fullS3Path = record.s3.bucket.name + '/' + decodeURIComponent(record.s3.object.key);
								console.info("Object path: " + fullS3Path + " | config s3 Loc: " + config["s3Location"]);
								var newObjectS3Path = exports.getFilePathArray(fullS3Path);

								var getParams = {
									Bucket: record.s3.bucket.name,
									Key: decodeURIComponent(record.s3.object.key)
								};

								var s3obj = s3.getObject(getParams, function (err, data) {
									// Handle any error and exit
									if (err)
										return err;

									// No error happened
									// Convert Body from a Buffer to a String

									let objectData = data.Body.toString('utf-8');
									if (!objectData.Metadata || objectData.Metadata.synched != "true") {
										//console.info("New Object path: " + newObjectS3Path);
										var configKeys = Object.keys(config)//.filter(function(key) {
										if (configKeys.length === 0) console.warn("No configured SFTP destination for " + fullS3Path);
										var s3Location = config["s3Location"];
										if (s3Location) {
											//console.info("Configkeys: " + Object.keys(config));
											var configS3Path = exports.getFilePathArray(s3Location);
										}

										var bodydata = objectData;

										if (srcKey.match(/\.csv$/) === null) {
											var msg = "Key " + srcKey + " is not a csv file, attempting CTR conversion";
											objIsCSV = false;
											console.log(msg);
										} else {
											objIsCSV = true;
										}

										//This needs to be tested.
										if (!objIsCSV) {
											bodydata = json2csv.jsonconvert(objectData.Body.toString("utf8"));
										}

									}
									var configS3Path = exports.getFilePathArray(config["s3Location"]);
									var sftpDirPath = exports.getFilePathArray(config["sftpLocation"]);
									//console.info("configS3Path: " + configS3Path + " | sftpDirPath:" + sftpDirPath);
									return exports.getSftpConfig(config)
										.then(function (sftpConfig) {
											return sftpHelper.withSftpClient(sftpConfig, function (sftp) {
												var sftpFileName = sftpDirPath.concat(newObjectS3Path[newObjectS3Path.length - 1].replace(/:/g, '_')).join('/');
												if (!objIsCSV) {
													sftpFileName += ".csv";
												}
												return sftpHelper.writeFile(
													sftp,
													sftpFileName,
													bodydata
												)
													.then(function () {
														console.info("...done");
														console.info("[" + sftpFileName + "]: Moved 1 files from S3 to SFTP");
														return sftpFileName;
													});
											});
										})
										.catch(function(err) {
											console.log(err);
										});
								});
							});
					}
				);
		}
	});
	//}
}

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

	  var getParams = {
			Bucket: config.sftpConfig.s3PrivateKey.substr(0, bucketDelimiterLocation),
				Key: config.sftpConfig.s3PrivateKey.substr(bucketDelimiterLocation + 1)
	  };

	  var s3obj = s3.getObject(getParams, function (err, data) {
			// Handle any error and exit
			if (err)
				return err;

		  let objectData = data.Body.toString('utf-8');
		  sftpconfig.privateKey = objectData;
		  //delete config.s3PrivateKey;
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
