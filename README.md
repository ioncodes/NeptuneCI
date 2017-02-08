# NeptuneCI
Fast Continuous Integration Solution for GitHub

## Introduction
NeptuneCI is Continuous Integration solution such as AppVeyor or TravisCI, but it's Open Source and you can host it on your own linux machine.
It's fast and does only what it needs to do.

## Installation
1. ```git clone https://github.com/ioncodes/NeptuneCI.git```
2. ```cd NeptuneCI/setup```
3. ```sudo ./setup.sh```

These steps will install the dependencies and build tools.
While the installation it should ask you to create a new user for the mysql package. Remember user and password.
If the creation of the SQL Database & Tables fails, do this:
```
mysql -u USER -p [RETURN]
CREATE DATABASE neptune; [RETURN]
CREATE TABLE projects
(
    name VARCHAR(255),
    status INT(11)
); [RETURN]
```
After completion go to /settings/ and edit the sql.json file with the user & password from the SQL installation.
Find 'app.js' which is in the root folder of the clone.
Execute this command to start the server:
```nodejs app.js```
This will start the webhook server on port 7777 and the badge service on port 1010.

## Usage
In app.js replace MySecret and much-spam with your Secret and reponame. This will be the webhook target and it's HMAC secret for verification, which you will both need for the webhook creation on GitHub.
Create a new webhook, point it to <your-server>:7777/<webhook-path> and add the choosen secret as in the app.js.
To retrieve a badge you can point to the service running on port 1010.
Use it like this:
<your-server>:1010/badge?name=<your-path-name>
This will return a SVG with the build status which can be one of the following:
- success
- failed
- working
Add to your project a .neptune file.

## .neptune
The .neptune file is a JSON file which describes the build environment(s). A basic example could look like this:
```json
[{
	"env": "mono",
	"sln": "cs/HelloWorld/Hello World.sln"
}]
```

A more advanced example would be this, taken from my [much-spam](https://github.com/ioncodes/much-spam) repo:
```json
[{
	"env": "qt",
	"pro": "qt/QCheck/QCheck.pro"
}, {
	"env": "mono",
	"sln": "cs/HelloWorld/Hello World.sln"
}, {
	"env": "custom",
	"commands": [{
		"command": "xbuild",
		"arguments": [{
			"type":"path",
			"arg":"cs/HelloWorld/Hello World.sln"
		}]
	}]
}]
```

## Environments
Currently it has these environments built in:
- Mono
- Qt
As an alternative you can always use the 'custom' environment, which allowes you to execute your own commands and arguments.

### Mono
Mono is a .NET architecture. The environment specification is:
```json
[{
	"env": "mono",
	"sln": "cs/HelloWorld/Hello World.sln"
}]
```
The target is always the pro, eg the solution file.

### Qt
Qt has to do with C++, specification:
```json
[{
	"env": "qt",
	"pro": "qt/QCheck/QCheck.pro"
}]
```
The target is always the pro file, eg the solution file.

### Custom
Custom is an undefined environment, you can script it yourself. Specification:
```json
[{"env": "custom",
	"commands": [{
		"command": "xbuild",
		"arguments": [{
			"type":"path",
			"arg":"cs/HelloWorld/Hello World.sln"
		}]
	}]
}]
```
commands is an array of commands which needs to be executed in a synchronous order. The command element is the actual element and arguments is an array which holds the arguments.
Arguments has also 2 types. The first one is 'type' which can be anything or 'path'. If it's path, the actual path will be added in front of the path, so the CI will be able to find the correct file specified.
Arg is the argument itself.

## Features/Pros
- Mono
- Qt
- Custom scripts
- Badges

## Issues/Cons
- Only 1 webhook allowed currently
- No webpanel
- Kinda new/buggy
