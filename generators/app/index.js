var generators  = require('yeoman-generator'),
    async       = require('async'),
    github      = require('octonode'),
    os          = require('os'),
    request     = require("request");

var gen     = {},
    gitcli  = github.client();



/*
  Yeoman methods
*/

gen.initializing = function() {
  var self = this;
  var done = self.async();

  // System vars
  self.opts = {
    cacheFile: os.tmpdir() + 'inuitCache.json'
  };

  self.app              = {};
  self.inuitModules     = [];
  self.selectedModules  = [];

  // Paths
  self.paths = {};

  self.paths.dirScss  = 'sass/';
  self.paths.dirCss   = 'css/';

  self.paths.index    = 'index.html';
  self.paths.bower    = 'bower.json';
  self.paths.mainCss  = self.paths.dirCss + 'main.css';
  self.paths.mainScss = self.paths.dirScss + 'main.scss';

  // Retrieving modules
  if(!self.fs.exists(self.opts.cacheFile)) {
    self.log('Retrieving modules from GitHub...');

    self._getModules(function() {
      return done();
    });
  }
  else {
    self.log('Retrieving modules from cache...');

    self.inuitModules = self.fs.readJSON(self.opts.cacheFile);
    return done();
  }
};

gen.prompting = function() {
  var self = this;
  var done = self.async();

  var questions = [
    {
      type : 'input',
      name : 'appname',
      message : 'Website/application name',
      default : self.appname
    },

    {
      type : 'input',
      name : 'appversion',
      message : 'Version',
      default : '1.0.0'
    },

    {
      type : 'input',
      name : 'appauthors',
      message : 'Authors (separated by a comma)'
    },

    {
      type : 'input',
      name : 'applicense',
      message : 'License',
      default : 'MIT'
    },
     
    {
      type : 'checkbox',
      name : 'modules',
      message : 'Select the modules you want to install',
      choices : self.inuitModules.map(function(mod) {
        return {
          name: mod.moduleName + ' (' + mod.moduleType + ')',
          value: mod.moduleName
        };
      }),
      default : [
        'inuit-defaults',
        'inuit-functions',
        'inuit-mixins',
        'inuit-normalize',
        'inuit-box-sizing',
        'inuit-page',
        'inuit-layout',
        'inuit-widths',
        'inuit-tools-widths',
        'inuit-responsive-tools',
        'inuit-responsive-settings'
      ]
    }
  ];

  self.prompt(questions, function(answers) {
    // Setting app options
    self.app.name     = answers.appname    || self.appname;
    self.app.version  = answers.appversion || '1.0.0';
    self.app.license  = answers.applicense || 'MIT';
    self.app.authors  = answers.appauthors || '';
    
    if(self.app.authors)
      self.app.authors = self.app.authors.split(',').map(function(e){return e.trim();});

    // Getting selected modules
    self.selectedModules = self.inuitModules.filter(function(mod) {
      return (answers.modules.indexOf(mod.moduleName) != -1) ? true : false
    });

    done();
  }.bind(self));
};

gen.writing = function() {
  var self = this;
  var done = self.async();

  // Creating cache file
  if(!self.fs.exists(self.opts.cacheFile))
    self.fs.writeJSON(self.opts.cacheFile, self.inuitModules);

  // Setting up bower.json
  var dependencies = {};
  self.selectedModules.forEach(function(module, i) {
    dependencies[module.moduleName] = '*';
  });

  self.fs.writeJSON(self.destinationPath(self.paths.bower), {
    name:     self.app.name,
    version:  self.app.version,
    authors:  self.app.authors,
    license:  self.app.license,

    ignore: [
      '**/.*',
      'node_modules',
      'bower_components',
      'test',
      'tests'
    ],

    dependencies: dependencies
  });

  // Setting up main.scss file
  self.fs.copyTpl(self.templatePath('_main.scss'), self.destinationPath(self.paths.mainScss), {
    settings:   self.selectedModules.objSearch('moduleType', 'settings'),
    tools:      self.selectedModules.objSearch('moduleType', 'tools'),
    generic:    self.selectedModules.objSearch('moduleType', 'generic'),
    base:       self.selectedModules.objSearch('moduleType', 'base'),
    objects:    self.selectedModules.objSearch('moduleType', 'objects'),
    components: self.selectedModules.objSearch('moduleType', 'components'),
    trumps:     self.selectedModules.objSearch('moduleType', 'trumps')
  });

  // Setting up main.css file
  self.fs.write(self.destinationPath(self.paths.mainCss), '');

  // Setting up index file
  self.fs.copyTpl(self.templatePath('_index.html'), self.destinationPath(self.paths.index), {
    title:    self.app.name,
    cssfile:  self.paths.mainCss
  });

  done();
};

gen.install = function() {
  var self = this;
  var done = self.async();

  this.bowerInstall();

  done();
};



/*
  Private methods
*/

gen._getModules = function(getModulesCallback) {
  var self = this; 

  gitcli.get('/orgs/inuitcss/repos', { per_page: 100 }, function (err, status, body, headers) {

    if(err) {
      self.log(err.message);
      return getModulesCallback();
    }
    
    async.each(body, function(module, cbl) {

      request({
        uri: 'https://raw.githubusercontent.com/' + module.full_name + '/master/bower.json',
      }, function(error, response, body) {
        if (error || response.statusCode != 200)
          return cbl();

        var content = JSON.parse(body);

        if(!content.main)
          return cbl();

        self.inuitModules.push({
          moduleName:     content.name,
          moduleFile:     content.main,
          moduleVersion:  content.version,
          moduleType:     content.main.split('.')[0].substr(1)
        });

        cbl();
      });

    }, function() {
      return getModulesCallback();
    });

  });

};



/*
  Things
*/

Array.prototype.objSearch = function(property, value) {
  return this.filter(function(el) { return el[property] == value });
};
  


/*
  Make it real!
*/

module.exports = generators.Base.extend(gen);