var path    = require('path'),
    rimraf  = require('rimraf'),
    helpers = require('yeoman-generator').test,
    assert  = require('yeoman-generator').assert;

describe('Inuitcss generator', function(){
  this.timeout(0);

  before(function(done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .inDir(path.join(__dirname, './tmp'))
      .withPrompt({
        appname:    'test',
        appversion: '0.0.1',
        appauthors: 'someone',
        applicense: 'MIT',
        modules:    ['inuit-defaults', 'inuit-mixins']
      })
      .on('end', done);
  });   

  it('Should create the right files', function() {
    assert.file([
      path.join(__dirname, './tmp/bower.json'),
      path.join(__dirname, './tmp/index.html'),
      path.join(__dirname, './tmp/sass/main.scss'),
      path.join(__dirname, './tmp/css/main.css'),

      path.join(__dirname, './tmp/bower_components/inuit-defaults/_settings.defaults.scss'),
      path.join(__dirname, './tmp/bower_components/inuit-mixins/_tools.mixins.scss')
    ]);
  });

  it('Should import all the modules into main.scss', function() {
    var reg1 = /@import "\.\.\/bower_components\/inuit-defaults\/settings\.defaults\.scss/;
    var reg2 = /@import "\.\.\/bower_components\/inuit-mixins\/tools\.mixins\.scss/;

    assert.fileContent(path.join(__dirname, './tmp/sass/main.scss'), reg1);
    assert.fileContent(path.join(__dirname, './tmp/sass/main.scss'), reg2);
  });

  it('Should link the main CSS file into index.html', function() {
    var reg = /<link rel="stylesheet" href="css\/main\.css">/;

    assert.fileContent(path.join(__dirname, './tmp/index.html'), reg);
  }); 

  after(function(done) {
    process.chdir('../');
    rimraf(path.join(__dirname, './tmp'), done);
  });

});