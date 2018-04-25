var AWS = require("aws-sdk"),
    crypt = require("./crypt"),
    kms = new AWS.KMS(),
    s3 = new AWS.S3();

const metadataCipherAlgorithm = 'cipher-algorithm',
      metadataDecryptedEncoding = 'decrypted-encoding'
      metadataKmsKeyName = 'x-amz-key';

exports.getObject = function(params, callback) {
  var encryptionContext = params.EncryptionContext;
  delete params.EncryptionContext;
  s3.getObject(params, function(err, objectData) {
    if (err) {
      callback(err, null);
    } else {
      var metadata = objectData.Metadata || {};
      var kmsKeyBase64 = metadata[metadataKmsKeyName];
      if (kmsKeyBase64) {
        var kmsKeyBuffer = new Buffer(kmsKeyBase64, 'base64');
        kms.decrypt({CiphertextBlob: kmsKeyBuffer, EncryptionContext: encryptionContext}, function(err, kmsData) {
          if (err) {
            callback(err, null);
          } else {
            var helper = new crypt.Helper(kmsData.Plaintext.toString('base64'), {algorithm: metadata[metadataCipherAlgorithm], decryptedEncoding: metadata[metadataDecryptedEncoding]});
            objectData.Body = helper.decrypt(objectData.Body.toString('utf-8'));
            delete objectData.Metadata[metadataKmsKeyName];
            delete objectData.Metadata[metadataCipherAlgorithm];
            delete objectData.Metadata[metadataDecryptedEncoding];
            callback(null, objectData);
          }
        });
      } else {
        callback(null, objectData);
      }
    }
  });
}

exports.putObject = function(params, callback) {
  var kmsParams = params.KmsParams
  if (kmsParams && kmsParams.KeyId) {
    kms.generateDataKey(kmsParams, function(err, kmsData) {
      if (err) {
        callback(err, null);
      } else {
        var helper = new crypt.Helper(kmsData.Plaintext.toString('base64'), {algorithm: params.CipherAlgorithm, decryptedEncoding: params.DecryptedEncoding});
        params.Body = helper.encrypt(params.Body);
        params.Metadata = params.Metadata || {};
        params.Metadata[metadataKmsKeyName] = kmsData.CiphertextBlob.toString('base64');
        if (params.CipherAlgorithm) params.Metadata[metadataCipherAlgorithm] = params.CipherAlgorithm;
        if (params.DecryptedEncoding) params.Metadata[metadataDecryptedEncoding] = params.DecryptedEncoding;
        putObject(params, callback);
      }
    })
  } else {
    putObject(params, callback);
  }
}

function putObject(params, callback) {
  delete params.KmsParams;
  delete params.CipherAlgorithm;
  delete params.DecryptedEncoding;
  s3.putObject(params, callback);
}