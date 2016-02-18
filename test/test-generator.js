var helpers = require('yeoman-test'),
    path    = require('path'),
    assert  = require('yeoman-assert'),
    fs      = require('fs');

describe('inuitcss:app', function () {

  before(function(done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .inTmpDir()
      .withPrompts({
        modules: [
          'inuit-defaults',
          'inuit-functions'
        ]
      })
      .on('end', done);
  });

  it('should create the right files', function() {
    assert.file([
      './bower.json',
      './css/source/main.scss'
    ]);
  });

  it('should add two dependencies to the bower.json file', function() {
    assert.fileContent([
      ['./bower.json', /inuit-defaults/],
      ['./bower.json', /inuit-functions/]
    ]);
  });

  it('should add two @import to the main.scss file', function() {
    assert.fileContent([
      ['./css/source/main.scss', /@import "\.\.\/\.\.\/bower_components\/inuit-defaults\/_settings\.defaults\.scss/],
      ['./css/source/main.scss', /@import "\.\.\/\.\.\/bower_components\/inuit-functions\/_tools\.functions\.scss/]
    ]);
  });

});
