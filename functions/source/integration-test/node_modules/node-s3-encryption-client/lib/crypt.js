var crypto = require('crypto');

/*
  options:
    algorithm: Anything from crypto.getCiphers()
    decryptedEncoding: 'utf8', 'ascii', or 'binary'
    outputEncoding: 'binary', 'base64', or 'hex'
 */
exports.Helper = function(password, options) {
  this.password = password;
  options = options || {};
  this.algorithm = options.algorithm || 'aes-256-cbc';
  this.decryptedEncoding = options.decryptedEncoding || 'utf8';
  this.encryptedEncoding = options.encryptedEncoding || 'base64';
}

exports.Helper.prototype.encrypt = function(unencrypted) {
  var cipher = crypto.createCipher(this.algorithm, this.password);
  return cipher.update(unencrypted, this.decryptedEncoding, this.encryptedEncoding) + cipher.final(this.encryptedEncoding);
}
 
exports.Helper.prototype.decrypt = function(encrypted) {
  var decipher = crypto.createDecipher(this.algorithm, this.password);
  return decipher.update(encrypted, this.encryptedEncoding, this.decryptedEncoding) + decipher.final(this.decryptedEncoding);
}