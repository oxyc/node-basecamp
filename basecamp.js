var rest = require('restler')
  , Backbone = require('backbone')
  , qs = require('querystring')
  , BASECAMP_API_VERSION = exports.BASECAMP_API_VERSION = 'v1'
  , BASECAMP_ACCOUNT
  , basecamp;

// Helpers {{{1
var slice = Array.prototype.slice;

function extend(target) {
  slice.call(arguments, 1).forEach(function(obj) {
    Object.keys(obj).forEach(function(key) {
      target[key] = obj[key];
    });
  });
}
// }}}
// Basecamp Model {{{1

var BasecampModel = Backbone.Model.extend({
    type : 'none'
  , types : 'none'

  , getProject : function(attr) {
    var project = this.get('project');
    return project instanceof Backbone.Model ? project.get('id')
      : project > 1 ? project
      : null;
  }

  , url : function () {
    var url = '/' + BASECAMP_ACCOUNT +
      '/api/' + BASECAMP_API_VERSION +
      (this.getProject() ? '/projects/' + this.getProject() : '') +
      '/' + this.types +
      (!this.isNew() ? '/' + this.id : '') +
      '.json';

    return url;
  }
  , parse : function (response) {
    return (response[this.type]) ? response[this.type] : response;
  }
}); // }}}
// Basecamp Collection {{{1

var BasecampCollection = Backbone.Collection.extend({
  initialize : function(models, project) {
    if (typeof project !== 'undefined') {
      this.project = project;
    }
  }
  , url : function () {
    var project = this.getProject();

    return '/' + BASECAMP_ACCOUNT +
      '/api/' + BASECAMP_API_VERSION +
      (project ? '/projects/' + project : '') +
      '/' + this.model.prototype.types + '.json';
  }
  , getProject : function(attr) {
    var project = this.project;
    return project instanceof Backbone.Model ? project.get('id')
      : project > 1 ? project
      : null;
  }
}); // }}}
// Access the Basecamp REST service {{{1

var method_map = {
    'create' : 'POST'
  , 'update' : 'PUT'
  , 'delete' : 'DELETE'
  , 'read'   : 'GET'
};

Backbone.sync = function (method, model, options) {
  var type = method_map[method]
    , url = model.url();

  options || (options = {});

  if (model && ~['create', 'update'].indexOf(method)) {
    extend(options, {
        data : JSON.stringify(model.toJSON())
      , headers : { 'Content-Type' : 'application/json' }
    });
  }

  switch (type) {
    case 'POST':
      return basecamp.post(url, options)
        .on('complete', options.success)
        .on('error', options.error);
    case 'PUT':
      return basecamp.put(url, options)
        .on('complete', function(data) {
          if (!data.data) options.error(data);
          else options.success(data);
        })
        .on('error', function(err) {
          console.dir(err);
          options.error(err);
        });
    case 'DELETE':
      return basecamp.delete(url, options)
        .on('complete', options.success)
        .on('error', options.error);
    case 'GET':
      if (typeof options.data !== 'undefined') {
        url += '?' + qs.stringify(options.data);
      }
      return basecamp.get(url, options)
        .on('complete', function(data, resp) {
          options.success(data);
        })
        .on('error', function(err) {
          options.error(err);
        });
  }
}; // }}}
// Export the API {{{1
function toUnderscore(str) {
  return str[0] + str.substring(1).replace(/[A-Z]/g, '_' + '$&').toLowerCase();
}

function createExport(singular, plural) {
  plural || (plural = singular + 's');
  singular = toUnderscore(singular);
  plural = toUnderscore(plural);
  exports[singular] = BasecampModel.extend({
      type : singular.toLowerCase()
    , types : plural.toLowerCase()
  });
  exports[plural] = BasecampCollection.extend({
    model : exports[singular]
  });
}

createExport('Project');
createExport('Person', 'People');
createExport('Access', 'Accesses');
createExport('Event');
createExport('Topic');
createExport('Message');
createExport('Comment');
createExport('TodoList');
createExport('Todo');
createExport('Document');
createExport('Attachment');
createExport('Upload');
createExport('Calendar');
createExport('CalendarEvent');

var Basecamp = rest.service(function (options) {
  extend(this.defaults, options);
}, {
    baseURL : 'https://basecamp.com'
  , headers : {
      'Accept': '*/*'
    , 'User-Agent' : 'Genero (mail@oxy.fi)'
  }
}, {
});
exports.Basecamp = Basecamp;

exports.init = function (options) {
  BASECAMP_ACCOUNT = options.account;
  delete options.account;

  basecamp = new Basecamp(options);
}; // }}}
