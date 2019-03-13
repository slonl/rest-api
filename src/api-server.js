const express = require('express');
const request = require('request-promise-native');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 4000;
const apiBase = "/";

const backendUrl      = "http://localhost:3000";
const inhoudSchemaURL = "https://opendata.slo.nl/curriculum/schemas/inhoud.jsonld";
const doelSchemaURL   = "https://opendata.slo.nl/curriculum/schemas/doel.jsonld";
const baseIdURL       = "https://opendata.slo.nl/curriculum/uuid/";
const niveauURL       = "https://opendata.slo.nl/curriculum/api/v1/niveau/";


app.use(function(req, res, next) {
	if (req.accepts('html')) {
		res.set('Content-Type', 'text/html');
		res.sendFile(path.join(__dirname, '../www/', 'index.html'));
		return;
	}
	next();
});


var graphQueries = fs.readFileSync("graph/api.graph", "utf8");

function graphQuery(operationName, variables) {
	var postData = {
		query : graphQueries,
		operationName : operationName,
		variables : variables
	};

	return request({
		url : backendUrl,
		method : "POST",
		json : postData
	}).then(function(body) {
		if (body.errors) {
			throw new Error(body.errors);
		}
		return body;
	}).catch(function(error) {
		console.log(error)
	});
}

function jsonLD(entry, schema, type) {
	var result = {
		'@id': baseIdURL + entry.id,
		'@context': schema,
		'@type': type,
		'uuid': entry.id
	};
	delete entry.id;
	['Vak','Vakkern','Vaksubkern','Vakinhoud','Doelniveau', 'Doel', 'Niveau'].forEach(function(listName) {
		if (entry[listName]) {
			result[listName] = jsonLDList(entry[listName]);
			delete entry[listName];
		}
	});
	if (entry['NiveauIndex']) {
		result['Niveau'] = entry['NiveauIndex'].map(function(ni) {
			return {
				'@id': baseIdURL + ni.Niveau[0].id,
				'title': ni.Niveau[0].title,
				'$ref': niveauURL + ni.Niveau[0].id + '/' + type.toLowerCase() + '/' + result['uuid']
			}
		});
		delete entry['NiveauIndex'];
	}
	['replaces','replacedBy'].forEach(function(listName) {
		if (!entry[listName]) {
			return;
		}
		result[listName] = entry[listName].map(function(id) {
			return {
				'@id': baseIdURL + id,
				'uuid': id
			}
		});
		delete entry[listName];
	});
	Object.keys(entry).forEach(function(key) {
		result[key] = entry[key];
	});
	return result;
}

function jsonLDList(list, schema) {
	if (schema) {
		list['@context'] = schema;
	}
	list = list.map(function(link) {
		var result = {
			'@id': baseIdURL + link.id,
			'uuid': link.id
		};
		delete link.id;
		['Doel','Niveau'].forEach(function(listName) {
			if (link[listName]) {
				result[listName] = jsonLDList(link[listName]);
				delete link[listName];
			}
		});
		Object.keys(link).forEach(function(key) {
			result[key] = link[key];
		});
		return result;
	});
	return list;
}

app.route(apiBase + 'uuid/:id').get((req, res) => {
        graphQuery("Id", req.params)
	.then(function(result) {
		for (i in result.data) {
			if (result.data[i].length) {
				result = result.data[i][0];
				var entitytype = i.replace(/^all/, '');
				switch(entitytype) {
					case "Vak":
					case "Vakkern":
					case "Vaksubkern":
					case "Vakinhoud":
						var schema = inhoudSchemaURL;
					break;
					default:
						var schema = doelSchemaURL;
					break;
				}
				res.send(jsonLD(result, schema, entitytype));
				return;
			}
		}
        });
});

app.route(apiBase + 'deprecated/').get((req, res) => {
	graphQuery("Deprecated", null, function(result) {
		res.send(jsonLD(result.data.allDeprecated, inhoudSchemaURL, 'Deprecated'));
	});
});

app.route(apiBase + 'deprecated/:id').get((req, res) => {
	graphQuery("DeprecatedById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Deprecated, inhoudSchemaURL, 'Deprecated'));
	});
});

// FIXME: what does this do?
app.route(apiBase + 'deprecated/:id/vak/:id').get((req, res) => {
	graphQuery("DeprecatedById", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.Deprecated));
	});
});


app.route(apiBase + 'niveau').get((req, res) => {
	graphQuery("Niveau", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveau));
	});
});


app.route(apiBase + 'niveau/:id').get((req, res) => {
	graphQuery("NiveauById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Niveau, doelSchemaURL, 'Niveau'));
	});
});

app.route(apiBase + 'doel').get((req, res) => {
	graphQuery("Doel", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allDoel));
	});
});

app.route(apiBase + 'doel/:id').get((req, res) => {
	graphQuery("DoelById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Doel, doelSchemaURL, 'Doel'));
	});
});

app.route(apiBase + 'kerndoel').get((req, res) => {
	graphQuery("Kerndoel", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allKerndoel));
	});
});

app.route(apiBase + 'kerndoel/:id').get((req, res) => {
	graphQuery("KerndoelById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Kerndoel, doelSchemaURL, 'Kerndoel'));
	});
});

app.route(apiBase + 'vak').get((req, res) => {
	graphQuery("Vak", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allVak));
	});
});

app.route(apiBase + 'vak/:id').get((req, res) => {
	graphQuery("VakById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Vak, inhoudSchemaURL, 'Vak'));
	});
});

app.route(apiBase + 'vakkern').get((req, res) => {
	graphQuery("Vakkern", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allVakkern));
	});
});

app.route(apiBase + 'vakkern/:id').get((req, res) => {
	graphQuery("VakkernById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Vakkern, inhoudSchemaURL, 'Vakkern'));
	});
});

app.route(apiBase + 'vaksubkern').get((req, res) => {
	graphQuery("Vaksubkern", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allVaksubkern));
	});
});

app.route(apiBase + 'vaksubkern/:id').get((req, res) => {
	graphQuery("VaksubkernById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Vaksubkern, inhoudSchemaURL, 'Vaksubkern'));
	});
});

app.route(apiBase + 'vakinhoud').get((req, res) => {
	graphQuery("Vakinhoud", null)
	.then(function(result) {
		res.send(jsonLDList(result.data.allVakinhoud));
	});
});

app.route(apiBase + 'vakinhoud/:id').get((req, res) => {
	graphQuery("VakinhoudById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Vakinhoud, inhoudSchemaURL, 'Vakinhoud'));
	});
});
/* Queries op niveau */
app.route(apiBase + 'niveau/:niveau/doel').get((req, res) => {
	graphQuery("DoelOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveauIndex[0].Doel));
	});
});

app.route(apiBase + 'niveau/:niveau/doel/:id').get((req, res) => {
	graphQuery("DoelOpNiveauById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Doel, doelSchemaURL, 'Doel'));
	});
});

app.route(apiBase + 'niveau/:niveau/kerndoel').get((req, res) => {
	graphQuery("KerndoelOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.allNiveauIndex[0].Kerndoel, doelSchemaURL, 'Kerndoel'));
	});
});

app.route(apiBase + 'niveau/:niveau/kerndoel/:id').get((req, res) => {
	graphQuery("KerndoelOpNiveauById", req.params)
	.then(function(result) {
		res.send(jsonLD(result.data.Kerndoel, doelSchemaURL, 'Kerndoel'));
	});
});

app.route(apiBase + 'niveau/:niveau/vak').get((req, res) => {
	graphQuery("VakOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveauIndex[0].Vak));
	});
});

app.route(apiBase + 'niveau/:niveau/vak/:id').get((req, res) => {
	graphQuery("VakByIdOpNiveau", req.params)
	.then(function(result) {
		result.data.allNiveauIndex[0].Vak[0].Vakkern = result.data.allNiveauIndex[0].Vakkern;
		result.data.allNiveauIndex[0].Vak[0].Niveau = result.data.allNiveauIndex[0].Niveau;
		res.send(jsonLD(result.data.allNiveauIndex[0].Vak[0], inhoudSchemaURL, 'Vak'));
	});
});

app.route(apiBase + 'niveau/:niveau/vakkern').get((req, res) => {
	graphQuery("VakkernOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveauIndex[0].Vakkern));
	});
});

app.route(apiBase + 'niveau/:niveau/vakkern/:id').get((req, res) => {
	graphQuery("VakkernByIdOpNiveau", req.params)
	.then(function(result) {
		result.data.allNiveauIndex[0].Vakkern[0].Vaksubkern = result.data.allNiveauIndex[0].Vaksubkern;
		result.data.allNiveauIndex[0].Vakkern[0].Niveau = result.data.allNiveauIndex[0].Niveau;
		res.send(jsonLD(result.data.allNiveauIndex[0].Vakkern[0], inhoudSchemaURL, 'Vakkern'));
	});
});

app.route(apiBase + 'niveau/:niveau/vaksubkern').get((req, res) => {
	graphQuery("VaksubkernOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveauIndex[0].Vaksubkern));
	});
});

app.route(apiBase + 'niveau/:niveau/vaksubkern/:id').get((req, res) => {
	graphQuery("VaksubkernByIdOpNiveau", req.params)
	.then(function(result) {
		result.data.allNiveauIndex[0].Vaksubkern[0].Vakinhoud = result.data.allNiveauIndex[0].Vakinhoud;
		result.data.allNiveauIndex[0].Vaksubkern[0].Niveau = result.data.allNiveauIndex[0].Niveau;
		res.send(jsonLD(result.data.allNiveauIndex[0].Vaksubkern[0], inhoudSchemaURL, 'Vaksubkern'));
	});
});

app.route(apiBase + 'niveau/:niveau/vakinhoud').get((req, res) => {
	graphQuery("VakinhoudOpNiveau", req.params)
	.then(function(result) {
		res.send(jsonLDList(result.data.allNiveauIndex[0].Vakinhoud));
	});
});

app.route(apiBase + 'niveau/:niveau/vakinhoud/:id').get((req, res) => {
	graphQuery("VakinhoudByIdOpNiveau", req.params)
	.then(function(result) {
		result.data.allNiveauIndex[0].Vakinhoud[0].Niveau = result.data.allNiveauIndex[0].Niveau;
		res.send(jsonLD(result.data.allNiveauIndex[0].Vakinhoud[0], inhoudSchemaURL, 'Vakinhoud'));
	});
});

function getById(id) {
	return graphQuery("Id", {id: id}).then(function(result) {
		for (i in result.data) {
			if (result.data[i].length) {
				result = result.data[i][0];
				result["entitytype"] = i.replace(/^all/, '');
				return result;
			}
		}
		return null;
	});
}

function getAllVersions(ids, entities) {
	if (!entities) {
		entities = [];
	}
	return Promise.all(ids.map(function(id) {
		return getById(id);
	}))
	.then(function(results) {
		var replaced = [];
		var all = [];
		results.forEach(function(entity) {
			if (entity.replacedBy) {
				replaced = replaced.concat(entity.replacedBy);
			}
			all.push(entity);
		});
		if (replaced.length) {
			return getAllVersions(replaced, entities.concat(all));
		} else {
			return entities.concat(all);
		}
	});
}

function getLatestVersions(ids) {
	return getAllVersions(ids)
	.then(function(results) {
		return results.filter(function(entity) {
			return !entity.replacedBy;
		});
	});
}

function hasId(list, id) {
	for (var i=0; i<list.length; i++) {
		if (list[i].id == id) {
			return true;
		}
	}
	return false;
}

function walkReplacedBy(idIndex, ids) {
	var results = ids.map(function(id) {
		if (!idIndex[id]) {
			return null;
		}
		if (!idIndex[id].replacedBy) {
			return idIndex[id];
		}
		return walkReplacedBy(idIndex, idIndex[id].replacedBy);
	});
	return flatten(results).filter(x => x);
}

const flatten = function(arr, result = []) {
  for (let i = 0, length = arr.length; i < length; i++) {
    const value = arr[i];
    if (Array.isArray(value)) {
      flatten(value, result);
    } else {
      result.push(value);
    }
  }
  return result;
};

app.route(apiBase+"legacy/vak/:vak/").get((req, res) => {
	var vak = req.params.vak;
	getLatestVersions([vak])
	.then(function(results) {
		res.send(results);	
	});
});

app.route(apiBase+"legacy/vak/:vak/vakkern/:vakkern/").get((req, res) => {
	var vak = req.params.vak;
	var vakkern = req.params.vakkern;
	var idIndex = {};

	getAllVersions([vak,vakkern])
	.then(function(results) {
		results.forEach(function(entity) {
			idIndex[entity.id] = entity;
		});
		return idIndex;
	})		
	.then(function(idIndex) {
		var vakken = walkReplacedBy(idIndex, [vak]);
		var vakkernen = walkReplacedBy(idIndex, [vakkern]);
		vakkernen = vakkernen.filter(function(entry) {
			var matchingVakken = vakken.filter(function(vakEntry) {
				return hasId(vakEntry.Vakkern, entry.id);
			});
			return matchingVakken.length>0;
		});
		res.send(vakkernen);		
	});
});

app.route(apiBase+"legacy/vak/:vak/vakkern/:vakkern/vaksubkern/:vaksubkern").get((req, res) => {
	var vak = req.params.vak;
	var vakkern = req.params.vakkern;
	var vaksubkern = req.params.vaksubkern;
	var idIndex = {};

	getAllVersions([vak, vakkern, vaksubkern])
	.then(function(results) {
		results.forEach(function(entry) {
			idIndex[entry.id] = entry;
		});

		return idIndex;
	}).then(function(idIndex) {

		var vaksubkernen = walkReplacedBy(idIndex, [vaksubkern]);
		var vakkernen    = walkReplacedBy(idIndex, [vakkern]);
		var vakken       = walkReplacedBy(idIndex, [vak]);

		vakkernen = vakkernen.filter(function(entry) {
			var matchingVakken = vakken.filter(function(vakEntry) {
				return hasId(vakEntry.Vakkern, entry.id);
			});
			return matchingVakken.length>0;
		});
		
		vaksubkernen = vaksubkernen.filter(function(entry) {
			var matchingVakkernen = vakkernen.filter(function(vakkernEntry) {
				return hasId(vakkernEntry.Vaksubkern, entry.id);
			});
			return matchingVakkernen.length>0;
		});
		res.send(vaksubkernen);
	});

});

app.route(apiBase+"legacy/vak/:vak/vakkern/:vakkern/vaksubkern/:vaksubkern/vakinhoud/:vakinhoud").get((req, res) => {
	var vak = req.params.vak;
	var vakkern = req.params.vakkern;
	var vaksubkern = req.params.vaksubkern;
	var vakinhoud = req.params.vakinhoud;
	var idIndex = {};

	getAllVersions([vak, vakkern, vaksubkern, vakinhoud])
	.then(function(results) {
		results.forEach(function(entry) {
			idIndex[entry.id] = entry;
		});

		return idIndex;
	}).then(function(idIndex) {

		var vakinhouden  = walkReplacedBy(idIndex, [vakinhoud]);
		var vaksubkernen = walkReplacedBy(idIndex, [vaksubkern]);
		var vakkernen    = walkReplacedBy(idIndex, [vakkern]);
		var vakken       = walkReplacedBy(idIndex, [vak]);

		vakkernen = vakkernen.filter(function(entry) {
			var matchingVakken = vakken.filter(function(vakEntry) {
				return hasId(vakEntry.Vakkern, entry.id);
			});
			return matchingVakken.length>0;
		});
		
		vaksubkernen = vaksubkernen.filter(function(entry) {
			var matchingVakkernen = vakkernen.filter(function(vakkernEntry) {
				return hasId(vakkernEntry.Vaksubkern, entry.id);
			});
			return matchingVakkernen.length>0;
		});
		
		vakinhouden = vakinhouden.filter(function(entry) {
			var matchingVaksubkernen = vaksubkernen.filter(function(vaksubkernEntry) {
				return hasId(vaksubkernEntry.Vakinhoud, entry.id);
			});
			return matchingVaksubkernen.length>0;
		});
		
		res.send(vakinhouden);
	});

});

app.listen(port, () => console.log(`API server listening on port ${port}!`));