var generators  = require('yeoman-generator'),
    async       = require('async'),
    github      = require('octonode');

var gen     = {};
    gitcli  = github.client();



/*
  Yeoman methods
*/

// [1] Initialization
gen.initializing = function() {
  var self  = this;
  var done  = self.async();

  // App settings
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

  // Getting all inuit modules from GitHub
  self.log('Retrieving inuitcss modules...');

  self._getModules(function() {
    // Setting bower url for each module
    self.inuitModules = self.inuitModules.map(function(module) {
      module.bowerUrl = '../bower_components/' + module.name + '/' + module.file;
      return module;
    });

    done();
  });
};

// [2] Prompting
gen.prompting = function() {
  var self = this;
  var done = self.async();

  var questions = [{
    type    : 'input',
    name    : 'appname',
    message : 'Website/application name',
    default : self.appname
  },

  {
    type    : 'input',
    name    : 'appversion',
    message : 'Version',
    default : '1.0.0'
  },

  {
    type    : 'input',
    name    : 'appauthors',
    message : 'Authors (separated by a comma)'
  },

  {
    type    : 'input',
    name    : 'applicense',
    message : 'License',
    default : 'MIT'
  },

  {
    type    : 'checkbox',
    name    : 'modules',
    message : 'Select the modules you want to install',
    choices : self.inuitModules.map(function(mod) {
      return {
        name:   mod.name + ' (' + mod.type + ')',
        value:  mod.name
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
      'inuit-responsive-tools',
      'inuit-responsive-settings'
    ]
  }];

  self.prompt(questions, function (answers) {
    // Setting app options
    self.app.name    = answers.appname    || self.appname;
    self.app.version = answers.appversion || '1.0.0';
    self.app.license = answers.applicense || 'MIT';
    self.app.authors = answers.appauthors || '';

    if(self.app.authors)
      self.app.authors = self.app.authors.split(',').map(function(e){return e.trim();});

    // Getting selected modules
    self.selectedModules = self.inuitModules.filter(function(mod) {
      return (answers.modules.indexOf(mod.name) != -1) ? true : false
    });

    done();
  }.bind(self));
};

// [3] Writing
gen.writing = function() {
  var self = this;

  // Setting up bower.json
  var dependencies = {};
  self.selectedModules.forEach(function(module, i) {
    dependencies[module.name] = module.cloneUrl;
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
    settings:   self.selectedModules.objSearch('type', 'settings'),
    tools:      self.selectedModules.objSearch('type', 'tools'),
    generic:    self.selectedModules.objSearch('type', 'generic'),
    base:       self.selectedModules.objSearch('type', 'base'),
    objects:    self.selectedModules.objSearch('type', 'objects'),
    components: self.selectedModules.objSearch('type', 'components'),
    trumps:     self.selectedModules.objSearch('type', 'trumps')
  });

  // Setting up main.css file
  self.fs.write(self.destinationPath(self.paths.mainCss), '');

  // Setting up index file
  self.fs.copyTpl(self.templatePath('_index.html'), self.destinationPath(self.paths.index), {
    title:    self.app.name,
    cssfile:  self.paths.mainCss
  });
};

// [4] Install
gen.install = function() {
  this.bowerInstall();
};



/*
  Private methods
*/

gen._getModules = function(getModuleCallback) {
  var self = this;

  gitcli.get('/orgs/inuitcss/repos', {}, function (err, status, body, headers) {
    async.each(body, function(module, cbl) {
      var moduleType = module.name.split('.')[0];
      var moduleName = (module.name.split('.')[1]) ? 'inuit-' + module.name.split('.')[1] : null;

      if(!moduleName)
        return cbl();

      if(self.inuitModules.objSearch('name', moduleName).length > 0) {
        self.inuitModules.map(function(el) { 
          el.name = (el.name == moduleName) ? el.name + '-' + el.type : el.name;
          return el;
        });

        moduleName = moduleName + '-' + moduleType;
      }

      self.inuitModules.push({
        name:       moduleName,
        type:       moduleType,
        file:       module.name + '.scss',
        cloneUrl:   module.clone_url
      });

      return cbl();
    }, function() {
      return getModuleCallback();
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