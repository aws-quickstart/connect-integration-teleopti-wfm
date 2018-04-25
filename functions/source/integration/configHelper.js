exports.getConfig = function(context, callback) {
  var data = {
		  "s3Location": process.env.s3Location,
		  "host": process.env.host,
		  "port": process.env.port,
		  "password": process.env.password,
		  "username": process.env.username,
		  "sftpLocation": process.env.sftpLocation
  };
  console.info("Returning sftp info: " + Object.keys(data));
  callback(null, data);
}
