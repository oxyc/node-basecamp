var rest = require('restler')
  , Backbone = require('backbone')
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
  , project : false

  , initialize : function() {
    var project = this.get('project');
    if (typeof project !== 'undefined') {
      this.project = project;
    }
  }

  , getProject : function(attr) {
    return this.project instanceof Backbone.Model ? this.project.get('id')
      : this.project > 1 ? this.project
      : false;
  }

  , url : function () {
    return '/' +
      BASECAMP_ACCOUNT + '/' +
      'api/' + BASECAMP_API_VERSION + '/' +
      (this.getProject() ? 'projects/' + this.getProject() + '/' : '') +
      this.types + '/' +
      this.id + '.json';
  }
  , toJSON : function () {
    var data = Backbone.Model.prototype.toJSON.apply(this)
      , result = {};

    result[this.type] = data;
    return result;
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

    return '/' +
      BASECAMP_ACCOUNT + '/' +
      'api/' + BASECAMP_API_VERSION + '/' +
      (project ? 'projects/' + project + '/' : '') +
      this.model.prototype.types + '.json';
  }
  , getProject : BasecampModel.prototype.getProject
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
          options.error(err);
        });
    case 'DELETE':
      return basecamp.delete(url, options)
        .on('complete', options.success)
        .on('error', options.error);
    case 'GET':
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

function createExport(singular, plural) {
  plural || (plural = singular + 's');
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
