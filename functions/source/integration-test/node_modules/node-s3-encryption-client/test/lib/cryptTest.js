var assert = require('assert'),
    crypt = require('../../lib/crypt');

describe('crypt', function() {
  describe('#encrypt(), #decrypt()', function() {
    // TODO: 'aes-128-cbc-hmac-sha1', 'aes-128-gcm', 'aes-128-xts', 'aes-192-gcm', 'aes-256-cbc-hmac-sha1',
    //       'aes-256-gcm', 'aes-256-xts', 'des-ede3-cfb1', 'id-aes128-GCM', 'id-aes192-GCM', 'id-aes256-GCM'
    //       don't work. Maybe this is expected, but should investigate.
    [ 'CAST-cbc', 'aes-128-cbc', 'aes-128-cfb', 'aes-128-cfb1', 'aes-128-cfb8', 'aes-128-ctr',
      'aes-128-ecb', 'aes-128-ofb', 'aes-192-cbc', 'aes-192-cfb', 'aes-192-cfb1',
      'aes-192-cfb8', 'aes-192-ctr', 'aes-192-ecb', 'aes-192-ofb', 'aes-256-cbc',
      'aes-256-cfb', 'aes-256-cfb1', 'aes-256-cfb8', 'aes-256-ctr', 'aes-256-ecb', 'aes-256-ofb',
      'aes128', 'aes192', 'aes256', 'bf', 'bf-cbc', 'bf-cfb', 'bf-ecb', 'bf-ofb', 'blowfish', 'camellia-128-cbc',
      'camellia-128-cfb', 'camellia-128-cfb1', 'camellia-128-cfb8', 'camellia-128-ecb', 'camellia-128-ofb', 'camellia-192-cbc',
      'camellia-192-cfb', 'camellia-192-cfb1', 'camellia-192-cfb8', 'camellia-192-ecb', 'camellia-192-ofb', 'camellia-256-cbc',
      'camellia-256-cfb', 'camellia-256-cfb1', 'camellia-256-cfb8', 'camellia-256-ecb', 'camellia-256-ofb', 'camellia128',
      'camellia192', 'camellia256', 'cast', 'cast-cbc', 'cast5-cbc', 'cast5-cfb', 'cast5-ecb', 'cast5-ofb', 'des', 'des-cbc',
      'des-cfb', 'des-cfb1', 'des-cfb8', 'des-ecb', 'des-ede', 'des-ede-cbc', 'des-ede-cfb', 'des-ede-ofb', 'des-ede3',
      'des-ede3-cbc', 'des-ede3-cfb', 'des-ede3-cfb8', 'des-ede3-ofb', 'des-ofb', 'des3', 'desx', 'desx-cbc',
      'idea', 'idea-cbc', 'idea-cfb', 'idea-ecb', 'idea-ofb', 'rc2',
      'rc2-40-cbc', 'rc2-64-cbc', 'rc2-cbc', 'rc2-cfb', 'rc2-ecb', 'rc2-ofb', 'rc4', 'rc4-40', 'rc4-hmac-md5', 'seed',
      'seed-cbc', 'seed-cfb', 'seed-ecb', 'seed-ofb'
    ].forEach(function(algorithm) {
      ['utf8', 'ascii', 'binary'].forEach(function(inputEncoding) {
        ['binary', 'base64', 'hex'].forEach(function(outputEncoding) {
          it('should work round-trip for ' + algorithm + ', ' + inputEncoding + ' => ' + outputEncoding, function() {
            var helper = new crypt.Helper("123456", {algorithm: algorithm, decryptedEncoding: inputEncoding, encryptedEncoding: outputEncoding});
            assert.equal(helper.algorithm, algorithm);
            assert.equal(helper.decryptedEncoding, inputEncoding);
            assert.equal(helper.encryptedEncoding, outputEncoding);
            testRoundTrip("foo", helper);
          });
        });
      });
    });

    it('should work with default options', function() {
      var helper = new crypt.Helper("123456");
      testRoundTrip("foo", helper);
    });

    it('should fail with invalid algorithm', function() {
      var helper = new crypt.Helper("123456", {algorithm: 'invalid'});
      assert.throws(function() { testRoundTrip("foo", helper); }, 'Unknown cipher');
    });

    it('should fail with invalid decryptedEncoding', function() {
      var helper = new crypt.Helper("123456", {decryptedEncoding: 'invalid'});
      assert.throws(function() { testRoundTrip("foo", helper); }, 'Unknown encoding');
    });

    it('should fail with invalid encryptedEncoding', function() {
      var helper = new crypt.Helper("123456", {encryptedEncoding: 'invalid'});
      assert.throws(function() { testRoundTrip("foo", helper); }, 'Unknown encoding');
    });
  });
});

function testRoundTrip(str, helper) {
  var encrypted = helper.encrypt(str);
  assert.notEqual(encrypted, str);
  assert.equal(helper.decrypt(encrypted), str);
}