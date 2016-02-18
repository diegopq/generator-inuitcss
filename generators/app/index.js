var generators  = require('yeoman-generator'),
    request     = require('request'),
    async       = require('async'),
    github      = require('octonode');

var gen = {},
    gitcli = github.client();

/*
 * Generator methods
 */

gen.initializing = function() {
  var done = this.async();

  this.paths = {
    sass: 'css/source/',
  };

  this.inuitModules     = [];
  this.selectedModules  = [];

  this.log("> Retrieving Inuit.css modules...");

  this._getModules(done);
};

gen.prompting = function() {
  var self = this;
  var done = self.async();

  self.prompt({
    type    : 'checkbox',
    name    : 'modules',
    message : 'Choose the modules',
    choices : self.inuitModules.map(function(module) {
      return {
        name:   module.name + ' (' + module.prefix + ')',
        value:  module.name
      }
    }),
    default: [
      'inuit-defaults',
      'inuit-functions',
      'inuit-mixins',
      'inuit-normalize',
      'inuit-box-sizing',
      'inuit-page'
    ]
  }, function (answers) {
    // now we put the selected modules into self.selectedModules
    self.selectedModules = self.inuitModules.filter(function(module) {
      if(!!~answers.modules.indexOf(module.name))
        return true;
    });

    done();
  }.bind(self));
};

gen.writing = function() {
  var self = this;

  // Separating modules by prefix
  var modules = {};
  self.selectedModules.forEach(function(module) {
    if(!modules[module.prefix])
      modules[module.prefix] = [];

    modules[module.prefix].push(module);
  });

  // Creating css/source/main.scss with inuit links
  this.fs.copyTpl(
    this.templatePath('main.scss'),
    this.destinationPath(self.paths.sass + 'main.scss'),
    { modules: modules }
  );

  // Creating bower.json file
  var bower = {
    name:             '[Replace]',
    description:      '[Replace]',
    main:             '[Replace]',
    author:           '[Replace]',
    devDependencies:  {}
  };

  self.selectedModules.forEach(function(module) {
    bower.devDependencies[module.name] = '~' + module.version;
  });

  this.fs.writeJSON(
    this.destinationPath('bower.json'),
    bower,
    null,
    4
  );

};

gen.install = function() {
  this.bowerInstall();
};

gen.end = function() {
  this.log("> Everything went well :)");
  this.log("> Remember to modify your bower.json file!");
};

/*
 * Private methods
 */

gen._getModules = function(getModulesCallback) {
  var self = this;
  var validModules = [
    'settings',
    'tools',
    'generic',
    'base',
    'objects',
    'components',
    'trumps'
  ];

  gitcli.get('/orgs/inuitcss/repos', { per_page: 200 }, function (err, status, body, headers) {
    if(err) {
      self.log(err.message);
      return getModulesCallback();
    }

    // iterating over each repo
    async.each(body, function(el, cbl) {
      var name    = el.name;
      var prefix  = name.split('.')[0];

      // we only need modules so...
      if(!~validModules.indexOf(prefix))
        return cbl();

      // ...it's a module! Let's get it
      request('https://raw.githubusercontent.com/inuitcss/' + name + '/master/bower.json', function(err, res, body) {
        if (err || res.statusCode != 200)
          return cbl();

        body = JSON.parse(body);
        self.inuitModules.push({
          name:         body.name,
          prefix:       prefix,
          version:      body.version,
          description:  body.description,
          file:         body.main
        });

        cbl();
      });
    }, getModulesCallback);
  });
};

module.exports = generators.Base.extend(gen);
