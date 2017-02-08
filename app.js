var http = require('http');
var createHandler = require('github-webhook-handler');
var handler = createHandler({ path: '/much-spam', secret: 'MySecret' });
var clone = require('git-clone');
var fs = require('fs-extra');
var express = require('express');
var app = express();
var mysql      = require('mysql');
var sqlSettings = fs.readJsonSync(__dirname + '/settings/sql.json', {throws: true});
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : sqlSettings.user,
    password : sqlSettings.password,
    database : 'neptune'
});

connection.connect();

app.get('/', function (req, res) {
    res.send('Nothing here');
});

app.get('/badge', function (req, res) {
    if(req.query.name == undefined) {
        res.send('no project specified');
    } else {
        connection.query("SELECT status FROM projects WHERE name='" + req.query.name + "';", function (error, result) {
            if (error) throw error;
            if(result[0] == undefined) {
                res.send('cant find project');
            } else {
                console.log(result);
                if (result[0].status == 0) {
                    res.sendFile(__dirname + '/data/failed.svg');
                } else if (result[0].status == 1) {
                    res.sendFile(__dirname + '/data/success.svg');
                } else {
                    res.sendFile(__dirname + '/data/working.svg');
                }
            }
        });
    }
});

app.listen(1010, function () {
    console.log('Badge system running on 1010!');
});

http.createServer(function (req, res) {
    handler(req, res, function (err) {
        res.statusCode = 404;
        res.end('no such wow, uhu.. I mean location...');
    })
}).listen(7777);

handler.on('push', function (event) {
    console.log('Received a push event.');
    var cloneUrl = event.payload.repository.clone_url;
    var repoName = event.payload.repository.name;
    fs.access(__dirname + '/repos/' + repoName, fs.F_OK, function(err) {
        if(!err) {
            fs.remove(__dirname + '/repos/' + repoName, function (err) {
                if(err) throw err;
                console.log('removed repo');
                cloneRepo(cloneUrl, repoName);
            });
        } else {
            console.log('repo does not exist!');
            cloneRepo(cloneUrl, repoName);
        }
    });
});

function cloneRepo(cloneUrl, repoName) {
    clone(cloneUrl, __dirname + '/repos/' + repoName, function (cb) {
        console.log('cloned');
        console.log(__dirname + '/repos/' + repoName + '/.neptune');
        var config = fs.readJsonSync(__dirname + '/repos/' + repoName + '/.neptune', {throws: false});
        console.log(config);
        setProjectStatus(repoName,2, false);
        setTimeout(function() {doMagic(config, repoName, function (success) {
            if(success) {
                setProjectStatus(repoName,1, true);
            } else {
                setProjectStatus(repoName,0, true);
            }
        })}, 1000);
    });
}

function doMagic(config, repoName, callback) {
    var failedOnce = false;

    for(var i = 0; i < config.length; i++) {
        var env = config[i].env;
        if (env === 'mono') {
            console.log('loading mono environment');
            var sln = __dirname + '/repos/' + repoName + '/' + config[i].sln;
            compileMono(sln, function (result) {
                if (result) {
                    console.log('success');
                } else {
                    console.log('compiler error');
                    failedOnce = true;
                }
            });
        } else if (env === 'qt') {
            console.log('loading qt environment');
            var pro = __dirname + '/repos/' + repoName + '/' + config[i].pro;
            compileQt(pro, function (result) {
                if (result) {
                    console.log('success');
                } else {
                    console.log('compiler error');
                    failedOnce = true;
                }
            });
        } else if (env === 'custom') {
            console.log('loading custom environment');
            var commands = config[i].commands;
            console.log(commands);
            compileCustom(commands, repoName, function (result) {
                if (result) {
                    console.log('success');
                } else {
                    console.log('compiler error');
                    failedOnce = true;
                }
            });
        } else {
            console.log('unknown environment');
        }
        if(i == config.length-1) {
            console.log('sending result... ' + !failedOnce.toString());
            callback(!failedOnce);
        }
    }
}

function compileMono(sln, callback) {
    try {
        require('child_process').execFileSync('xbuild', [sln], {stdio: [0, 1, 2]});
        callback(true);
    } catch(ex) {
        console.log(ex);
        callback(false);
    } finally {
        console.log('Mono Finished.');
    }
}

function compileQt(pro, callback) {
    try {
        require('child_process').execFileSync('qmake', [pro], {cwd: require('path').dirname(pro), stdio: [0, 1, 2]});
        require('child_process').execFileSync('make', [], {cwd: require('path').dirname(pro), stdio: [0, 1, 2]});
        callback(true);
    } catch(ex) {
        console.log(ex);
        callback(false);
    } finally {
        console.log('QT Finished.');
    }
}

function compileCustom(cmd, repoName, callback) {
    console.log(cmd.length);
    try {
        for (var i = 0; i < cmd.length; i++) {
            var command = cmd[i].command;
            var arguments = cmd[i].arguments;
            var args = [];
            for (var j = 0; j < arguments.length; j++) {
                console.log('type:' + arguments[j]);
                if (arguments[j].type == 'path') {
                    console.log('found path type');
                    console.log(arguments[j].arg);
                    arguments[j].arg = __dirname + '/repos/' + repoName + '/' + arguments[j].arg;
                    console.log(arguments[j].arg);
                    console.log(__dirname);
                }
                args.push(arguments[j].arg);
            }
            console.log(command);
            console.log(arguments);
            require('child_process').execFileSync(command, args, {stdio: [0, 1, 2]});
            if (i === cmd.length - 1) {
                console.log('CUSTOM DONE');
                callback(true);
            }
        }
    } catch(ex) {
        console.log(ex);
        callback(false);
    } finally {
        console.log('Custom Finished.');
    }
}

function setProjectStatus(name, status, fix) {
    connection.query("DELETE FROM projects WHERE name='" + name + "';", function (error, results, fields) {
        if (error) throw error;
        connection.query("INSERT INTO projects (name,status) VALUES ('"+name+"','"+status+"');", function (error) {
            if (error) throw error;
            console.log('sql status '+status+' set');
            if(fix) {
                fixProjectStatus(name);
            }
        });
    });
}

function fixProjectStatus(name) {
    connection.query("DELETE FROM projects WHERE name='" + name + "' AND status='2';", function (error) {
        if (error) throw error;
        console.log('fix initiated.');
    });
}